export type User = {
  id: string;
  name: string;
  email: string;
};

export type Account = {
  id: string;
  accountNumber: string;
  balance: number;
  createdAt: string;
};

export type TransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';

export type Transaction = {
  referenceId: string;
  type: TransactionType;
  fromAccount: string | null;
  toAccount: string | null;
  amount: number;
  status: string;
  createdAt: string;
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: { field: string; message: string }[];
  };
};
