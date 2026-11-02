import mongoose, { Schema, Document } from 'mongoose';

export type DoubtStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface IDoubt extends Document {
  title: string;
  subject: string;
  topic?: string;
  question: string;
  codeSnippet?: string;
  codeLanguage?: string;
  attachments: string[];
  videoUrl?: string;
  videoDuration?: number;
  videoThumbnail?: string;
  tags: string[];
  author: mongoose.Types.ObjectId;
  status: DoubtStatus;
  volunteerCount: number;
  answerCount: number;
  acceptedAnswerId?: mongoose.Types.ObjectId;
  viewsCount: number;
  upvotes: mongoose.Types.ObjectId[];
  upvoteCount: number;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DoubtSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    subject: { type: String, required: true, trim: true, index: true },
    topic: { type: String, trim: true, default: '' },
    question: { type: String, required: true, trim: true },
    codeSnippet: { type: String, default: '' },
    codeLanguage: { type: String, default: 'text' },
    attachments: [{ type: String }],
    videoUrl: { type: String, default: '' },
    videoDuration: { type: Number, default: 0 },
    videoThumbnail: { type: String, default: '' },
    tags: [{ type: String, trim: true, lowercase: true }],
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
      default: 'OPEN',
      index: true
    },
    volunteerCount: { type: Number, default: 0 },
    answerCount: { type: Number, default: 0 },
    upvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    upvoteCount: { type: Number, default: 0 },
    acceptedAnswerId: { type: Schema.Types.ObjectId, ref: 'Answer' },
    viewsCount: { type: Number, default: 0 },
    resolvedAt: { type: Date }
  },
  { timestamps: true }
);

// Compound text index for fast search queries
DoubtSchema.index({
  title: 'text',
  question: 'text',
  topic: 'text',
  tags: 'text'
});

export const Doubt = mongoose.model<IDoubt>('Doubt', DoubtSchema);
