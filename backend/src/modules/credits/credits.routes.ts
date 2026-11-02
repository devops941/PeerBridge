import { Router, Response } from 'express';
import { CreditTransaction } from '../../models/CreditTransaction';
import { User } from '../../models/User';
import { authenticateToken, AuthRequest } from '../../middleware/auth.middleware';

const router = Router();

// Get wallet balance and transactions ledger
router.get('/wallet', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId).select('learningCredits name email');
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const transactions = await CreditTransaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(30);

    res.json({
      success: true,
      data: {
        balance: user.learningCredits,
        transactions
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
