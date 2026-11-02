export type UserType = 'student' | 'professional' | 'mentor' | 'alumni';

export interface EducationEntry {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startYear: string;
  endYear: string;
  grade?: string;
  description?: string;
}

export interface ExperienceEntry {
  id: string;
  title: string;
  company: string;
  location?: string;
  startDate: string;
  endDate: string;
  description?: string;
}

export interface ProjectEntry {
  id: string;
  title: string;
  tag: string;
  description?: string;
  link?: string;
  stars?: number;
  collaborators?: number;
  image?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'tutor' | 'both' | 'admin';
  userType?: UserType;
  headline?: string;
  avatar: string;
  college?: string;
  department?: string;
  yearOfStudy?: number;
  semester?: number;
  studentId?: string;
  campusLocation?: string;
  bio?: string;
  education?: EducationEntry[];
  experience?: ExperienceEntry[];
  projects?: ProjectEntry[];
  learningCredits?: number;
  rating: number;
  reviewCount: number;
  coursesCount?: number;
  studentsCount?: number;
  subjects?: string[];
  skills?: string[];
  learningInterests?: string[];
  canExplainSubjects?: string[];
  preferredLanguage?: string;
  learningGoals?: string;
  isEmailVerified?: boolean;
}

export interface SubjectItem {
  _id: string;
  name: string;
  category: string;
  code?: string;
  iconName?: string;
  description?: string;
  doubtCount?: number;
  volunteerCount?: number;
}

export type DoubtStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface DoubtItem {
  _id: string;
  title: string;
  subject: string;
  topic?: string;
  question: string;
  codeSnippet?: string;
  codeLanguage?: string;
  attachments?: string[];
  videoUrl?: string;
  videoDuration?: number;
  videoThumbnail?: string;
  tags: string[];
  author: {
    _id: string;
    name: string;
    avatar?: string;
    college?: string;
    department?: string;
  };
  status: DoubtStatus;
  volunteerCount: number;
  answerCount: number;
  upvotes?: string[];
  upvoteCount?: number;
  acceptedAnswerId?: string;
  hasVolunteered?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TutorItem {
  _id: string;
  name: string;
  email: string;
  avatar: string;
  department: string;
  college: string;
  subjects: string[];
  skills: string[];
  rating: number;
  reviewCount: number;
  coursesCount: number;
  studentsCount: number;
  hourlyRateCredits: number;
  bio: string;
}

export interface SessionItem {
  _id: string;
  studentId: {
    _id: string;
    name: string;
    avatar: string;
  };
  tutorId: {
    _id: string;
    name: string;
    avatar: string;
    department: string;
    rating: number;
  };
  subject: string;
  topic: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  scheduledDate: string;
  durationMins: number;
  creditCost: number;
  meetingLink?: string;
  notes?: string;
  rating?: number;
  reviewText?: string;
}

export interface ChatMessage {
  _id: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: 'text' | 'audio' | 'image' | 'video' | 'file';
  mediaUrl?: string;
  mediaDuration?: number;
  fileSize?: number;
  audioDuration?: string;
  createdAt: string;
}

export interface QuizQuestion {
  questionNumber: number;
  questionText: string;
  options: {
    key: string;
    text: string;
  }[];
  correctKey: string;
  explanation: string;
}

export interface QuizItem {
  _id: string;
  title: string;
  subject: string;
  category: string;
  totalTimeSeconds: number;
  questions: QuizQuestion[];
}

export interface CreditTx {
  _id: string;
  amount: number;
  type: 'earned' | 'spent' | 'bonus' | 'refund';
  description: string;
  balanceAfter: number;
  createdAt: string;
}

export interface StoryCommentItem {
  _id?: string;
  user: {
    _id: string;
    name: string;
    avatar?: string;
  };
  text: string;
  createdAt: string;
}

export interface StoryItem {
  _id: string;
  user: {
    _id: string;
    name: string;
    avatar?: string;
    department?: string;
    college?: string;
  };
  mediaUrl: string;
  mediaType: 'image' | 'text';
  caption?: string;
  background?: string;
  likes: string[];
  comments: StoryCommentItem[];
  views: string[];
  isLiked?: boolean;
  likesCount?: number;
  commentsCount?: number;
  isViewed?: boolean;
  expiresAt: string;
  createdAt: string;
}

export interface StoryGroup {
  user: {
    _id: string;
    name: string;
    avatar?: string;
    department?: string;
    college?: string;
  };
  isMine: boolean;
  hasUnseen: boolean;
  latestCreatedAt: string;
  stories: StoryItem[];
}

