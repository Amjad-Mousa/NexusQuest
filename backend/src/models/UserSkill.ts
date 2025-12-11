import mongoose, { Schema, Document } from 'mongoose';

export interface IUserSkill extends Document {
    userId: mongoose.Types.ObjectId;
    skillName: string;
    level: number;
    xp: number;
    totalXp: number;
    category: 'python' | 'javascript' | 'java' | 'cpp' | 'general';
}

const UserSkillSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    skillName: {
        type: String,
        required: true,
    },
    level: {
        type: Number,
        default: 1,
        min: 1,
    },
    xp: {
        type: Number,
        default: 0,
        min: 0,
    },
    totalXp: {
        type: Number,
        default: 0,
        min: 0,
    },
    category: {
        type: String,
        enum: ['python', 'javascript', 'java', 'cpp', 'general'],
        required: true,
    },
}, {
    timestamps: true,
});

// Compound index for user and skill
UserSkillSchema.index({ userId: 1, skillName: 1 }, { unique: true });

export default mongoose.model<IUserSkill>('UserSkill', UserSkillSchema);
