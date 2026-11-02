import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion {
  questionNumber: number;
  questionText: string;
  options: {
    key: string; // 'A' | 'B' | 'C' | 'D'
    text: string;
  }[];
  correctKey: string;
  explanation: string;
}

export interface IQuiz extends Document {
  title: string;
  subject: string;
  category: string;
  totalTimeSeconds: number;
  questions: IQuestion[];
  createdAt: Date;
}

const QuestionSchema = new Schema({
  questionNumber: { type: Number, required: true },
  questionText: { type: String, required: true },
  options: [
    {
      key: { type: String, required: true },
      text: { type: String, required: true }
    }
  ],
  correctKey: { type: String, required: true },
  explanation: { type: String, default: '' }
});

const QuizSchema = new Schema<IQuiz>(
  {
    title: { type: String, required: true },
    subject: { type: String, required: true },
    category: { type: String, default: 'Engineering' },
    totalTimeSeconds: { type: Number, default: 120 },
    questions: [QuestionSchema]
  },
  { timestamps: true }
);

export const Quiz = mongoose.model<IQuiz>('Quiz', QuizSchema);
