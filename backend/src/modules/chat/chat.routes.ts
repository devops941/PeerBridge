import { Router, Response } from 'express';
import { Message } from '../../models/Message';
import { User } from '../../models/User';
import { Notification } from '../../models/Notification';
import { authenticateToken, AuthRequest } from '../../middleware/auth.middleware';
import { emitNotification, getIO } from '../../socket';

const router = Router();

// Get list of active conversations for current user
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    // Find all messages involving current user
    const messages = await Message.find({
      $or: [{ senderId: currentUserId }, { receiverId: currentUserId }]
    })
      .sort({ createdAt: -1 })
      .lean();

    // Group by conversation partner
    const partnerMap = new Map<string, { lastMessage: any; unreadCount: number }>();
    for (const msg of messages) {
      const partnerId =
        String(msg.senderId) === String(currentUserId)
          ? String(msg.receiverId)
          : String(msg.senderId);

      if (!partnerMap.has(partnerId)) {
        partnerMap.set(partnerId, {
          lastMessage: msg,
          unreadCount: !msg.isRead && String(msg.receiverId) === String(currentUserId) ? 1 : 0
        });
      } else {
        const entry = partnerMap.get(partnerId)!;
        if (!msg.isRead && String(msg.receiverId) === String(currentUserId)) {
          entry.unreadCount += 1;
        }
      }
    }

    const partnerIds = Array.from(partnerMap.keys());
    const users = await User.find({ _id: { $in: partnerIds } })
      .select('name avatar college department headline rating')
      .lean();

    const conversations = users.map((u) => {
      const entry = partnerMap.get(String(u._id));
      return {
        partner: u,
        lastMessage: entry?.lastMessage,
        unreadCount: entry?.unreadCount || 0
      };
    });

    res.json({
      success: true,
      count: conversations.length,
      data: conversations
    });
  } catch (err: any) {
    console.error('[Get Conversations Error]:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get conversation messages between current user and another user
router.get('/:userId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    const { userId } = req.params;

    const messages = await Message.find({
      $or: [
        { senderId: currentUserId, receiverId: userId },
        { senderId: userId, receiverId: currentUserId }
      ]
    })
      .sort({ createdAt: 1 })
      .limit(100);

    const partner = await User.findById(userId).select('name avatar department college rating');

    res.json({
      success: true,
      data: {
        partner,
        messages
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Send message
router.post('/send', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const senderId = req.user?.id;
    const { receiverId, content, type, audioDuration, sessionId, mediaUrl, mediaDuration, fileSize } = req.body;

    if (!receiverId || (!content && !mediaUrl)) {
      res.status(400).json({ success: false, message: 'Receiver and content/media are required' });
      return;
    }

    const messageType = type || (mediaUrl ? 'image' : 'text');
    const messageContent = content || (messageType === 'image' ? '📷 Photo' : messageType === 'video' ? '🎥 Video' : '');

    const [newMessage, senderUser] = await Promise.all([
      Message.create({
        senderId,
        receiverId,
        content: messageContent,
        type: messageType,
        mediaUrl: mediaUrl || undefined,
        mediaDuration: mediaDuration || undefined,
        fileSize: fileSize || undefined,
        audioDuration: audioDuration || undefined,
        sessionId: sessionId || undefined
      }),
      User.findById(senderId).select('name avatar department college').lean()
    ]);

    // Create In-App Notification for receiver
    const notificationMessage =
      messageType === 'image'
        ? '📷 Sent you a photo / diagram'
        : messageType === 'video'
        ? '🎥 Sent you a video clip'
        : messageContent.length > 60
        ? messageContent.slice(0, 60) + '...'
        : messageContent;

    const notif = await Notification.create({
      recipient: receiverId,
      sender: senderId,
      type: 'MESSAGE',
      title: `${senderUser?.name || 'A peer'} sent you a message`,
      message: notificationMessage,
      data: {
        partnerId: senderId,
        partnerName: senderUser?.name || 'Peer',
        partnerAvatar: senderUser?.avatar || '',
        messageId: newMessage._id,
        mediaType: messageType
      }
    });

    const notifPayload = {
      _id: notif._id,
      recipient: receiverId,
      sender: senderUser,
      type: 'MESSAGE',
      title: `${senderUser?.name || 'A peer'} sent you a message`,
      message: notificationMessage,
      data: {
        partnerId: senderId,
        partnerName: senderUser?.name,
        partnerAvatar: senderUser?.avatar
      },
      createdAt: notif.createdAt
    };

    // Emit live push alert to receiver
    emitNotification(String(receiverId), notifPayload);

    const io = getIO();
    if (io) {
      io.to(`user_${receiverId}`).emit('new_message', newMessage);
      if (sessionId) {
        io.to(`session_${sessionId}`).emit('new_message', newMessage);
      }
    }

    res.status(201).json({
      success: true,
      data: newMessage
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
