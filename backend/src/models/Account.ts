import { Schema, model, type InferSchemaType } from 'mongoose';

const accountSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    accountNumber: { type: String, required: true, unique: true },
    balance: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export type Account = InferSchemaType<typeof accountSchema>;

export const AccountModel = model('Account', accountSchema);
