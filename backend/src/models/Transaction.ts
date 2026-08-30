import { Schema, model, type InferSchemaType } from 'mongoose';

export const TRANSACTION_TYPES = ['deposit', 'withdrawal', 'transfer'] as const;
export const TRANSACTION_STATUSES = ['completed', 'failed'] as const;

const transactionSchema = new Schema(
  {
    referenceId: { type: String, required: true, unique: true },
    type: { type: String, required: true, enum: TRANSACTION_TYPES },
    fromAccount: { type: String, default: null, index: true },
    toAccount: { type: String, default: null, index: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, required: true, enum: TRANSACTION_STATUSES, default: 'completed' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

transactionSchema.index({ createdAt: -1 });

export type Transaction = InferSchemaType<typeof transactionSchema>;

export const TransactionModel = model('Transaction', transactionSchema);
