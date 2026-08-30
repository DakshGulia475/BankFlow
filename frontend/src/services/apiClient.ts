import type { ApiErrorBody } from '../types/api';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000').replace(/\/$/, '');

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: { field: string; message: string }[];

  constructor(status: number, body: ApiErrorBody['error']) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.details = body.details;
  }

  /** Message plus per-field validation details, ready to show in a form. */
  get displayMessage(): string {
    if (!this.details?.length) {
      return this.message;
    }
    return this.details.map((d) => `${d.field}: ${d.message}`).join(', ');
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  token?: string | null;
};

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new ApiError(0, { code: 'NETWORK_ERROR', message: 'Could not reach the BankFlow API.' });
  }

  const text = await response.text();
  const payload: unknown = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const errorBody = (payload as Partial<ApiErrorBody>).error;
    throw new ApiError(
      response.status,
      errorBody ?? { code: 'UNKNOWN_ERROR', message: 'Something went wrong.' },
    );
  }

  return payload as T;
}
