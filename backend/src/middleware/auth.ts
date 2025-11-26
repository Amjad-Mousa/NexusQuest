import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'nexusquest-secret-key-change-in-production';

export interface AuthRequest extends Request {
  user?: IUser;
  userId?: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
}

export function generateToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email } as JwtPayload,
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'No token provided',
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = verifyToken(token);
      req.userId = decoded.userId;
      
      // Optionally fetch user from database
      const user = await User.findById(decoded.userId);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'User not found',
        });
        return;
      }
      
      req.user = user;
      next();
    } catch {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Authentication error',
    });
  }
}

// Optional auth middleware - doesn't require authentication but attaches user if token present
export async function optionalAuthMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      try {
        const decoded = verifyToken(token);
        req.userId = decoded.userId;
        
        const user = await User.findById(decoded.userId);
        if (user) {
          req.user = user;
        }
      } catch {
        // Token invalid, continue without user
      }
    }
    
    next();
  } catch {
    next();
  }
}

