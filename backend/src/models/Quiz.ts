import mongoose, { Document, Schema } from 'mongoose';

export type QuizDifficulty = 'easy' | 'medium' | 'hard';
export type QuizLanguage = 'python' | 'javascript' | 'java' | 'cpp';
export type QuizStatus = 'draft' | 'scheduled' | 'active' | 'ended';

export interface IQuiz extends Document {
    _id: mongoose.Types.ObjectId;
    title: string;
    description: string;
    points: number;
    difficulty: QuizDifficulty;
    language: QuizLanguage;
    createdBy: mongoose.Types.ObjectId;
    starterCode?: string;
    solution?: string;
    testCases: {
        input: string;
        expectedOutput: string;
        isHidden: boolean;
    }[];
    startTime: Date;
    endTime: Date;
    duration: number; // Duration in minutes (for display purposes)
    createdAt: Date;
    updatedAt: Date;
}

// Quiz submission/attempt by a student
export interface IQuizSubmission extends Document {
    _id: mongoose.Types.ObjectId;
    quizId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    code: string;
    status: 'started' | 'submitted' | 'passed';
    score: number; // Number of test cases passed
    totalTests: number;
    pointsAwarded: number;
    startedAt: Date;
    submittedAt?: Date;
    // Teacher grading
    teacherGrade?: number; // 0-100 grade from teacher
    teacherFeedback?: string;
    gradedAt?: Date;
    gradedBy?: mongoose.Types.ObjectId;
}

const quizSchema = new Schema<IQuiz>(
    {
        title: {
            type: String,
            required: [true, 'Quiz title is required'],
            trim: true,
            minlength: [3, 'Title must be at least 3 characters'],
            maxlength: [100, 'Title cannot exceed 100 characters'],
        },
        description: {
            type: String,
            required: [true, 'Quiz description is required'],
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
            required: [true, 'Quiz must have a creator'],
            index: true,
        },
        starterCode: {
            type: String,
            default: '',
        },
        solution: {
            type: String,
            default: '',
            select: false,
        },
        testCases: [
            {
                input: { type: String, default: '' },
                expectedOutput: { type: String, required: true },
                isHidden: { type: Boolean, default: false },
            },
        ],
        startTime: {
            type: Date,
            required: [true, 'Start time is required'],
        },
        endTime: {
            type: Date,
            required: [true, 'End time is required'],
        },
        duration: {
            type: Number,
            required: [true, 'Duration is required'],
            min: [1, 'Duration must be at least 1 minute'],
        },
    },
    {
        timestamps: true,
    }
);

const quizSubmissionSchema = new Schema<IQuizSubmission>(
    {
        quizId: {
            type: Schema.Types.ObjectId,
            ref: 'Quiz',
            required: true,
            index: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        code: {
            type: String,
            default: '',
        },
        status: {
            type: String,
            enum: ['started', 'submitted', 'passed'],
            default: 'started',
        },
        score: {
            type: Number,
            default: 0,
        },
        totalTests: {
            type: Number,
            default: 0,
        },
        pointsAwarded: {
            type: Number,
            default: 0,
        },
        startedAt: {
            type: Date,
            default: Date.now,
        },
        submittedAt: {
            type: Date,
        },
        // Teacher grading fields
        teacherGrade: {
            type: Number,
            min: 0,
            max: 100,
        },
        teacherFeedback: {
            type: String,
            maxlength: 2000,
        },
        gradedAt: {
            type: Date,
        },
        gradedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

// Compound index to ensure one submission per user per quiz
quizSubmissionSchema.index({ quizId: 1, userId: 1 }, { unique: true });

// Indexes for faster queries
quizSchema.index({ createdBy: 1, createdAt: -1 });
quizSchema.index({ startTime: 1, endTime: 1 });
quizSchema.index({ difficulty: 1 });
quizSchema.index({ language: 1 });

export const Quiz = mongoose.model<IQuiz>('Quiz', quizSchema);
export const QuizSubmission = mongoose.model<IQuizSubmission>('QuizSubmission', quizSubmissionSchema);
