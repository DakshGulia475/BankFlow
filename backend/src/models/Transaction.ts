import { Schema, model, type InferSchemaType } from 'mongoose';

export const TRANSACTION_TYPES = ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER'] as const;
export const TRANSACTION_STATUSES = ['SUCCESS', 'FAILED'] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

const transactionSchema = new Schema(
  {
    referenceId: { type: String, required: true, unique: true },
    type: { type: String, required: true, enum: TRANSACTION_TYPES },
    fromAccount: { type: String, default: null, index: true },
    toAccount: { type: String, default: null, index: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, required: true, enum: TRANSACTION_STATUSES, default: 'SUCCESS' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

transactionSchema.index({ createdAt: -1 });

export type Transaction = InferSchemaType<typeof transactionSchema>;

export const TransactionModel = model('Transaction', transactionSchema);
