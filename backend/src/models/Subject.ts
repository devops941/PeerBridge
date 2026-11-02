import mongoose, { Schema, Document } from 'mongoose';

export interface ISubject extends Document {
  name: string;
  category: string;
  code?: string;
  iconName?: string;
  description?: string;
  doubtCount: number;
  volunteerCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SubjectSchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: [
        'Computer Science & IT',
        'Mathematics & Statistics',
        'Electronics & Electrical',
        'Mechanical & Civil',
        'Physics & Chemistry',
        'Business & Economics',
        'General Studies'
      ],
      default: 'Computer Science & IT'
    },
    code: { type: String, trim: true },
    iconName: { type: String, default: 'book-outline' },
    description: { type: String, default: '' },
    doubtCount: { type: Number, default: 0 },
    volunteerCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

SubjectSchema.index({ name: 'text', category: 'text' });

export const Subject = mongoose.model<ISubject>('Subject', SubjectSchema);
