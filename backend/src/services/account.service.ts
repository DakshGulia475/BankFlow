import { randomInt } from 'node:crypto';
import { AccountModel } from '../models/Account.js';
import { ApiError } from '../utils/ApiError.js';

const ACCOUNT_NUMBER_LENGTH = 12;
const MAX_GENERATION_ATTEMPTS = 5;

export type PublicAccount = {
  id: string;
  accountNumber: string;
  balance: number;
  createdAt: Date;
};

function toPublicAccount(account: {
  _id: unknown;
  accountNumber: string;
  balance: number;
  createdAt: Date;
}): PublicAccount {
  return {
    id: String(account._id),
    accountNumber: account.accountNumber,
    balance: account.balance,
    createdAt: account.createdAt,
  };
}

function randomAccountNumber(): string {
  let digits = '';
  while (digits.length < ACCOUNT_NUMBER_LENGTH) {
    digits += String(randomInt(0, 10));
  }
  return digits;
}

async function generateAccountNumber(): Promise<string> {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const candidate = randomAccountNumber();
    if (!(await AccountModel.exists({ accountNumber: candidate }))) {
      return candidate;
    }
  }
  throw new ApiError(503, 'ACCOUNT_NUMBER_UNAVAILABLE', 'Could not allocate an account number');
}

export async function createAccount(userId: string): Promise<PublicAccount> {
  if (await AccountModel.exists({ userId })) {
    throw ApiError.conflict('User already has an account');
  }

  try {
    const account = await AccountModel.create({
      userId,
      accountNumber: await generateAccountNumber(),
      balance: 0,
    });
    return toPublicAccount(account);
  } catch (error) {
    if (typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000) {
      throw ApiError.conflict('User already has an account');
    }
    throw error;
  }
}

export async function getAccountForUser(userId: string): Promise<PublicAccount> {
  const account = await AccountModel.findOne({ userId });
  if (!account) {
    throw ApiError.notFound('Account not found');
  }
  return toPublicAccount(account);
}
