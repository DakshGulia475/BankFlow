import type { NextFunction, Request, Response } from 'express';
import { UserModel } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { verifyToken } from '../services/auth.service.js';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; name: string; email: string };
    }
  }
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.get('authorization');
    if (!header?.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Authentication required');
    }

    const { sub } = verifyToken(header.slice('Bearer '.length).trim());
    const user = await UserModel.findById(sub).catch(() => null);
    if (!user) {
      throw ApiError.unauthorized('Invalid or expired token');
    }

    req.user = { id: String(user._id), name: user.name, email: user.email };
    next();
  } catch (error) {
    next(error);
  }
}
