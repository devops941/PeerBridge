import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { Follow } from '../../models/Follow';
import { FollowRequest } from '../../models/FollowRequest';
import { Notification } from '../../models/Notification';
import { Doubt } from '../../models/Doubt';
import { Answer } from '../../models/Answer';
import { User } from '../../models/User';
import { authenticateToken, AuthRequest } from '../../middleware/auth.middleware';
import {
  emitNotification,
  emitFollowRequestReceived,
  emitFollowAccepted
} from '../../socket';

const router = Router();

/**
 * POST /api/v1/follow/users/:id/request
 * Send a follow request (Instagram-style) to a peer
 */
router.post('/users/:id/request', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      res.status(400).json({ success: false, message: 'Invalid target user ID format.' });
      return;
    }

    if (String(currentUserId) === String(targetUserId)) {
      res.status(400).json({ success: false, message: 'You cannot follow yourself.' });
      return;
    }

    const [targetUser, currentUser] = await Promise.all([
      User.findById(targetUserId),
      User.findById(currentUserId)
    ]);

    if (!targetUser) {
      res.status(404).json({ success: false, message: 'Learner profile not found.' });
      return;
    }

    // Check if already following
    const existingFollow = await Follow.findOne({
      follower: currentUserId,
      following: targetUserId
    });

    if (existingFollow) {
      res.json({
        success: true,
        message: 'You are already following this peer.',
        isFollowing: true,
        isRequested: false
      });
      return;
    }

    // Check if pending request already exists
    let existingRequest = await FollowRequest.findOne({
      sender: currentUserId,
      recipient: targetUserId,
      status: 'PENDING'
    });

    if (existingRequest) {
      res.json({
        success: true,
        message: 'Follow request already sent.',
        isFollowing: false,
        isRequested: true
      });
      return;
    }

    // Create follow request
    const followReq = await FollowRequest.create({
      sender: currentUserId,
      recipient: targetUserId,
      status: 'PENDING'
    });

    // Create Notification document
    const notif = await Notification.create({
      recipient: targetUserId,
      sender: currentUserId,
      type: 'FOLLOW_REQUEST',
      title: 'New Follow Request',
      message: `${currentUser?.name || 'A peer'} sent you a follow request.`,
      data: {
        requestId: followReq._id,
        senderId: currentUserId,
        senderName: currentUser?.name || 'Peer',
        senderAvatar: currentUser?.avatar || ''
      }
    });

    // Real-time Push via Socket.IO
    const notifPayload = {
      _id: notif._id,
      recipient: targetUserId,
      sender: {
        _id: currentUserId,
        name: currentUser?.name || 'Peer',
        avatar: currentUser?.avatar || '',
        department: currentUser?.department || '',
        college: currentUser?.college || ''
      },
      type: 'FOLLOW_REQUEST',
      title: 'New Follow Request',
      message: `${currentUser?.name || 'A peer'} sent you a follow request.`,
      data: {
        requestId: followReq._id
      },
      createdAt: notif.createdAt
    };

    emitNotification(targetUserId, notifPayload);
    emitFollowRequestReceived(targetUserId, notifPayload);

    res.status(201).json({
      success: true,
      message: `Follow request sent to ${targetUser.name}.`,
      isFollowing: false,
      isRequested: true,
      requestId: followReq._id
    });
  } catch (err: any) {
    console.error('[Follow Request Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to send follow request.' });
  }
});

/**
 * DELETE /api/v1/follow/users/:id/cancel-request
 * Cancel a pending follow request
 */
router.delete('/users/:id/cancel-request', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user?.id;

    if (!currentUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
      res.status(400).json({ success: false, message: 'Invalid request parameters.' });
      return;
    }

    await FollowRequest.findOneAndDelete({
      sender: currentUserId,
      recipient: targetUserId,
      status: 'PENDING'
    });

    await Notification.deleteMany({
      recipient: targetUserId,
      sender: currentUserId,
      type: 'FOLLOW_REQUEST'
    });

    res.json({
      success: true,
      message: 'Follow request cancelled.',
      isFollowing: false,
      isRequested: false
    });
  } catch (err: any) {
    console.error('[Cancel Follow Request Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to cancel follow request.' });
  }
});

/**
 * GET /api/v1/follow/requests/pending
 * Get all pending incoming follow requests for logged-in user
 */
router.get('/requests/pending', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const pendingRequests = await FollowRequest.find({
      recipient: currentUserId,
      status: 'PENDING'
    })
      .populate('sender', 'name avatar department college headline rating')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: pendingRequests
    });
  } catch (err: any) {
    console.error('[Get Pending Requests Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch pending requests.' });
  }
});

/**
 * PATCH /api/v1/follow/requests/:requestId/accept
 * Accept an incoming follow request
 */
