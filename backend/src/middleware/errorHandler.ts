import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../shared-types/src/index';

/**
 * Error handling middleware
 * Catches all errors and formats them as JSON responses
 */
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);

  // Default error status code
  const statusCode = err.statusCode || 500;
  
  // Default error message
  const message = err.message || 'Internal Server Error';

  // Don't leak stack trace in production
  const response: ApiResponse<null> = {
    success: false,
    error: message,
  };

  // Include stack trace in development only
  if (process.env.NODE_ENV !== 'production') {
    // We could add debug info here, but for security we'll keep it minimal
    // response.debug = { stack: err.stack };
  }

  res.status(statusCode).json(response);
};

/**
 * 404 Not Found middleware
 * Handles requests to undefined routes
 */
export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: error.message,
  } as ApiResponse<null>);
};

export { errorHandler, notFound };