import { request } from './apiClient';
import type { Account, Transaction, User } from '../types/api';

export const authApi = {
  register: (input: { name: string; email: string; password: string }) =>
    request<{ user: User }>('/api/auth/register', { method: 'POST', body: input }),
  login: (input: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/api/auth/login', { method: 'POST', body: input }),
  me: (token: string) => request<{ user: User }>('/api/auth/me', { token }),
};

export const accountApi = {
  create: (token: string) => request<{ account: Account }>('/api/accounts', { method: 'POST', token }),
  me: (token: string) => request<{ account: Account }>('/api/accounts/me', { token }),
};

type TransactionResult = { balance: number; transaction: Transaction };

export const transactionApi = {
  deposit: (token: string, amount: number) =>
    request<TransactionResult>('/api/transactions/deposit', { method: 'POST', body: { amount }, token }),
  withdraw: (token: string, amount: number) =>
    request<TransactionResult>('/api/transactions/withdraw', { method: 'POST', body: { amount }, token }),
  transfer: (token: string, toAccountNumber: string, amount: number) =>
    request<TransactionResult>('/api/transactions/transfer', {
      method: 'POST',
      body: { toAccountNumber, amount },
      token,
    }),
  history: (token: string) => request<{ transactions: Transaction[] }>('/api/transactions', { token }),
};
