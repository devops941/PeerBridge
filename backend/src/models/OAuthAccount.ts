import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IOAuthAccount extends Document {
  userId: Types.ObjectId;
  provider: 'google';
  providerId: string; // Google subject identifier (sub)
  email: string;
  linkedAt: Date;
}

const OAuthAccountSchema = new Schema<IOAuthAccount>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: String, enum: ['google'], required: true },
    providerId: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    linkedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// Compound index to ensure uniqueness per provider + providerId
OAuthAccountSchema.index({ provider: 1, providerId: 1 }, { unique: true });

export const OAuthAccount = mongoose.model<IOAuthAccount>('OAuthAccount', OAuthAccountSchema);
