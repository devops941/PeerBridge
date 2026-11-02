import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { Notification } from '../../models/Notification';
import { authenticateToken, AuthRequest } from '../../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/v1/notifications
 * Get user notifications list
 */
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const notifications = await Notification.find({ recipient: currentUserId })
      .populate('sender', 'name avatar department college headline')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const unreadCount = await Notification.countDocuments({
      recipient: currentUserId,
      read: false
    });

    res.json({
      success: true,
      data: notifications,
      unreadCount
    });
  } catch (err: any) {
    console.error('[Get Notifications Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
  }
});

/**
 * PATCH /api/v1/notifications/:id/read
 * Mark single notification as read
 */
router.patch('/:id/read', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid notification ID.' });
      return;
    }

    await Notification.findOneAndUpdate(
      { _id: id, recipient: currentUserId },
      { read: true }
    );

    res.json({ success: true, message: 'Marked as read.' });
  } catch (err: any) {
    console.error('[Mark Read Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to mark notification as read.' });
  }
});

/**
 * PATCH /api/v1/notifications/read-all
 * Mark all notifications as read
 */
router.patch('/read-all', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    await Notification.updateMany(
      { recipient: currentUserId, read: false },
      { read: true }
    );

    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err: any) {
    console.error('[Read All Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to mark all as read.' });
  }
});

export default router;
