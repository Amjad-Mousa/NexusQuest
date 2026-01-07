import { Response } from 'express';
import { User } from '../../models/User.js';
import { AuthRequest } from '../../middleware/auth.js';

/**
 * Get quiz status based on start and end times
 */
export function getQuizStatus(quiz: { startTime: Date; endTime: Date }): 'scheduled' | 'active' | 'ended' {
    const now = new Date();
    if (now < quiz.startTime) return 'scheduled';
    if (now > quiz.endTime) return 'ended';
    return 'active';
}

/**
 * Middleware to check if user is a teacher
 */
export const teacherMiddleware = async (req: AuthRequest, res: Response, next: () => void) => {
    try {
        const user = await User.findById(req.userId);
        if (!user || user.role !== 'teacher') {
            return res.status(403).json({
                success: false,
                error: 'Access denied. Teacher role required.',
            });
        }
        next();
    } catch {
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

/**
 * Normalize string for comparison (trim whitespace, normalize newlines)
 */
export function normalizeOutput(value: string): string {
    return value.replace(/\r\n/g, '\n').trim();
}

