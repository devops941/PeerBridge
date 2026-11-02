import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
  studentId: mongoose.Types.ObjectId;
  tutorId: mongoose.Types.ObjectId;
  subject: string;
  topic: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  scheduledDate: Date;
  durationMins: number;
  creditCost: number;
  meetingLink?: string;
  notes?: string;
  rating?: number;
  reviewText?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema: Schema = new Schema<ISession>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tutorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    topic: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'],
      default: 'pending'
    },
    scheduledDate: { type: Date, required: true },
    durationMins: { type: Number, default: 45 },
    creditCost: { type: Number, default: 15 },
    meetingLink: { type: String, default: 'https://meet.peerbridge.edu/session-room' },
    notes: { type: String, default: '' },
    rating: { type: Number },
    reviewText: { type: String }
  },
  { timestamps: true }
);

export const Session = mongoose.model<ISession>('Session', SessionSchema);
