import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const app: Express = express();

// Configuration
const PORT = process.env.GATEWAY_PORT || 3001;

// Service URLs (internal Docker network)
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:4001';
const MEETING_SERVICE_URL = process.env.MEETING_SERVICE_URL || 'http://meeting-service:4002';
const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:4003';
const MODERATION_SERVICE_URL = process.env.MODERATION_SERVICE_URL || 'http://moderation-service:4004';

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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

// Proxy routes to internal services
// Auth service
app.use('/api/auth', createProxyMiddleware({
  target: AUTH_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/auth': '' },
  logger: console
}));

// Meeting service
app.use('/api/meetings', createProxyMiddleware({
  target: MEETING_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/meetings': '' },
  logger: console
}));

// Analytics service
app.use('/api/analytics', createProxyMiddleware({
  target: ANALYTICS_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/analytics': '' },
  logger: console
}));

// Moderation service
app.use('/api/moderation', createProxyMiddleware({
  target: MODERATION_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/moderation': '' },
  logger: console
}));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'OK', 
    service: 'api-gateway',
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
  logger.error(`Gateway Error: ${err.message}`);
  res.status(500).json({ 
    success: false, 
    error: 'Internal Server Error' 
  });
});

export { app };
export default app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
});