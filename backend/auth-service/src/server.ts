import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import authRoutes from './routes/auth';

// Load environment variables
dotenv.config();

const app: Express = express();

// Configuration
const PORT = process.env.AUTH_SERVICE_PORT || 4001;

// Initialize Supabase client (will be used in routes)
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.GATEWAY_URL || 'http://localhost:3001',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Routes
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'OK', 
    service: 'auth-service',
    timestamp: new Date().toISOString() 
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ 
    success: false, 
    error: 'Route not found' 
  });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Auth Service Error: ${err.message}`);
  res.status(500).json({ 
    success: false, 
    error: 'Internal Server Error' 
  });
});

export { app };
export default app.listen(PORT, () => {
  logger.info(`Auth Service running on port ${PORT}`);
});