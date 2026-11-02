import { Router, Request, Response } from 'express';
import { Subject } from '../../models/Subject';

const router = Router();



/**
 * GET /api/v1/subjects
 * Query parameters:
 *  - category: Filter by category (e.g. 'Computer Science & IT')
 *  - search: Keyword search in name or description
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, search } = req.query;
    const filter: Record<string, any> = { isActive: true };

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (search && typeof search === 'string' && search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
        { code: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const subjects = await Subject.find(filter).sort({ name: 1 });

    res.json({
      success: true,
      count: subjects.length,
      data: subjects
    });
  } catch (err: any) {
    console.error('[Subjects Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve academic subjects.' });
  }
});

/**
 * GET /api/v1/subjects/categories
 * Returns distinct subject categories
 */
router.get('/categories', async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await Subject.distinct('category', { isActive: true });
    res.json({
      success: true,
      data: ['All', ...categories]
    });
  } catch (err: any) {
    console.error('[Categories Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve subject categories.' });
  }
});

export default router;
