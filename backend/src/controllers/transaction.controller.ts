import type { NextFunction, Request, Response } from 'express';
import * as transactionService from '../services/transaction.service.js';
import { ApiError } from '../utils/ApiError.js';
import { validateAccountNumber, validateAmount } from '../utils/validation.js';

function authenticatedUserId(req: Request): string {
  if (!req.user) {
    throw ApiError.unauthorized();
  }
  return req.user.id;
}

export async function deposit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const amount = validateAmount((req.body ?? {}).amount);
    const result = await transactionService.deposit(authenticatedUserId(req), amount);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function withdraw(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const amount = validateAmount((req.body ?? {}).amount);
    const result = await transactionService.withdraw(authenticatedUserId(req), amount);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function transfer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const toAccountNumber = validateAccountNumber(body.toAccountNumber);
    const amount = validateAmount(body.amount);
    const result = await transactionService.transfer(
      authenticatedUserId(req),
      toAccountNumber,
      amount,
    );
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function history(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const transactions = await transactionService.listTransactions(authenticatedUserId(req));
    res.status(200).json({ transactions });
  } catch (error) {
    next(error);
  }
}
