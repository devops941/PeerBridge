import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Doubt } from '../../models/Doubt';
import { Subject } from '../../models/Subject';
import { authenticateToken, AuthRequest } from '../../middleware/auth.middleware';
import { emitNewDoubt, emitDoubtUpvoted, emitDoubtResolved, emitDoubtDeleted } from '../../socket';

const router = Router();

/**
 * POST /api/v1/doubts
 * Publish a new academic doubt (Protected)
 */
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Authentication required to post a doubt.' });
      return;
    }

    const {
      title,
      subject,
      topic,
      question,
      codeSnippet,
      codeLanguage,
      attachments,
      videoUrl,
      videoDuration,
      videoThumbnail,
      tags
    } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length < 5) {
      res.status(400).json({ success: false, message: 'Doubt title must be at least 5 characters long.' });
      return;
    }

    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      res.status(400).json({ success: false, message: 'Subject category is required.' });
      return;
    }

    if (!question || typeof question !== 'string' || question.trim().length < 10) {
      res.status(400).json({ success: false, message: 'Please provide detailed question explanation (min 10 characters).' });
      return;
    }

    const cleanTags = Array.isArray(tags)
      ? tags.map((t: string) => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 5)
      : [];

    const newDoubt = await Doubt.create({
      title: title.trim(),
      subject: subject.trim(),
      topic: topic ? String(topic).trim() : '',
      question: question.trim(),
      codeSnippet: codeSnippet ? String(codeSnippet).trim() : '',
      codeLanguage: codeLanguage ? String(codeLanguage).trim().toLowerCase() : 'text',
      attachments: Array.isArray(attachments) ? attachments : [],
      videoUrl: videoUrl ? String(videoUrl).trim() : '',
      videoDuration: videoDuration ? Number(videoDuration) : 0,
      videoThumbnail: videoThumbnail ? String(videoThumbnail).trim() : '',
      tags: cleanTags,
      author: req.user.id,
      status: 'OPEN'
    });

    // Increment subject doubt count asynchronously
    Subject.updateOne({ name: subject.trim() }, { $inc: { doubtCount: 1 } }).catch(() => {});

    const populatedDoubt = await Doubt.findById(newDoubt._id).populate(
      'author',
      'name avatar college department headline rating'
    );

    // Broadcast new doubt to all active clients in real-time
    if (populatedDoubt) {
      emitNewDoubt(populatedDoubt);
    }

    res.status(201).json({
      success: true,
      message: 'Your academic doubt has been posted to the PeerBridge community!',
      data: populatedDoubt
    });
  } catch (err: any) {
    console.error('[Create Doubt Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to post doubt. Please try again.' });
  }
});

/**
 * GET /api/v1/doubts
 * Community Feed with server-side pagination, search & filters
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 15));
    const skip = (page - 1) * limit;

    const { subject, status, search, tag, sort, authorId } = req.query;

    const filter: Record<string, any> = {};

    if (authorId && typeof authorId === 'string' && authorId.trim()) {
      filter.author = authorId.trim();
    }

    if (subject && subject !== 'All') {
      filter.subject = subject;
    }

    if (status && ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(String(status).toUpperCase())) {
      filter.status = String(status).toUpperCase();
    }

    if (tag && typeof tag === 'string') {
      filter.tags = tag.toLowerCase().trim();
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { question: { $regex: q, $options: 'i' } },
        { topic: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } }
      ];
    }

    // Support random feed discovery order
    if (sort === 'random') {
      const total = await Doubt.countDocuments(filter);
      const excludeIdsRaw = req.query.excludeIds as string;
      const excludeIds: mongoose.Types.ObjectId[] = [];
      if (excludeIdsRaw && typeof excludeIdsRaw === 'string') {
        excludeIdsRaw.split(',').forEach((idStr) => {
          const cleanId = idStr.trim();
          if (mongoose.Types.ObjectId.isValid(cleanId)) {
            excludeIds.push(new mongoose.Types.ObjectId(cleanId));
          }
        });
      }

      const matchFilter: any = { ...filter };
      if (excludeIds.length > 0) {
        matchFilter._id = { $nin: excludeIds };
      }

      const remainingCount = await Doubt.countDocuments(matchFilter);
      let doubts: any[] = [];

      if (remainingCount > 0) {
        const sampleSize = Math.min(limit, remainingCount);
        const pipeline: any[] = [];
        if (Object.keys(matchFilter).length > 0) {
          pipeline.push({ $match: matchFilter });
        }
        pipeline.push({ $sample: { size: sampleSize } });

        doubts = await Doubt.aggregate(pipeline);
        await Doubt.populate(doubts, {
          path: 'author',
          select: 'name avatar college department headline rating'
        });
      }

      res.json({
        success: true,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        },
        data: doubts
      });
      return;
    }

    let sortOptions: Record<string, any> = { createdAt: -1 }; // default newest
    if (sort === 'unanswered') {
      filter.answerCount = 0;
      filter.status = 'OPEN';
      sortOptions = { createdAt: -1 };
    } else if (sort === 'popular') {
      sortOptions = { volunteerCount: -1, answerCount: -1, viewsCount: -1 };
    }

    const [total, doubts] = await Promise.all([
      Doubt.countDocuments(filter),
      Doubt.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate('author', 'name avatar college department headline rating')
        .lean()
    ]);

    res.json({
      success: true,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      data: doubts
    });
  } catch (err: any) {
    console.error('[Feed Doubts Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve doubts feed.' });
  }
});

/**
 * GET /api/v1/doubts/my
 * User's own doubts (Protected)
 */
