import mongoose, { Schema, Document } from 'mongoose';

export interface IFollowRequest extends Document {
  sender: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: Date;
  updatedAt: Date;
}

const FollowRequestSchema: Schema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'DECLINED'],
      default: 'PENDING',
      index: true
    }
  },
  { timestamps: true }
);

// Prevent duplicate pending requests between the same users
FollowRequestSchema.index({ sender: 1, recipient: 1 });

export const FollowRequest = mongoose.model<IFollowRequest>('FollowRequest', FollowRequestSchema);
