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
