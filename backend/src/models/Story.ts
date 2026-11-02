import mongoose, { Schema, Document } from 'mongoose';

export interface IStoryComment {
  _id?: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
}

export interface IStory extends Document {
  user: mongoose.Types.ObjectId;
  mediaUrl: string;
  mediaType: 'image' | 'text';
  caption?: string;
  background?: string;
  likes: mongoose.Types.ObjectId[];
  comments: IStoryComment[];
  views: mongoose.Types.ObjectId[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StoryCommentSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const StorySchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    mediaUrl: {
      type: String,
      required: true
    },
    mediaType: {
      type: String,
      enum: ['image', 'text'],
      default: 'image'
    },
    caption: {
      type: String,
      trim: true,
      maxlength: 300,
      default: ''
    },
    background: {
      type: String,
      default: ''
    },
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    comments: [StoryCommentSchema],
    views: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from creation
      index: { expireAfterSeconds: 0 } // Automatic MongoDB TTL deletion
    }
  },
  {
    timestamps: true
  }
);

StorySchema.index({ user: 1, createdAt: -1 });

export const Story = mongoose.model<IStory>('Story', StorySchema);