router.patch('/requests/:requestId/accept', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { requestId } = req.params;
    const currentUserId = req.user?.id;

    if (!currentUserId || !mongoose.Types.ObjectId.isValid(requestId)) {
      res.status(400).json({ success: false, message: 'Invalid request ID format.' });
      return;
    }

    const followReq = await FollowRequest.findOne({
      _id: requestId,
      recipient: currentUserId,
      status: 'PENDING'
    });

    if (!followReq) {
      res.status(404).json({ success: false, message: 'Follow request not found or already processed.' });
      return;
    }

    // Mark request as accepted
    followReq.status = 'ACCEPTED';
    await followReq.save();

    // Create follow relationship (sender follows recipient)
    await Follow.findOneAndUpdate(
      { follower: followReq.sender, following: currentUserId },
      { follower: followReq.sender, following: currentUserId },
      { upsert: true, new: true }
    );

    const [recipientUser, senderUser] = await Promise.all([
      User.findById(currentUserId).select('name avatar department college headline'),
      User.findById(followReq.sender).select('name avatar department college headline')
    ]);

    // Create acceptance notification for the sender
    const notif = await Notification.create({
      recipient: followReq.sender,
      sender: currentUserId,
      type: 'FOLLOW_ACCEPTED',
      title: 'Follow Request Accepted',
      message: `${recipientUser?.name || 'A peer'} accepted your follow request.`,
      data: {
        peerId: currentUserId,
        peerName: recipientUser?.name,
        peerAvatar: recipientUser?.avatar
      }
    });

    // Real-time Push via Socket.IO to the sender
    emitNotification(String(followReq.sender), {
      _id: notif._id,
      recipient: followReq.sender,
      sender: recipientUser,
      type: 'FOLLOW_ACCEPTED',
      title: 'Follow Request Accepted',
      message: `${recipientUser?.name || 'A peer'} accepted your follow request.`,
      data: { peerId: currentUserId },
      createdAt: notif.createdAt
    });

    emitFollowAccepted(String(followReq.sender), {
      user: recipientUser,
      requestId
    });

    res.json({
      success: true,
      message: 'Follow request accepted.',
      partner: senderUser
    });
  } catch (err: any) {
    console.error('[Accept Request Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to accept follow request.' });
  }
});

/**
 * PATCH /api/v1/follow/requests/:requestId/decline
 * Decline an incoming follow request
 */
router.patch('/requests/:requestId/decline', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { requestId } = req.params;
    const currentUserId = req.user?.id;

    if (!currentUserId || !mongoose.Types.ObjectId.isValid(requestId)) {
      res.status(400).json({ success: false, message: 'Invalid request ID format.' });
      return;
    }

    await FollowRequest.findOneAndDelete({
      _id: requestId,
      recipient: currentUserId
    });

    res.json({
      success: true,
      message: 'Follow request declined.'
    });
  } catch (err: any) {
    console.error('[Decline Request Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to decline follow request.' });
  }
});

/**
 * GET /api/v1/follow/users/:id/profile
 * Get complete public profile details, activity stats, and follow status
 */
router.get('/users/:id/profile', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.query.currentUserId as string | undefined;

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      res.status(400).json({ success: false, message: 'Invalid user ID format.' });
      return;
    }

    const user = await User.findById(targetUserId)
      .select('name avatar college department headline rating bio badges email createdAt projects education experience skills yearOfStudy semester studentId canExplainSubjects learningInterests')
      .lean();

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const [followerCount, followingCount, doubtsCount, solutionsCount] = await Promise.all([
      Follow.countDocuments({ following: targetUserId }),
      Follow.countDocuments({ follower: targetUserId }),
      Doubt.countDocuments({ author: targetUserId }),
      Answer.countDocuments({ author: targetUserId })
    ]);

    let isFollowing = false;
    let isRequested = false;
    let isMutual = false;

    if (currentUserId && mongoose.Types.ObjectId.isValid(currentUserId) && currentUserId !== targetUserId) {
      const [followingDoc, followsMeDoc, requestDoc] = await Promise.all([
        Follow.findOne({ follower: currentUserId, following: targetUserId }),
        Follow.findOne({ follower: targetUserId, following: currentUserId }),
        FollowRequest.findOne({ sender: currentUserId, recipient: targetUserId, status: 'PENDING' })
      ]);

      isFollowing = !!followingDoc;
      isRequested = !isFollowing && !!requestDoc;
      isMutual = isFollowing && !!followsMeDoc;
    }

    res.json({
      success: true,
      data: {
        ...user,
        stats: {
          followerCount,
          followingCount,
          doubtsCount,
          solutionsCount
        },
        relationship: {
          isFollowing,
          isRequested,
          isMutual,
          isSelf: currentUserId === targetUserId
        }
      }
    });
  } catch (err: any) {
    console.error('[Get Profile Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch user profile.' });
  }
});

/**
 * GET /api/v1/follow/connected-peers
 * Get list of connected peers / mutual contacts for Direct Messaging
 */
