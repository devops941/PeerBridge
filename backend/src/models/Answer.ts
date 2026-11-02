import mongoose, { Schema, Document } from 'mongoose';

export interface IAnswer extends Document {
  doubtId: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  content: string;
  codeSnippet?: string;
  codeLanguage?: string;
  isAccepted: boolean;
  helpfulCount: number;
  helpfulVotes: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const AnswerSchema: Schema = new Schema(
  {
    doubtId: { type: Schema.Types.ObjectId, ref: 'Doubt', required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, required: true, trim: true },
    codeSnippet: { type: String, default: '' },
    codeLanguage: { type: String, default: 'text' },
    isAccepted: { type: Boolean, default: false },
    helpfulCount: { type: Number, default: 0 },
    helpfulVotes: [{ type: Schema.Types.ObjectId, ref: 'User' }]
  },
  { timestamps: true }
);

AnswerSchema.index({ doubtId: 1, isAccepted: -1, helpfulCount: -1, createdAt: -1 });

export const Answer = mongoose.model<IAnswer>('Answer', AnswerSchema);
