import mongoose, { Schema, Document } from 'mongoose';

export interface IAchievement extends Document {
    userId: mongoose.Types.ObjectId;
    achievementId: string;
    title: string;
    description: string;
    icon: string;
    category: 'tasks' | 'quizzes' | 'tutorials' | 'projects' | 'social' | 'streak' | 'special';
    unlockedAt: Date;
    progress?: number;
    maxProgress?: number;
}

const AchievementSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    achievementId: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    icon: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        enum: ['tasks', 'quizzes', 'tutorials', 'projects', 'social', 'streak', 'special'],
        required: true,
    },
    unlockedAt: {
        type: Date,
        default: Date.now,
    },
    progress: {
        type: Number,
        default: 0,
    },
    maxProgress: {
        type: Number,
    },
}, {
    timestamps: true,
});

// Compound index for user and achievement
AchievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });

export default mongoose.model<IAchievement>('Achievement', AchievementSchema);
