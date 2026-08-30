import { randomUUID } from 'node:crypto';
import mongoose, { type ClientSession } from 'mongoose';
import { AccountModel } from '../models/Account.js';
import { TransactionModel, type TransactionType } from '../models/Transaction.js';
import { ApiError } from '../utils/ApiError.js';
import { roundMoney } from '../utils/money.js';

export type PublicTransaction = {
  referenceId: string;
  type: TransactionType;
  fromAccount: string | null;
  toAccount: string | null;
  amount: number;
  status: string;
  createdAt: Date;
};

type TransactionDocument = {
  referenceId: string;
  type: string;
  fromAccount?: string | null;
  toAccount?: string | null;
  amount: number;
  status: string;
  createdAt: Date;
};

function toPublicTransaction(transaction: TransactionDocument): PublicTransaction {
  return {
    referenceId: transaction.referenceId,
    type: transaction.type as TransactionType,
    fromAccount: transaction.fromAccount ?? null,
    toAccount: transaction.toAccount ?? null,
    amount: transaction.amount,
    status: transaction.status,
    createdAt: transaction.createdAt,
  };
}

function newReferenceId(): string {
  return `TXN-${randomUUID()}`;
}

let transactionSupport: Promise<boolean> | null = null;

/**
 * MongoDB multi-document transactions require a replica set or sharded cluster;
 * a standalone server rejects them.
 */
export async function supportsMongoTransactions(): Promise<boolean> {
  transactionSupport ??= (async () => {
    try {
      const admin = mongoose.connection.db?.admin();
      if (!admin) return false;
      const hello = (await admin.command({ hello: 1 })) as { setName?: string; msg?: string };
      return Boolean(hello.setName) || hello.msg === 'isdbgrid';
    } catch {
      return false;
    }
  })();
  return transactionSupport;
}

export function resetTransactionSupportCache(): void {
  transactionSupport = null;
}

async function withSession<T>(work: (session: ClientSession | undefined) => Promise<T>): Promise<T> {
  if (!(await supportsMongoTransactions())) {
    return work(undefined);
  }

  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(() => work(session));
  } finally {
    await session.endSession();
  }
}

async function requireOwnAccountNumber(
  userId: string,
  session?: ClientSession,
): Promise<string> {
  const account = await AccountModel.findOne({ userId }, { accountNumber: 1 }, { session });
  if (!account) {
    throw ApiError.notFound('Account not found');
  }
  return account.accountNumber;
}

/** $inc accumulates binary floating point error; re-store the value rounded to cents. */
async function settleBalance(
  accountId: unknown,
  rawBalance: number,
  session?: ClientSession,
): Promise<number> {
  const balance = roundMoney(rawBalance);
  if (balance !== rawBalance) {
    await AccountModel.updateOne({ _id: accountId }, { $set: { balance } }, { session });
  }
  return balance;
}

async function recordTransaction(
  input: {
    type: TransactionType;
    fromAccount: string | null;
    toAccount: string | null;
    amount: number;
  },
  session?: ClientSession,
): Promise<PublicTransaction> {
  const [transaction] = await TransactionModel.create(
    [{ ...input, referenceId: newReferenceId(), status: 'SUCCESS' }],
    { session },
  );
  return toPublicTransaction(transaction);
}

export async function deposit(
  userId: string,
  amount: number,
): Promise<{ balance: number; transaction: PublicTransaction }> {
  return withSession(async (session) => {
    const account = await AccountModel.findOneAndUpdate(
      { userId },
      { $inc: { balance: amount } },
      { new: true, session },
    );
    if (!account) {
      throw ApiError.notFound('Account not found');
    }

    const balance = await settleBalance(account._id, account.balance, session);

    const transaction = await recordTransaction(
      { type: 'DEPOSIT', fromAccount: null, toAccount: account.accountNumber, amount },
      session,
    );

    return { balance, transaction };
  });
}

export async function withdraw(
  userId: string,
  amount: number,
): Promise<{ balance: number; transaction: PublicTransaction }> {
  return withSession(async (session) => {
    const account = await AccountModel.findOneAndUpdate(
      { userId, balance: { $gte: amount } },
      { $inc: { balance: -amount } },
      { new: true, session },
    );

    if (!account) {
      await requireOwnAccountNumber(userId, session);
      throw new ApiError(422, 'INSUFFICIENT_FUNDS', 'Insufficient balance');
    }

    const balance = await settleBalance(account._id, account.balance, session);

    const transaction = await recordTransaction(
      { type: 'WITHDRAWAL', fromAccount: account.accountNumber, toAccount: null, amount },
      session,
    );

    return { balance, transaction };
  });
}

export async function transfer(
  userId: string,
  toAccountNumber: string,
  amount: number,
): Promise<{ balance: number; transaction: PublicTransaction }> {
  return withSession(async (session) => {
    const source = await AccountModel.findOne({ userId }, undefined, { session });
    if (!source) {
      throw ApiError.notFound('Account not found');
    }
    if (source.accountNumber === toAccountNumber) {
      throw ApiError.badRequest('Cannot transfer to the same account');
    }

    const destination = await AccountModel.findOne(
      { accountNumber: toAccountNumber },
      { accountNumber: 1 },
      { session },
    );
    if (!destination) {
      throw ApiError.notFound('Destination account not found');
    }

    const debited = await AccountModel.findOneAndUpdate(
      { _id: source._id, balance: { $gte: amount } },
      { $inc: { balance: -amount } },
      { new: true, session },
    );
    if (!debited) {
      throw new ApiError(422, 'INSUFFICIENT_FUNDS', 'Insufficient balance');
    }

    const credited = await AccountModel.findOneAndUpdate(
      { _id: destination._id },
      { $inc: { balance: amount } },
      { new: true, session },
    );
    if (!credited) {
      throw ApiError.notFound('Destination account not found');
    }

    const balance = await settleBalance(debited._id, debited.balance, session);
    await settleBalance(credited._id, credited.balance, session);

    const transaction = await recordTransaction(
      {
        type: 'TRANSFER',
        fromAccount: source.accountNumber,
        toAccount: destination.accountNumber,
        amount,
      },
      session,
    );

    return { balance, transaction };
  });
}

export async function listTransactions(userId: string): Promise<PublicTransaction[]> {
  const accountNumber = await requireOwnAccountNumber(userId);
  const transactions = await TransactionModel.find({
    $or: [{ fromAccount: accountNumber }, { toAccount: accountNumber }],
  })
    .sort({ createdAt: -1, _id: -1 })
    .lean();

  return transactions.map(toPublicTransaction);
}
