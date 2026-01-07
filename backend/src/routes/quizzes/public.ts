import { Router, Response } from 'express';
import { Quiz } from '../../models/Quiz.js';
import { AuthRequest } from '../../middleware/auth.js';
import { getQuizStatus } from './helpers.js';
import { logger } from '../../utils/logger.js';

const router = Router();

/**
 * GET /api/quizzes/public
 * Get all quizzes without auth (for mobile app)
 */
router.get('/', async (req: AuthRequest, res: Response) => {
    logger.info('GET /api/quizzes/public hit');
    try {
        const { language, difficulty } = req.query;

        const filter: any = {};
        if (language) filter.language = language;
        if (difficulty) filter.difficulty = difficulty;

        const quizzes = await Quiz.find(filter)
            .populate('createdBy', 'name email')
            .sort({ startTime: -1 });

        const quizzesWithStatus = quizzes.map(quiz => ({
            ...quiz.toObject(),
            status: getQuizStatus(quiz),
        }));

        res.json(quizzesWithStatus);
    } catch (error: any) {
        logger.error('Error fetching public quizzes:', error);
        res.status(500).json({ error: 'Failed to fetch quizzes' });
    }
});

/**
 * GET /api/quizzes/public/:id
 * Get single quiz by ID (no auth required)
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
    logger.info('GET /api/quizzes/public/:id hit');
    try {
        const quiz = await Quiz.findById(req.params.id)
            .populate('createdBy', 'name email');

        if (!quiz) {
            return res.status(404).json({ error: 'Quiz not found' });
        }

        res.json({
            ...quiz.toObject(),
            status: getQuizStatus(quiz),
        });
    } catch (error: any) {
        logger.error('Error fetching quiz:', error);
        res.status(500).json({ error: 'Failed to fetch quiz' });
    }
});

export default router;

