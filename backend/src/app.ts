import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes';
import tutorsRoutes from './modules/tutors/tutors.routes';
import sessionsRoutes from './modules/sessions/sessions.routes';
import chatRoutes from './modules/chat/chat.routes';
import creditsRoutes from './modules/credits/credits.routes';
import quizzesRoutes from './modules/quizzes/quizzes.routes';
import subjectsRoutes from './modules/subjects/subjects.routes';
import doubtsRoutes from './modules/doubts/doubts.routes';
import volunteersRoutes from './modules/volunteers/volunteers.routes';
import answersRoutes from './modules/answers/answers.routes';
import followRoutes from './modules/follow/follow.routes';
import uploadRoutes from './modules/upload/upload.routes';
import notificationsRoutes from './modules/notifications/notification.routes';
import storiesRoutes from './modules/stories/story.routes';

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '40mb' }));
app.use(express.urlencoded({ extended: true, limit: '40mb' }));

// Health Check
app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'PeerBridge Backend API',
    tagline: 'Learn • Share • Grow • Together',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/subjects', subjectsRoutes);
app.use('/api/v1/doubts', doubtsRoutes);
app.use('/api/v1/volunteers', volunteersRoutes);
app.use('/api/v1/answers', answersRoutes);
app.use('/api/v1/follow', followRoutes);
app.use('/api/v1/tutors', tutorsRoutes);
app.use('/api/v1/sessions', sessionsRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/credits', creditsRoutes);
app.use('/api/v1/quizzes', quizzesRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/stories', storiesRoutes);

// Global 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'API Route not found' });
});

export default app;
