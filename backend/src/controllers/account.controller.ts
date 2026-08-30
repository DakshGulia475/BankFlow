import type { NextFunction, Request, Response } from 'express';
import * as accountService from '../services/account.service.js';
import { ApiError } from '../utils/ApiError.js';

function authenticatedUserId(req: Request): string {
  if (!req.user) {
    throw ApiError.unauthorized();
  }
  return req.user.id;
}

export async function createAccount(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const account = await accountService.createAccount(authenticatedUserId(req));
    res.status(201).json({ account });
  } catch (error) {
    next(error);
  }
}

export async function getMyAccount(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const account = await accountService.getAccountForUser(authenticatedUserId(req));
    res.status(200).json({ account });
  } catch (error) {
    next(error);
  }
}
