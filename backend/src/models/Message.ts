import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  sessionId?: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  content: string;
  type: 'text' | 'audio' | 'image' | 'video' | 'file';
  mediaUrl?: string;
  mediaDuration?: number;
  fileSize?: number;
  audioDuration?: string;
  isRead: boolean;
  createdAt: Date;
}

const MessageSchema: Schema = new Schema<IMessage>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session' },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    type: { type: String, enum: ['text', 'audio', 'image', 'video', 'file'], default: 'text' },
    mediaUrl: { type: String },
    mediaDuration: { type: Number },
    fileSize: { type: Number },
    audioDuration: { type: String },
    isRead: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
