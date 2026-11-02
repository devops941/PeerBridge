import mongoose, { Schema, Document } from 'mongoose';

export interface ICreditTransaction extends Document {
  userId: mongoose.Types.ObjectId;
  amount: number;
  type: 'earned' | 'spent' | 'bonus' | 'refund';
  description: string;
  sessionId?: mongoose.Types.ObjectId;
  balanceAfter: number;
  createdAt: Date;
}

const CreditTransactionSchema: Schema = new Schema<ICreditTransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['earned', 'spent', 'bonus', 'refund'], required: true },
    description: { type: String, required: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session' },
    balanceAfter: { type: Number, required: true }
  },
  { timestamps: true }
);

export const CreditTransaction = mongoose.model<ICreditTransaction>('CreditTransaction', CreditTransactionSchema);
