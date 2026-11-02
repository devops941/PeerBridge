import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { connectDB } from './config/db';
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

// Ensure DB connection for serverless (Vercel) & traditional servers
app.use(async (_req: Request, _res: Response, next: NextFunction) => {
  try {
    await connectDB();
  } catch (err) {
    console.error('[DB Middleware] Connection error:', err);
  }
  next();
});

// Status helper
const getApiStatus = () => ({
  success: true,
  status: 'online',
  app: 'PeerBridge Backend API',
  tagline: 'Learn • Share • Grow • Together',
  version: '1.0.0',
  message: '🚀 PeerBridge Backend API is live and healthy!',
  endpoints: {
    health: '/api/v1/health',
    auth: '/api/v1/auth',
    doubts: '/api/v1/doubts',
    subjects: '/api/v1/subjects',
    tutors: '/api/v1/tutors',
    stories: '/api/v1/stories',
    chat: '/api/v1/chat'
  },
  timestamp: new Date().toISOString()
});

// Root & Health Check Endpoints
app.get('/', (_req: Request, res: Response) => {
  res.json(getApiStatus());
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', success: true, timestamp: new Date().toISOString() });
});

app.get('/api', (_req: Request, res: Response) => {
  res.json(getApiStatus());
});

app.get('/api/v1', (_req: Request, res: Response) => {
  res.json(getApiStatus());
});

app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.json(getApiStatus());
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
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `API Route not found: ${req.method} ${req.originalUrl}`
  });
});

export default app;
