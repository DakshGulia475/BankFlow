import type { NextFunction, Request, Response } from 'express';
import * as authService from '../services/auth.service.js';
import { validateLoginInput, validateRegisterInput } from '../utils/validation.js';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.register(validateRegisterInput(req.body));
    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, user } = await authService.login(validateLoginInput(req.body));
    res.status(200).json({ token, user });
  } catch (error) {
    next(error);
  }
}

export function me(req: Request, res: Response): void {
  res.status(200).json({ user: req.user });
}
