// src/middleware/auth.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';

export interface AuthRequest extends Request {
  user: IUser;
}

type AuthMiddleware = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export const auth: AuthMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      console.log('No token provided');
      res.status(401).json({ message: 'No token, authorization denied' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    console.log('Decoded token:', decoded);

    if (typeof decoded === 'object' && 'userId' in decoded) {
      const user = await User.findById(decoded.userId).select('-password');
      if (!user) {
        console.log('User not found for token');
        res.status(401).json({ message: 'Invalid token' });
        return;
      }
      (req as AuthRequest).user = user;
      next();
    } else {
      console.log('Invalid token payload');
      res.status(401).json({ message: 'Invalid token payload' });
    }
  } catch (err) {
    if (err instanceof Error) {
      console.log('Token verification failed:', err.message);
    } else {
      console.log('Token verification failed:', err);
    }
    res.status(401).json({ message: 'Token is not valid' });
  }
};
