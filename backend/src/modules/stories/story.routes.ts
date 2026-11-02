import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { authenticateToken, AuthRequest } from '../../middleware/auth.middleware';
import { Story } from '../../models/Story';
import { Follow } from '../../models/Follow';
import { User } from '../../models/User';
import { Notification } from '../../models/Notification';
import { Message } from '../../models/Message';
import { uploadToCloudinary } from '../../config/cloudinary';
import {
  emitStoryNew,
  emitStoryLiked,
  emitStoryComment,
  emitStoryDeleted,
  emitNotification
} from '../../socket';

const router = Router();

/**
 * POST /api/v1/stories
 * Create a new academic/peer story (valid for 24 hours)
 */
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    let { mediaUrl, caption, background, mediaType } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!mediaUrl && !background && !caption) {
      res.status(400).json({ success: false, message: 'Media image, background, or caption is required.' });
      return;
    }

    // If mediaUrl is base64 image data, upload to Cloudinary
    if (mediaUrl && mediaUrl.startsWith('data:image')) {
      try {
        const uploadRes = await uploadToCloudinary(mediaUrl, 'peerbridge/stories');
        mediaUrl = uploadRes.url;
      } catch (err: any) {
        console.error('[Story Upload to Cloudinary Error]:', err);
        // Fallback: continue if upload fails or format issue
      }
    }

    // Default mediaUrl if text-only story
    if (!mediaUrl) {
      mediaUrl = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80';
    }

    const newStory = await Story.create({
      user: userId,
      mediaUrl,
      mediaType: mediaType || (mediaUrl.startsWith('data:image') || mediaUrl.startsWith('http') ? 'image' : 'text'),
      caption: caption || '',
      background: background || '',
      likes: [],
      comments: [],
      views: [userId], // Author automatically views own story
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    const populatedStory = await Story.findById(newStory._id)
      .populate('user', 'name avatar department college')
      .lean();

    emitStoryNew(populatedStory);

    res.status(201).json({
      success: true,
      message: 'Story shared successfully! Visible for 24 hours to your followers.',
      data: populatedStory
    });
  } catch (error: any) {
    console.error('[Create Story Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create story'
    });
  }
});

/**
 * GET /api/v1/stories/feed
 * Fetch 24-hour active stories ONLY from followed users and current user ("folow pannura vagalukumatum store show panum")
 */
router.get('/feed', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // 1. Get list of user IDs that the current user follows
    const follows = await Follow.find({ follower: userId }).select('following');
    const followingIds = follows.map((f) => f.following);

    // 2. Allowed user IDs = current user + everyone they follow
    const allowedUserIds = [new mongoose.Types.ObjectId(userId), ...followingIds];

    // 3. Find active, non-expired stories
    const now = new Date();
    const activeStories = await Story.find({
      user: { $in: allowedUserIds },
      expiresAt: { $gt: now }
    })
      .populate('user', 'name avatar department college')
      .populate('comments.user', 'name avatar')
      .sort({ createdAt: 1 })
      .lean();

    // 4. Group stories by user (Instagram style)
    const groupedMap = new Map<string, any>();

    for (const story of activeStories) {
      const storyAuthor: any = story.user;
      if (!storyAuthor || !storyAuthor._id) continue;

      const authorIdStr = String(storyAuthor._id);
      const isMine = authorIdStr === String(userId);
      const isViewed = Array.isArray(story.views) && story.views.some((v: any) => String(v) === String(userId));
      const isLiked = Array.isArray(story.likes) && story.likes.some((l: any) => String(l) === String(userId));

      const storyItem = {
        ...story,
        isLiked,
        likesCount: story.likes?.length || 0,
        commentsCount: story.comments?.length || 0,
        isViewed
      };

      if (!groupedMap.has(authorIdStr)) {
        groupedMap.set(authorIdStr, {
          user: storyAuthor,
          isMine,
          hasUnseen: !isViewed,
          latestCreatedAt: story.createdAt,
          stories: [storyItem]
        });
      } else {
        const group = groupedMap.get(authorIdStr);
        group.stories.push(storyItem);
        if (!isViewed) {
          group.hasUnseen = true;
        }
        if (new Date(story.createdAt) > new Date(group.latestCreatedAt)) {
          group.latestCreatedAt = story.createdAt;
        }
      }
    }

    // Convert map to array, placing user's own story first, then unseen stories, then seen
    const groupsArray = Array.from(groupedMap.values());
    groupsArray.sort((a, b) => {
      if (a.isMine) return -1;
      if (b.isMine) return 1;
      if (a.hasUnseen && !b.hasUnseen) return -1;
      if (!a.hasUnseen && b.hasUnseen) return 1;
      return new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime();
    });

    res.json({
      success: true,
      data: groupsArray
    });
  } catch (error: any) {
    console.error('[Story Feed Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch stories feed'
    });
  }
});

