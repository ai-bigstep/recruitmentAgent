// middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';

export const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error('❌ Error:', err);

  res.status(statusCode).json({
    status: 'error',
    message,
  });
};
