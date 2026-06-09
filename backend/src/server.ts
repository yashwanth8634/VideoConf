import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { PrismaClient } from '@prisma/client';
import { SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import meetingRoutes from './routes/meetings';
import chatRoutes from './routes/chat';
import recordingRoutes from './routes/recordings';
import analyticsRoutes from './routes/analytics';
import moderationRoutes from './routes/moderation';
import { errorHandler, notFound } from './middleware/errorHandler';
import { validateRequest } from './middleware/validation';
import { authenticate } from './middleware/auth';
import { initializeSocketIO } from './socket';

// Load environment variables
dotenv.config();

// Initialize Express app
const app: Express = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Initialize Prisma Client
export const prisma = new PrismaClient();

// Initialize Supabase client
export const supabase = new SupabaseClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
  {
    // We'll use the service role key for backend operations that require elevated privileges
    // But note: We should avoid using the service role key in client-side code.
    // For backend, we can create a separate Supabase client with the service role key when needed.
    // For simplicity, we'll initialize with anon key and use service role key in specific operations.
  }
);

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression()); // Compress responses

// Prevent NoSQL injection (if using MongoDB, but we're using PostgreSQL, so this is not needed.
// Keeping it as a precaution if we ever switch DBs, or if we use MongoDB-like operators in queries.)
// app.use(mongoSanitize);

// Prevent XSS attacks
app.use(xss());

// Prevent HTTP parameter pollution
app.use(hpp());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Initialize Socket.IO
initializeSocketIO(io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/recordings', recordingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/moderation', moderationRoutes);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

export { app, httpServer };
export default httpServer;