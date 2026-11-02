import mongoose, { Schema, Document } from 'mongoose';

export type VolunteerStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN';

export interface IVolunteerRequest extends Document {
  doubtId: mongoose.Types.ObjectId;
  volunteerId: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  introMessage?: string;
  status: VolunteerStatus;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VolunteerRequestSchema: Schema = new Schema(
  {
    doubtId: { type: Schema.Types.ObjectId, ref: 'Doubt', required: true, index: true },
    volunteerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    introMessage: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN'],
      default: 'PENDING',
      index: true
    },
    respondedAt: { type: Date }
  },
  { timestamps: true }
);

// Prevent duplicate volunteer offers for the same doubt
VolunteerRequestSchema.index({ doubtId: 1, volunteerId: 1 }, { unique: true });

export const VolunteerRequest = mongoose.model<IVolunteerRequest>(
  'VolunteerRequest',
  VolunteerRequestSchema
);
