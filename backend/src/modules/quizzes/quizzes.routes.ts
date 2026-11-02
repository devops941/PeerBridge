import { Router, Request, Response } from 'express';
import { Quiz } from '../../models/Quiz';
import { User } from '../../models/User';
import { CreditTransaction } from '../../models/CreditTransaction';
import { authenticateToken, AuthRequest } from '../../middleware/auth.middleware';

const router = Router();

// Get list of practice quizzes
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const quizzes = await Quiz.find().select('title subject category totalTimeSeconds questions.length');
    res.json({
      success: true,
      data: quizzes
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get quiz details with questions
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      res.status(404).json({ success: false, message: 'Quiz not found' });
      return;
    }
    res.json({
      success: true,
      data: quiz
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Submit answers, evaluate score, and award bonus learning credits!
router.post('/:id/submit', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { answers } = req.body; // e.g. { "0": "C", "1": "B" }
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      res.status(404).json({ success: false, message: 'Quiz not found' });
      return;
    }

    let correctCount = 0;
    const results = quiz.questions.map((q, idx) => {
      const selected = answers ? answers[idx] : null;
      const isCorrect = selected === q.correctKey;
      if (isCorrect) correctCount += 1;
      return {
        questionNumber: q.questionNumber,
        selectedKey: selected,
        correctKey: q.correctKey,
        isCorrect,
        explanation: q.explanation
      };
    });

    const scorePercent = Math.round((correctCount / quiz.questions.length) * 100);

    // Reward with 10 credits if score >= 70%
    let bonusAwarded = 0;
    if (scorePercent >= 70 && req.user?.id) {
      bonusAwarded = 10;
      const user = await User.findById(req.user.id);
      if (user) {
        user.learningCredits += bonusAwarded;
        await user.save();
        await CreditTransaction.create({
          userId: user._id,
          amount: bonusAwarded,
          type: 'bonus',
          description: `Passed practice quiz: ${quiz.title} (${scorePercent}%)`,
          balanceAfter: user.learningCredits
        });
      }
    }

    res.json({
      success: true,
      data: {
        totalQuestions: quiz.questions.length,
        correctCount,
        scorePercent,
        bonusAwarded,
        results
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
