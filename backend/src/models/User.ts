import mongoose, { Schema, Document } from 'mongoose';

export interface IEducation {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startYear: string;
  endYear: string;
  grade?: string;
  description?: string;
}

export interface IExperience {
  id: string;
  title: string;
  company: string;
  location?: string;
  startDate: string;
  endDate: string;
  description?: string;
}

export interface IProject {
  id: string;
  title: string;
  tag: string;
  description?: string;
  link?: string;
  stars?: number;
  collaborators?: number;
  image?: string;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: 'student' | 'tutor' | 'both' | 'admin';
  userType: 'student' | 'professional' | 'mentor' | 'alumni';
  headline?: string;
  status: 'active' | 'pending' | 'suspended';
  isEmailVerified: boolean;
  avatar: string;
  college?: string;
  department?: string;
  yearOfStudy?: number;
  semester?: number;
  studentId?: string;
  campusLocation?: string;
  bio?: string;
  education: IEducation[];
  experience: IExperience[];
  projects: IProject[];
  subjects: string[];
  skills: string[];
  learningInterests: string[];
  canExplainSubjects: string[];
  preferredLanguage?: string;
  learningGoals?: string;
  hourlyRateCredits: number;
  learningCredits: number;
  rating: number;
  reviewCount: number;
  coursesCount: number;
  studentsCount: number;
  isVerified: boolean; // legacy badge flag
  pushToken?: string;
  passwordChangedAt?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EducationSchema = new Schema(
  {
    id: { type: String, default: () => `edu_${Date.now()}` },
    institution: { type: String, required: true, trim: true },
    degree: { type: String, required: true, trim: true },
    fieldOfStudy: { type: String, default: '', trim: true },
    startYear: { type: String, default: '', trim: true },
    endYear: { type: String, default: 'Present', trim: true },
    grade: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true }
  },
  { _id: false }
);

const ExperienceSchema = new Schema(
  {
    id: { type: String, default: () => `exp_${Date.now()}` },
    title: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    location: { type: String, default: '', trim: true },
    startDate: { type: String, default: '', trim: true },
    endDate: { type: String, default: 'Present', trim: true },
    description: { type: String, default: '', trim: true }
  },
  { _id: false }
);

const ProjectSchema = new Schema(
  {
    id: { type: String, default: () => `proj_${Date.now()}` },
    title: { type: String, required: true, trim: true },
    tag: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    link: { type: String, default: '', trim: true },
    stars: { type: Number, default: 0 },
    collaborators: { type: Number, default: 1 },
    image: { type: String, default: '' }
  },
  { _id: false }
);

const UserSchema: Schema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: false },
    role: { type: String, enum: ['student', 'tutor', 'both', 'admin'], default: 'both' },
    userType: {
      type: String,
      enum: ['student', 'professional', 'mentor', 'alumni'],
      default: 'student'
    },
    headline: { type: String, default: '' },
    status: { type: String, enum: ['active', 'pending', 'suspended'], default: 'active' },
    isEmailVerified: { type: Boolean, default: false },
    avatar: {
      type: String,
      default: ''
    },
    college: { type: String, default: '' },
    department: { type: String, default: '' },
    yearOfStudy: { type: Number },
    semester: { type: Number },
    studentId: { type: String, default: '' },
    campusLocation: { type: String, default: '' },
    bio: {
      type: String,
      default: ''
    },
    education: { type: [EducationSchema], default: [] },
    experience: { type: [ExperienceSchema], default: [] },
    projects: { type: [ProjectSchema], default: [] },
    subjects: [{ type: String }],
    skills: [{ type: String }],
    learningInterests: [{ type: String }],
    canExplainSubjects: [{ type: String }],
    preferredLanguage: { type: String, default: 'English' },
    learningGoals: { type: String, default: '' },
    hourlyRateCredits: { type: Number, default: 15 },
    learningCredits: { type: Number, default: 50 },
    rating: { type: Number, default: 4.8 },
    reviewCount: { type: Number, default: 12 },
    coursesCount: { type: Number, default: 4 },
    studentsCount: { type: Number, default: 35 },
    isVerified: { type: Boolean, default: true },
    pushToken: { type: String },
    passwordChangedAt: { type: Date },
    lastLoginAt: { type: Date }
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
