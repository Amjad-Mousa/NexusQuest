import mongoose, { Document, Schema } from 'mongoose';

export type TaskDifficulty = 'easy' | 'medium' | 'hard';
export type TaskLanguage = 'python' | 'javascript' | 'java' | 'cpp';

export interface ITask extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  points: number;
  difficulty: TaskDifficulty;
  language: TaskLanguage;
  createdBy: mongoose.Types.ObjectId;
  starterCode?: string;
  solution?: string; // Correct answer - only visible to the teacher who created the task
  testCases?: {
    input: string;
    expectedOutput: string;
    isHidden: boolean;
  }[];
  assignedTo?: mongoose.Types.ObjectId[]; // Empty array = all students
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Task description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    points: {
      type: Number,
      required: [true, 'Points are required'],
      min: [1, 'Points must be at least 1'],
      max: [1000, 'Points cannot exceed 1000'],
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      required: [true, 'Difficulty is required'],
    },
    language: {
      type: String,
      enum: ['python', 'javascript', 'java', 'cpp'],
      default: 'python',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Task must have a creator'],
      index: true,
    },
    starterCode: {
      type: String,
      default: '',
    },
    solution: {
      type: String,
      default: '',
      select: false, // Don't include in queries by default for security
    },
    testCases: [
      {
        input: { type: String, default: '' },
        expectedOutput: { type: String, required: true },
        isHidden: { type: Boolean, default: false },
      },
    ],
    assignedTo: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
taskSchema.index({ createdBy: 1, createdAt: -1 });
taskSchema.index({ difficulty: 1 });
taskSchema.index({ language: 1 });

export const Task = mongoose.model<ITask>('Task', taskSchema);

