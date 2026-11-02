import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { Session } from '../../models/Session';
import { User } from '../../models/User';
import { CreditTransaction } from '../../models/CreditTransaction';
import { authenticateToken, AuthRequest } from '../../middleware/auth.middleware';

const router = Router();

// Book a session
router.post('/book', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.id;
    const { tutorId, subject, topic, scheduledDate, durationMins, creditCost, notes } = req.body;

    if (!tutorId || !subject || !scheduledDate) {
      res.status(400).json({ success: false, message: 'Tutor, subject and scheduledDate are required' });
      return;
    }

    const student = await User.findById(studentId);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student account not found' });
      return;
    }

    const cost = creditCost || 15;
    if (student.learningCredits < cost) {
      res.status(400).json({
        success: false,
        message: `Insufficient learning credits. You have ${student.learningCredits} credits, but this session requires ${cost}.`
      });
      return;
    }

    const newSession = await Session.create({
      studentId,
      tutorId,
      subject,
      topic: topic || 'General Mentorship & Doubts',
      scheduledDate: new Date(scheduledDate),
      durationMins: durationMins || 45,
      creditCost: cost,
      notes: notes || '',
      status: 'confirmed',
      meetingLink: `https://meet.peerbridge.edu/session-${Date.now().toString(36)}`
    });

    // Deduct student credits & create ledger entry
    student.learningCredits -= cost;
    await student.save();

    await CreditTransaction.create({
      userId: student._id,
      amount: -cost,
      type: 'spent',
      description: `Booked session for ${subject} with peer mentor`,
      sessionId: newSession._id,
      balanceAfter: student.learningCredits
    });

    res.status(201).json({
      success: true,
      message: 'Session booked successfully!',
      data: newSession
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get user's sessions (as student or tutor)
router.get('/my', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const sessions = await Session.find({
      $or: [{ studentId: userId }, { tutorId: userId }]
    })
      .populate('studentId', 'name avatar email department college')
      .populate('tutorId', 'name avatar email department college rating')
      .sort({ scheduledDate: -1 });

    res.json({
      success: true,
      count: sessions.length,
      data: sessions
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Complete session & review
router.post('/:id/complete', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { rating, reviewText } = req.body;

    const session = await Session.findById(id);
    if (!session) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }

    session.status = 'completed';
    if (rating) session.rating = rating;
    if (reviewText) session.reviewText = reviewText;
    await session.save();

    // Reward tutor with credits
    const tutor = await User.findById(session.tutorId);
    if (tutor) {
      tutor.learningCredits += session.creditCost;
      if (rating) {
        // Recalculate average rating
        const newRating = Number(((tutor.rating * tutor.reviewCount + rating) / (tutor.reviewCount + 1)).toFixed(1));
        tutor.rating = newRating;
        tutor.reviewCount += 1;
      }
      await tutor.save();

      await CreditTransaction.create({
        userId: tutor._id,
        amount: session.creditCost,
        type: 'earned',
        description: `Completed peer mentoring session: ${session.subject}`,
        sessionId: session._id,
        balanceAfter: tutor.learningCredits
      });
    }

    res.json({
      success: true,
      message: 'Session marked as completed. Credits transferred to tutor!',
      data: session
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
