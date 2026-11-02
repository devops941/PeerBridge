import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { Answer } from '../../models/Answer';
import { Doubt } from '../../models/Doubt';
import { authenticateToken, AuthRequest } from '../../middleware/auth.middleware';
import { emitCommentAdded } from '../../socket';

const router = Router();

/**
 * GET /api/v1/answers/doubt/:doubtId
 * Retrieve all answers and discussions for a doubt
 */
router.get('/doubt/:doubtId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { doubtId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(doubtId)) {
      res.status(400).json({ success: false, message: 'Invalid doubt ID format.' });
      return;
    }

    const answers = await Answer.find({ doubtId })
      .sort({ isAccepted: -1, helpfulCount: -1, createdAt: 1 })
      .populate('author', 'name avatar college department headline rating')
      .lean();

    res.json({
      success: true,
      count: answers.length,
      data: answers
    });
  } catch (err: any) {
    console.error('[Get Answers Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve answers.' });
  }
});

/**
 * POST /api/v1/answers/doubt/:doubtId
 * Post an explanation/answer to a doubt (Protected)
 */
router.post('/doubt/:doubtId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { doubtId } = req.params;
    const { content, codeSnippet, codeLanguage } = req.body;

    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Authentication required to post an answer.' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(doubtId)) {
      res.status(400).json({ success: false, message: 'Invalid doubt ID format.' });
      return;
    }

    if (!content || typeof content !== 'string' || content.trim().length < 5) {
      res.status(400).json({ success: false, message: 'Explanation must be at least 5 characters long.' });
      return;
    }

    const doubt = await Doubt.findById(doubtId);
    if (!doubt) {
      res.status(404).json({ success: false, message: 'Doubt not found or removed.' });
      return;
    }

    if (doubt.status === 'CLOSED') {
      res.status(400).json({ success: false, message: 'This doubt discussion is closed.' });
      return;
    }

    const answer = await Answer.create({
      doubtId: doubt._id,
      author: req.user.id,
      content: content.trim(),
      codeSnippet: codeSnippet ? String(codeSnippet).trim() : '',
      codeLanguage: codeLanguage ? String(codeLanguage).trim().toLowerCase() : 'text',
      isAccepted: false,
      helpfulCount: 0,
      helpfulVotes: []
    });

    // Increment answer count on Doubt
    await Doubt.updateOne({ _id: doubtId }, { $inc: { answerCount: 1 } });
    const updatedDoubt = await Doubt.findById(doubtId, 'answerCount');

    const populated = await Answer.findById(answer._id).populate(
      'author',
      'name avatar college department headline rating'
    );

    if (populated) {
      emitCommentAdded({
        doubtId: String(doubtId),
        answer: populated,
        answerCount: updatedDoubt?.answerCount || (doubt.answerCount + 1)
      });
    }

    res.status(201).json({
      success: true,
      message: 'Your explanation has been posted to the discussion!',
      data: populated
    });
  } catch (err: any) {
    console.error('[Post Answer Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to post answer.' });
  }
});

/**
 * PATCH /api/v1/answers/:id/accept
 * Doubt author marks an answer as the official accepted solution
 */
router.patch('/:id/accept', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid answer ID.' });
      return;
    }

    const answer = await Answer.findById(id);
    if (!answer) {
      res.status(404).json({ success: false, message: 'Answer not found.' });
      return;
    }

    const doubt = await Doubt.findById(answer.doubtId);
    if (!doubt) {
      res.status(404).json({ success: false, message: 'Parent doubt not found.' });
      return;
    }

    // Strict Guard: Only the doubt owner can accept a solution
    if (String(doubt.author) !== String(req.user.id)) {
      res.status(403).json({ success: false, message: 'Only the author of this doubt can accept a solution.' });
      return;
    }

    // Clear previous accepted answer on this doubt if any
    await Answer.updateMany(
      { doubtId: doubt._id, isAccepted: true },
      { $set: { isAccepted: false } }
    );

    // Accept this answer
    answer.isAccepted = true;
    await answer.save();

    // Mark doubt as RESOLVED
    doubt.acceptedAnswerId = answer._id as mongoose.Types.ObjectId;
    doubt.status = 'RESOLVED';
    doubt.resolvedAt = new Date();
    await doubt.save();

    const populated = await Answer.findById(id).populate(
      'author',
      'name avatar college department headline rating'
    );

    res.json({
      success: true,
      message: 'Accepted as the official solution! Doubt marked as resolved.',
      data: populated
    });
  } catch (err: any) {
    console.error('[Accept Answer Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to accept solution.' });
  }
});

/**
 * POST /api/v1/answers/:id/helpful
 * Toggle helpful upvote on an explanation
 */
router.post('/:id/helpful', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Please sign in to vote.' });
      return;
    }

    const answer = await Answer.findById(id);
    if (!answer) {
      res.status(404).json({ success: false, message: 'Answer not found.' });
      return;
    }

    const userObjId = new mongoose.Types.ObjectId(req.user.id);
    const existingIndex = answer.helpfulVotes.findIndex((v) => String(v) === String(req.user?.id));

    let isHelpful = false;
    if (existingIndex > -1) {
      // Remove vote
      answer.helpfulVotes.splice(existingIndex, 1);
      answer.helpfulCount = Math.max(0, answer.helpfulCount - 1);
      isHelpful = false;
    } else {
      // Add vote
      answer.helpfulVotes.push(userObjId);
      answer.helpfulCount += 1;
      isHelpful = true;
    }

    await answer.save();

    res.json({
      success: true,
      isHelpful,
      helpfulCount: answer.helpfulCount
    });
  } catch (err: any) {
    console.error('[Helpful Vote Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to update helpful vote.' });
  }
});

/**
 * DELETE /api/v1/answers/:id
 * Author deletes their own answer
 */
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const answer = await Answer.findById(id);
    if (!answer) {
      res.status(404).json({ success: false, message: 'Answer not found.' });
      return;
    }

    if (String(answer.author) !== String(req.user.id)) {
      res.status(403).json({ success: false, message: 'You can only delete your own explanation.' });
      return;
    }

    await Answer.deleteOne({ _id: id });
    await Doubt.updateOne({ _id: answer.doubtId }, { $inc: { answerCount: -1 } });

    res.json({
      success: true,
      message: 'Explanation deleted successfully.'
    });
  } catch (err: any) {
    console.error('[Delete Answer Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to delete answer.' });
  }
});

export default router;
