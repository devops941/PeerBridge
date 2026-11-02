import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRefreshTokenSession extends Document {
  userId: Types.ObjectId;
  tokenHash: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
  revokedAt?: Date;
  createdAt: Date;
}

const RefreshTokenSessionSchema = new Schema<IRefreshTokenSession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    userAgent: { type: String },
    ipAddress: { type: String },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    revokedAt: { type: Date }
  },
  { timestamps: true }
);

export const RefreshTokenSession = mongoose.model<IRefreshTokenSession>(
  'RefreshTokenSession',
  RefreshTokenSessionSchema
);
