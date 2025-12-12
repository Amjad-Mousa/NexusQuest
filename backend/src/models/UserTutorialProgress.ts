import mongoose, { Document, Schema } from 'mongoose';

export interface IUserTutorialProgress extends Document {
    userId: mongoose.Types.ObjectId;
    tutorialId: mongoose.Types.ObjectId;
    status: 'not_started' | 'in_progress' | 'completed';
    completedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const UserTutorialProgressSchema = new Schema<IUserTutorialProgress>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        tutorialId: {
            type: Schema.Types.ObjectId,
            ref: 'Tutorial',
            required: true,
            index: true,
        },
        status: {
            type: String,
            enum: ['not_started', 'in_progress', 'completed'],
            default: 'not_started',
        },
        completedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index to ensure one progress record per user per tutorial
UserTutorialProgressSchema.index({ userId: 1, tutorialId: 1 }, { unique: true });

export const UserTutorialProgress = mongoose.model<IUserTutorialProgress>(
    'UserTutorialProgress',
    UserTutorialProgressSchema
);
