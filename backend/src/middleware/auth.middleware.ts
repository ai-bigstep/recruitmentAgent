import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Define the shape of the user data you store in JWT
interface JwtPayload {
  id: string;
  email?: string;
  role?: string;
}

// Extend Express's Request interface
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    console.warn('⚠️ No token provided');
    return res.status(401).json({ message: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET as string, (err, decoded) => {
    if (err) {
      console.error('❌ Invalid token:', err.message);
      return res.status(403).json({ message: 'Invalid token' });
    }

    req.user = decoded as JwtPayload;
    next();
  });
};

export function requireRole(role: string) {
  return (req: any, res: any, next: any) => {
    if (req.user && req.user.role === role) {
      return next();
    }
    return res.status(403).json({ message: 'Forbidden: Insufficient role' });
  };
}