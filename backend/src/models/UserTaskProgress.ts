import mongoose, { Document, Schema } from 'mongoose';

export type TaskStatus = 'started' | 'completed';

export interface IUserTaskProgress extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  taskId: mongoose.Types.ObjectId;
  status: TaskStatus;
  code: string; // User's current code for this task
  startedAt: Date;
  completedAt?: Date;
}

const userTaskProgressSchema = new Schema<IUserTaskProgress>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      required: [true, 'Task ID is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['started', 'completed'],
      default: 'started',
    },
    code: {
      type: String,
      default: '',
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one progress record per user-task pair
userTaskProgressSchema.index({ userId: 1, taskId: 1 }, { unique: true });

// Index for faster queries
userTaskProgressSchema.index({ userId: 1, status: 1 });

export const UserTaskProgress = mongoose.model<IUserTaskProgress>('UserTaskProgress', userTaskProgressSchema);

