import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { VolunteerRequest } from '../../models/VolunteerRequest';
import { Doubt } from '../../models/Doubt';
import { authenticateToken, AuthRequest } from '../../middleware/auth.middleware';
import { emitVolunteerUpdated } from '../../socket';

const router = Router();

/**
 * POST /api/v1/volunteers/apply/:doubtId
 * Volunteer to help on an open doubt ("I Can Help")
 */
router.post('/apply/:doubtId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { doubtId } = req.params;
    const { introMessage } = req.body;

    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Authentication required to volunteer.' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(doubtId)) {
      res.status(400).json({ success: false, message: 'Invalid doubt ID format.' });
      return;
    }

    const doubt = await Doubt.findById(doubtId);
    if (!doubt) {
      res.status(404).json({ success: false, message: 'Doubt not found or has been removed.' });
      return;
    }

    if (String(doubt.author) === String(req.user.id)) {
      res.status(400).json({
        success: false,
        message: 'You cannot volunteer on your own doubt post.'
      });
      return;
    }

    if (doubt.status === 'RESOLVED' || doubt.status === 'CLOSED') {
      res.status(400).json({
        success: false,
        message: `This doubt is already ${doubt.status.toLowerCase()} and cannot accept new helpers.`
      });
      return;
    }

    // Check for existing request
    const existing = await VolunteerRequest.findOne({
      doubtId: doubt._id,
      volunteerId: req.user.id
    });

    if (existing) {
      if (existing.status === 'PENDING') {
        res.status(400).json({
          success: false,
          message: 'You have already offered to help with this doubt. The author will review your request!'
        });
        return;
      }
      if (existing.status === 'ACCEPTED') {
        res.status(400).json({
          success: false,
          message: 'Your help offer has already been accepted for this doubt.'
        });
        return;
      }

      // If previously WITHDRAWN or DECLINED, allow re-applying
      existing.status = 'PENDING';
      existing.introMessage = introMessage ? String(introMessage).trim() : '';
      existing.respondedAt = undefined;
      await existing.save();

      await Doubt.updateOne({ _id: doubtId }, { $inc: { volunteerCount: 1 } });

      res.json({
        success: true,
        message: 'Your offer to help has been sent to the doubt author!',
        data: existing
      });
      return;
    }

    const newRequest = await VolunteerRequest.create({
      doubtId: doubt._id,
      volunteerId: req.user.id,
      ownerId: doubt.author,
      introMessage: introMessage ? String(introMessage).trim() : '',
      status: 'PENDING'
    });

    // Increment volunteer count on the Doubt
    await Doubt.updateOne({ _id: doubtId }, { $inc: { volunteerCount: 1 } });
    const updatedDoubt = await Doubt.findById(doubtId, 'volunteerCount');

    emitVolunteerUpdated({
      doubtId: String(doubtId),
      volunteerCount: updatedDoubt?.volunteerCount || (doubt.volunteerCount + 1),
      volunteerReq: newRequest
    });

    res.status(201).json({
      success: true,
      message: 'Thank you for volunteering! The student will be notified of your offer.',
      data: newRequest
    });
  } catch (err: any) {
    console.error('[Volunteer Apply Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to submit volunteer offer.' });
  }
});

/**
 * GET /api/v1/volunteers/doubt/:doubtId
 * List all volunteer requests for a doubt (Owner only)
 */
router.get('/doubt/:doubtId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { doubtId } = req.params;
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(doubtId)) {
      res.status(400).json({ success: false, message: 'Invalid doubt ID format.' });
      return;
    }

    const doubt = await Doubt.findById(doubtId);
    if (!doubt) {
      res.status(404).json({ success: false, message: 'Doubt not found.' });
      return;
    }

    // Only author can view full volunteer list
    if (String(doubt.author) !== String(req.user.id)) {
      // If not author, check if user is a volunteer for this doubt
      const myRequest = await VolunteerRequest.findOne({
        doubtId,
        volunteerId: req.user.id
      }).populate('volunteerId', 'name avatar college department headline rating');

      res.json({
        success: true,
        isAuthor: false,
        data: myRequest ? [myRequest] : []
      });
      return;
    }

    const requests = await VolunteerRequest.find({ doubtId })
      .sort({ createdAt: -1 })
      .populate('volunteerId', 'name avatar college department headline rating reviewCount skills')
      .lean();

    res.json({
      success: true,
      isAuthor: true,
      count: requests.length,
      data: requests
    });
  } catch (err: any) {
    console.error('[Get Volunteers Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve volunteers.' });
  }
});

/**
 * PATCH /api/v1/volunteers/:id/status
 * Doubt owner accepts or declines a volunteer offer
 */
router.patch('/:id/status', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!['ACCEPTED', 'DECLINED'].includes(String(status).toUpperCase())) {
      res.status(400).json({ success: false, message: 'Status must be ACCEPTED or DECLINED.' });
      return;
    }

    const volunteerReq = await VolunteerRequest.findById(id);
    if (!volunteerReq) {
      res.status(404).json({ success: false, message: 'Volunteer request not found.' });
      return;
    }

    // Strict Authorization: Only the doubt owner can accept/decline
    if (String(volunteerReq.ownerId) !== String(req.user.id)) {
      res.status(403).json({
        success: false,
        message: 'Only the author of this doubt can accept or decline helpers.'
      });
      return;
    }

    volunteerReq.status = status.toUpperCase() as 'ACCEPTED' | 'DECLINED';
    volunteerReq.respondedAt = new Date();
    await volunteerReq.save();

    // If accepted, update Doubt status to IN_PROGRESS
    if (volunteerReq.status === 'ACCEPTED') {
      await Doubt.updateOne(
        { _id: volunteerReq.doubtId, status: 'OPEN' },
        { $set: { status: 'IN_PROGRESS' } }
      );
    }

    const populated = await VolunteerRequest.findById(id).populate(
      'volunteerId',
      'name avatar college department headline rating'
    );

    res.json({
      success: true,
      message:
        volunteerReq.status === 'ACCEPTED'
          ? 'Helper accepted! You can now collaborate and solve the doubt together.'
          : 'Volunteer request declined.',
      data: populated
    });
  } catch (err: any) {
    console.error('[Update Volunteer Status Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to update volunteer status.' });
  }
});

/**
 * DELETE /api/v1/volunteers/:id
 * Volunteer cancels / withdraws their pending help offer
 */
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const volunteerReq = await VolunteerRequest.findById(id);
    if (!volunteerReq) {
      res.status(404).json({ success: false, message: 'Volunteer request not found.' });
      return;
    }

    // Only the volunteer can cancel their own offer
    if (String(volunteerReq.volunteerId) !== String(req.user.id)) {
      res.status(403).json({ success: false, message: 'You can only cancel your own volunteer offer.' });
      return;
    }

    if (volunteerReq.status === 'PENDING') {
      await Doubt.updateOne({ _id: volunteerReq.doubtId }, { $inc: { volunteerCount: -1 } });
    }

    volunteerReq.status = 'WITHDRAWN';
    await volunteerReq.save();

    res.json({
      success: true,
      message: 'Your volunteer offer has been withdrawn.'
    });
  } catch (err: any) {
    console.error('[Withdraw Volunteer Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to withdraw volunteer offer.' });
  }
});

export default router;
