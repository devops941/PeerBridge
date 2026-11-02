import { Router, Request, Response } from 'express';
import { User } from '../../models/User';

const router = Router();

// Get list of tutors / peers with search and subject filter
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { subject, search, sortBy } = req.query;

    const query: any = { role: { $in: ['tutor', 'both'] } };

    if (subject && subject !== 'All') {
      query.subjects = { $in: [new RegExp(subject as string, 'i')] };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search as string, $options: 'i' } },
        { department: { $regex: search as string, $options: 'i' } },
        { subjects: { $regex: search as string, $options: 'i' } },
        { skills: { $regex: search as string, $options: 'i' } }
      ];
    }

    let sortOption: any = { rating: -1 };
    if (sortBy === 'students') sortOption = { studentsCount: -1 };
    if (sortBy === 'rate') sortOption = { hourlyRateCredits: 1 };

    const tutors = await User.find(query).select('-password').sort(sortOption).limit(30);

    res.json({
      success: true,
      count: tutors.length,
      data: tutors
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Recommended peers based on compatibility
router.get('/recommended', async (req: Request, res: Response): Promise<void> => {
  try {
    // Return top rated tutors with diverse skillsets
    const recommended = await User.find({ role: { $in: ['tutor', 'both'] } })
      .select('-password')
      .sort({ rating: -1, reviewCount: -1 })
      .limit(6);

    res.json({
      success: true,
      data: recommended
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get single tutor profile
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const tutor = await User.findById(req.params.id).select('-password');
    if (!tutor) {
      res.status(404).json({ success: false, message: 'Tutor not found' });
      return;
    }

    res.json({ success: true, data: tutor });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
