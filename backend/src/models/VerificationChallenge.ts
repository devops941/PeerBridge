import mongoose, { Schema, Document } from 'mongoose';

export interface IVerificationChallenge extends Document {
  email: string;
  purpose: 'email_verification' | 'password_reset';
  otpHash: string;
  attempts: number;
  resendAvailableAt: Date;
  expiresAt: Date;
  resetAuthorizationToken?: string;
  isConsumed: boolean;
  createdAt: Date;
}

const VerificationChallengeSchema = new Schema<IVerificationChallenge>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    purpose: {
      type: String,
      enum: ['email_verification', 'password_reset'],
      required: true
    },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    resendAvailableAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // MongoDB TTL auto-cleanup
    resetAuthorizationToken: { type: String, index: true },
    isConsumed: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const VerificationChallenge = mongoose.model<IVerificationChallenge>(
  'VerificationChallenge',
  VerificationChallengeSchema
);
