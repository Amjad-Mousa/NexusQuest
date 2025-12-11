import mongoose, { Schema, Document } from 'mongoose';

export interface IAnswer extends Document {
  content: string;
  author: mongoose.Types.ObjectId;
  question: mongoose.Types.ObjectId;
  codeSnippet?: string;
  upvotes: mongoose.Types.ObjectId[];
  downvotes: mongoose.Types.ObjectId[];
  isAccepted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AnswerSchema = new Schema<IAnswer>(
  {
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
    question: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
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
    isAccepted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
AnswerSchema.index({ question: 1 });
AnswerSchema.index({ author: 1 });
AnswerSchema.index({ createdAt: -1 });

// Virtual for vote score
AnswerSchema.virtual('voteScore').get(function () {
  return this.upvotes.length - this.downvotes.length;
});

AnswerSchema.set('toJSON', { virtuals: true });
AnswerSchema.set('toObject', { virtuals: true });

export const Answer = mongoose.model<IAnswer>('Answer', AnswerSchema);
