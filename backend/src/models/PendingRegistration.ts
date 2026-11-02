import mongoose, { Schema, Document } from 'mongoose';

export interface IPendingRegistration extends Document {
  registrationId: string;
  type: 'email_password' | 'google_oauth';
  email: string;
  name?: string;
  passwordHash?: string;
  googleSub?: string;
  googleAvatar?: string;
  expiresAt: Date;
  createdAt: Date;
}

const PendingRegistrationSchema = new Schema<IPendingRegistration>(
  {
    registrationId: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ['email_password', 'google_oauth'], required: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    name: { type: String, trim: true },
    passwordHash: { type: String },
    googleSub: { type: String },
    googleAvatar: { type: String },
    expiresAt: { type: Date, required: true, index: { expires: 0 } } // MongoDB TTL: deletes when current time >= expiresAt
  },
  { timestamps: true }
);

export const PendingRegistration = mongoose.model<IPendingRegistration>(
  'PendingRegistration',
  PendingRegistrationSchema
);
