import mongoose, { Document, Schema } from 'mongoose';

export interface IFile {
  _id: mongoose.Types.ObjectId;
  name: string;
  content: string;
  language: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProject extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  owner: mongoose.Types.ObjectId;
  language: string;
  files: IFile[];
  createdAt: Date;
  updatedAt: Date;
}

const fileSchema = new Schema<IFile>(
  {
    name: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
    },
    content: {
      type: String,
      default: '',
    },
    language: {
      type: String,
      default: 'python',
    },
  },
  {
    timestamps: true,
  }
);

const projectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      minlength: [1, 'Project name must be at least 1 character'],
      maxlength: [100, 'Project name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Project must have an owner'],
      index: true,
    },
    language: {
      type: String,
      enum: ['python', 'javascript', 'java', 'cpp'],
      default: 'python',
    },
    files: [fileSchema],
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
projectSchema.index({ owner: 1, name: 1 });

export const Project = mongoose.model<IProject>('Project', projectSchema);