/**
 * POST /api/v1/stories/:id/like
 * Toggle like on a story with real-time socket & in-app notification
 */
router.post('/:id/like', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const storyId = req.params.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const story = await Story.findById(storyId);
    if (!story) {
      res.status(404).json({ success: false, message: 'Story not found or expired' });
      return;
    }

    const currentUserIdObj = new mongoose.Types.ObjectId(userId);
    const existingIndex = story.likes.findIndex((l) => String(l) === String(userId));
    const isLiked = existingIndex === -1;

    if (isLiked) {
      story.likes.push(currentUserIdObj);

      // Create notification if liking peer's story
      if (String(story.user) !== String(userId)) {
        const sender = await User.findById(userId).select('name avatar');
        const notif = await Notification.create({
          recipient: story.user,
          sender: userId,
          type: 'STORY_LIKE',
          title: '❤️ Story Liked',
          message: `${sender?.name || 'A peer'} liked your academic story!`,
          data: { storyId: story._id }
        });
        const populatedNotif = await Notification.findById(notif._id).populate('sender', 'name avatar');
        emitNotification(String(story.user), populatedNotif);
      }
    } else {
      story.likes.splice(existingIndex, 1);
    }

    await story.save();

    emitStoryLiked({
      storyId: String(story._id),
      userId: String(userId),
      isLiked,
      likesCount: story.likes.length
    });

    res.json({
      success: true,
      isLiked,
      likesCount: story.likes.length
    });
  } catch (error: any) {
    console.error('[Story Like Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to toggle story like'
    });
  }
});

/**
 * POST /api/v1/stories/:id/comment
 * Add comment/reply to story with real-time chat direct reply
 */
router.post('/:id/comment', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const storyId = req.params.id;
    const { text } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!text || !text.trim()) {
      res.status(400).json({ success: false, message: 'Comment text is required.' });
      return;
    }

    const story = await Story.findById(storyId);
    if (!story) {
      res.status(404).json({ success: false, message: 'Story not found or expired' });
      return;
    }

    const newComment = {
      user: new mongoose.Types.ObjectId(userId),
      text: text.trim(),
      createdAt: new Date()
    };

    story.comments.push(newComment as any);
    await story.save();

    const sender = await User.findById(userId).select('name avatar department college');

    // Also send as direct message so author receives it in their DMs (Instagram style)
    if (String(story.user) !== String(userId)) {
      try {
        await Message.create({
          senderId: userId,
          receiverId: story.user,
          content: `💬 Replied to your story: "${text.trim()}"`
        });
      } catch (dmErr) {
        console.warn('Could not mirror story reply to DM:', dmErr);
      }

      // Send notification
      const notif = await Notification.create({
        recipient: story.user,
        sender: userId,
        type: 'STORY_REPLY',
        title: '💬 Story Reply',
        message: `${sender?.name || 'A peer'} replied to your story: "${text.trim()}"`,
        data: { storyId: story._id }
      });
      const populatedNotif = await Notification.findById(notif._id).populate('sender', 'name avatar');
      emitNotification(String(story.user), populatedNotif);
    }

    const populatedComment = {
      ...newComment,
      user: sender
    };

    emitStoryComment({
      storyId: String(story._id),
      comment: populatedComment,
      commentsCount: story.comments.length
    });

    res.status(201).json({
      success: true,
      message: 'Comment posted successfully',
      data: populatedComment,
      commentsCount: story.comments.length
    });
  } catch (error: any) {
    console.error('[Story Comment Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to comment on story'
    });
  }
});

/**
 * POST /api/v1/stories/:id/view
 * Mark story as viewed by current user
 */
router.post('/:id/view', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const storyId = req.params.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    await Story.findByIdAndUpdate(storyId, {
      $addToSet: { views: new mongoose.Types.ObjectId(userId) }
    });

    res.json({ success: true, message: 'Story viewed' });
  } catch (error: any) {
    console.error('[Story View Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to mark story as viewed'
    });
  }
});

/**
 * DELETE /api/v1/stories/:id
 * Delete own story
 */
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const storyId = req.params.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const story = await Story.findById(storyId);
    if (!story) {
      res.status(404).json({ success: false, message: 'Story not found' });
      return;
    }

    if (String(story.user) !== String(userId)) {
      res.status(403).json({ success: false, message: 'You can only delete your own stories.' });
      return;
    }

    await Story.findByIdAndDelete(storyId);
    emitStoryDeleted(storyId);

    res.json({ success: true, message: 'Story deleted successfully.' });
  } catch (error: any) {
    console.error('[Story Delete Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete story'
    });
  }
});

export default router;