router.get('/connected-peers', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    // Find all users current user follows or who follow current user
    const [followingList, followersList] = await Promise.all([
      Follow.find({ follower: currentUserId }).select('following').lean(),
      Follow.find({ following: currentUserId }).select('follower').lean()
    ]);

    const peerIdSet = new Set<string>();
    followingList.forEach((f: any) => peerIdSet.add(String(f.following)));
    followersList.forEach((f: any) => peerIdSet.add(String(f.follower)));

    const peerIds = Array.from(peerIdSet).filter(id => id !== String(currentUserId));

    const connectedPeers = await User.find({ _id: { $in: peerIds } })
      .select('name avatar department college headline rating')
      .lean();

    res.json({
      success: true,
      count: connectedPeers.length,
      data: connectedPeers
    });
  } catch (err: any) {
    console.error('[Connected Peers Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch connected peers.' });
  }
});

/**
 * POST /api/v1/follow/users/:id/follow
 * Instant follow (or backward compatibility)
 */
router.post('/users/:id/follow', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user?.id;

    if (!currentUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
      res.status(400).json({ success: false, message: 'Invalid target user ID.' });
      return;
    }

    if (String(currentUserId) === String(targetUserId)) {
      res.status(400).json({ success: false, message: 'You cannot follow yourself.' });
      return;
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      res.status(404).json({ success: false, message: 'Learner profile not found.' });
      return;
    }

    const existingFollow = await Follow.findOne({
      follower: currentUserId,
      following: targetUserId
    });

    if (existingFollow) {
      res.json({
        success: true,
        message: 'You are already following this peer.',
        isFollowing: true
      });
      return;
    }

    await Follow.create({
      follower: currentUserId,
      following: targetUserId
    });

    // Clean up any pending request
    await FollowRequest.deleteMany({
      sender: currentUserId,
      recipient: targetUserId
    });

    const followerCount = await Follow.countDocuments({ following: targetUserId });

    res.status(201).json({
      success: true,
      message: `You are now following ${targetUser.name}.`,
      isFollowing: true,
      followerCount
    });
  } catch (err: any) {
    console.error('[Follow Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to follow peer.' });
  }
});

/**
 * DELETE /api/v1/follow/users/:id/unfollow
 * Unfollow a peer learner
 */
router.delete('/users/:id/unfollow', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user?.id;

    if (!currentUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
      res.status(400).json({ success: false, message: 'Invalid target user ID format.' });
      return;
    }

    await Follow.findOneAndDelete({
      follower: currentUserId,
      following: targetUserId
    });

    await FollowRequest.deleteMany({
      sender: currentUserId,
      recipient: targetUserId
    });

    const followerCount = await Follow.countDocuments({ following: targetUserId });

    res.json({
      success: true,
      message: 'Unfollowed peer.',
      isFollowing: false,
      isRequested: false,
      followerCount
    });
  } catch (err: any) {
    console.error('[Unfollow Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to unfollow peer.' });
  }
});

/**
 * GET /api/v1/follow/users/:id/status
 * Check follow status and counts for a user
 */
router.get('/users/:id/status', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.query.currentUserId as string | undefined;

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      res.status(400).json({ success: false, message: 'Invalid user ID format.' });
      return;
    }

    const [followerCount, followingCount] = await Promise.all([
      Follow.countDocuments({ following: targetUserId }),
      Follow.countDocuments({ follower: targetUserId })
    ]);

    let isFollowing = false;
    let isRequested = false;

    if (currentUserId && mongoose.Types.ObjectId.isValid(currentUserId)) {
      const [exists, reqExists] = await Promise.all([
        Follow.findOne({ follower: currentUserId, following: targetUserId }),
        FollowRequest.findOne({ sender: currentUserId, recipient: targetUserId, status: 'PENDING' })
      ]);
      isFollowing = !!exists;
      isRequested = !isFollowing && !!reqExists;
    }

    res.json({
      success: true,
      isFollowing,
      isRequested,
      followerCount,
      followingCount
    });
  } catch (err: any) {
    console.error('[Follow Status Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to get follow status.' });
  }
});

/**
 * GET /api/v1/follow/users/:id/followers
 * Get list of followers for a user
 */
router.get('/users/:id/followers', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const targetUserId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      res.status(400).json({ success: false, message: 'Invalid user ID format.' });
      return;
    }

    const followers = await Follow.find({ following: targetUserId })
      .populate('follower', 'name avatar college department headline rating')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({
      success: true,
      count: followers.length,
      data: followers.map((f: any) => f.follower).filter(Boolean)
    });
  } catch (err: any) {
    console.error('[Get Followers Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve followers.' });
  }
});

/**
 * GET /api/v1/follow/users/:id/following
 * Get list of peers a user is following
 */
router.get('/users/:id/following', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const targetUserId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      res.status(400).json({ success: false, message: 'Invalid user ID format.' });
      return;
    }

    const following = await Follow.find({ follower: targetUserId })
      .populate('following', 'name avatar college department headline rating')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({
      success: true,
      count: following.length,
      data: following.map((f: any) => f.following).filter(Boolean)
    });
  } catch (err: any) {
    console.error('[Get Following Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve following list.' });
  }
});

export default router;
