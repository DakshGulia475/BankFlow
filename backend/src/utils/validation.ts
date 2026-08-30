import { ApiError } from './ApiError.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MIN_PASSWORD_LENGTH = 8;

export type FieldError = { field: string; message: string };

export function assertValid(errors: FieldError[]): void {
  if (errors.length > 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid request data', errors);
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateRegisterInput(body: unknown): {
  name: string;
  email: string;
  password: string;
} {
  const { name, email, password } = (body ?? {}) as Record<string, unknown>;
  const errors: FieldError[] = [];

  if (typeof name !== 'string' || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name is required' });
  }
  if (typeof email !== 'string' || email.trim().length === 0) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    errors.push({ field: 'email', message: 'Email must be a valid email address' });
  }
  if (typeof password !== 'string' || password.length === 0) {
    errors.push({ field: 'password', message: 'Password is required' });
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push({
      field: 'password',
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    });
  }

  assertValid(errors);

  return {
    name: (name as string).trim(),
    email: normalizeEmail(email as string),
    password: password as string,
  };
}

export const MAX_AMOUNT = 1_000_000_000;

export function validateAmount(value: unknown, field = 'amount'): number {
  const amount = typeof value === 'number' ? value : NaN;
  const errors: FieldError[] = [];

  if (!Number.isFinite(amount)) {
    errors.push({ field, message: 'Amount must be a number' });
  } else if (amount <= 0) {
    errors.push({ field, message: 'Amount must be greater than zero' });
  } else if (Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6) {
    errors.push({ field, message: 'Amount must have at most 2 decimal places' });
  } else if (amount > MAX_AMOUNT) {
    errors.push({ field, message: `Amount must not exceed ${MAX_AMOUNT}` });
  }

  assertValid(errors);
  return amount;
}

export function validateAccountNumber(value: unknown, field = 'toAccountNumber'): string {
  const errors: FieldError[] = [];
  if (typeof value !== 'string' || !/^\d{12}$/.test(value.trim())) {
    errors.push({ field, message: 'Account number must be 12 digits' });
  }
  assertValid(errors);
  return (value as string).trim();
}

export function validateLoginInput(body: unknown): { email: string; password: string } {
  const { email, password } = (body ?? {}) as Record<string, unknown>;
  const errors: FieldError[] = [];

  if (typeof email !== 'string' || email.trim().length === 0) {
    errors.push({ field: 'email', message: 'Email is required' });
  }
  if (typeof password !== 'string' || password.length === 0) {
    errors.push({ field: 'password', message: 'Password is required' });
  }

  assertValid(errors);

  return { email: normalizeEmail(email as string), password: password as string };
}
