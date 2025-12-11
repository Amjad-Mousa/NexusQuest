import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion extends Document {
  title: string;
  content: string;
  author: mongoose.Types.ObjectId;
  tags: string[];
  programmingLanguage?: string;
  codeSnippet?: string;
  upvotes: mongoose.Types.ObjectId[];
  downvotes: mongoose.Types.ObjectId[];
  views: number;
  answersCount: number;
  isResolved: boolean;
  acceptedAnswer?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
      maxlength: 10000,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
    programmingLanguage: {
      type: String,
      enum: ['javascript', 'python', 'java', 'cpp', 'general'],
      default: 'general',
    },
    codeSnippet: {
      type: String,
      maxlength: 5000,
    },
    upvotes: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    downvotes: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    views: {
      type: Number,
      default: 0,
    },
    answersCount: {
      type: Number,
      default: 0,
    },
    isResolved: {
      type: Boolean,
      default: false,
    },
    acceptedAnswer: {
      type: Schema.Types.ObjectId,
      ref: 'Answer',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
QuestionSchema.index({ author: 1 });
QuestionSchema.index({ tags: 1 });
QuestionSchema.index({ programmingLanguage: 1 });
QuestionSchema.index({ createdAt: -1 });
QuestionSchema.index({ title: 'text', content: 'text' });

// Virtual for vote score
QuestionSchema.virtual('voteScore').get(function () {
  return this.upvotes.length - this.downvotes.length;
});

QuestionSchema.set('toJSON', { virtuals: true });
QuestionSchema.set('toObject', { virtuals: true });

export const Question = mongoose.model<IQuestion>('Question', QuestionSchema);