router.get('/my', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const doubts = await Doubt.find({ author: req.user.id })
      .sort({ createdAt: -1 })
      .populate('author', 'name avatar college department')
      .lean();

    res.json({
      success: true,
      count: doubts.length,
      data: doubts
    });
  } catch (err: any) {
    console.error('[My Doubts Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to load user doubts.' });
  }
});

/**
 * GET /api/v1/doubts/:id
 * Single doubt details with author info
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid doubt identifier format.' });
      return;
    }

    const doubt = await Doubt.findById(id).populate(
      'author',
      'name avatar college department headline bio rating reviewCount'
    );

    if (!doubt) {
      res.status(404).json({ success: false, message: 'Academic doubt not found or removed.' });
      return;
    }

    // Increment view count quietly
    Doubt.updateOne({ _id: id }, { $inc: { viewsCount: 1 } }).catch(() => {});

    res.json({
      success: true,
      data: doubt
    });
  } catch (err: any) {
    console.error('[Doubt Detail Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch doubt details.' });
  }
});

/**
 * PUT /api/v1/doubts/:id
 * Update doubt details (Author only)
 */
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const doubt = await Doubt.findById(id);
    if (!doubt) {
      res.status(404).json({ success: false, message: 'Doubt not found.' });
      return;
    }

    if (String(doubt.author) !== String(req.user.id)) {
      res.status(403).json({ success: false, message: 'Only the author can edit this doubt.' });
      return;
    }

    const { title, subject, topic, question, codeSnippet, codeLanguage, tags } = req.body;

    if (title) doubt.title = title.trim();
    if (subject) doubt.subject = subject.trim();
    if (topic !== undefined) doubt.topic = topic.trim();
    if (question) doubt.question = question.trim();
    if (codeSnippet !== undefined) doubt.codeSnippet = codeSnippet.trim();
    if (codeLanguage) doubt.codeLanguage = codeLanguage.trim().toLowerCase();
    if (Array.isArray(tags)) doubt.tags = tags.map((t: string) => String(t).trim().toLowerCase());

    await doubt.save();

    const updated = await Doubt.findById(id).populate(
      'author',
      'name avatar college department headline'
    );

    res.json({
      success: true,
      message: 'Doubt updated successfully.',
      data: updated
    });
  } catch (err: any) {
    console.error('[Update Doubt Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to update doubt.' });
  }
});

/**
 * PATCH /api/v1/doubts/:id/resolve
 * Mark a doubt as resolved (Author only)
 */
router.patch('/:id/resolve', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const doubt = await Doubt.findById(id);
    if (!doubt) {
      res.status(404).json({ success: false, message: 'Doubt not found.' });
      return;
    }

    if (String(doubt.author) !== String(req.user.id)) {
      res.status(403).json({ success: false, message: 'Only the author can resolve this doubt.' });
      return;
    }

    doubt.status = 'RESOLVED';
    doubt.resolvedAt = new Date();
    await doubt.save();

    emitDoubtResolved(id);

    res.json({
      success: true,
      message: 'Doubt marked as resolved! Great job learning together.',
      data: doubt
    });
  } catch (err: any) {
    console.error('[Resolve Doubt Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to resolve doubt.' });
  }
});

/**
 * DELETE /api/v1/doubts/:id
 * Delete doubt (Author only)
 */
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const doubt = await Doubt.findById(id);
    if (!doubt) {
      res.status(404).json({ success: false, message: 'Doubt not found.' });
      return;
    }

    if (String(doubt.author) !== String(req.user.id)) {
      res.status(403).json({ success: false, message: 'Unauthorized to delete this doubt.' });
      return;
    }

    await Doubt.deleteOne({ _id: id });

    emitDoubtDeleted(id);

    res.json({
      success: true,
      message: 'Doubt deleted successfully.'
    });
  } catch (err: any) {
    console.error('[Delete Doubt Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to delete doubt.' });
  }
});

/**
 * POST /api/v1/doubts/:id/upvote
 * Toggle helpful/like vote on a doubt post (Protected)
 */
router.post('/:id/upvote', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required to like a doubt.' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid doubt ID format.' });
      return;
    }

    const doubt = await Doubt.findById(id);
    if (!doubt) {
      res.status(404).json({ success: false, message: 'Doubt not found.' });
      return;
    }

    const upvotes = (doubt as any).upvotes || [];
    const index = upvotes.findIndex((u: any) => String(u) === String(userId));
    let isLiked = false;

    if (index > -1) {
      upvotes.splice(index, 1);
      isLiked = false;
    } else {
      upvotes.push(new mongoose.Types.ObjectId(userId));
      isLiked = true;
    }

    doubt.upvotes = upvotes;
    doubt.upvoteCount = upvotes.length;
    await doubt.save();

    // Broadcast live like count to all clients
    emitDoubtUpvoted({
      doubtId: id,
      isLiked,
      upvoteCount: upvotes.length,
      userId
    });

    res.json({
      success: true,
      isLiked,
      upvoteCount: upvotes.length,
      message: isLiked ? 'Post upvoted!' : 'Vote removed.'
    });
  } catch (err: any) {
    console.error('[Upvote Doubt Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to update vote.' });
  }
});

export default router;
