import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { DailyChallengeCompletion, DAILY_CHALLENGES } from '../models/DailyChallenge.js';
import { executeCode } from '../services/dockerService.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Helper to get today's date string in YYYY-MM-DD format
function getTodayDateString(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
}

// Helper to get today's challenge index based on date
function getTodayChallengeIndex(): number {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - startOfYear.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    return dayOfYear % DAILY_CHALLENGES.length;
}

// Get today's daily challenge
router.get('/today', async (req: AuthRequest, res: Response) => {
    try {
        const todayDate = getTodayDateString();
        const challengeIndex = getTodayChallengeIndex();
        const challenge = DAILY_CHALLENGES[challengeIndex];

        // Check if user already completed today's challenge
        const completion = await DailyChallengeCompletion.findOne({
            userId: req.userId,
            completedDate: todayDate,
        });

        res.json({
            success: true,
            data: {
                challenge: {
                    ...challenge,
                    index: challengeIndex,
                },
                completed: !!completion,
                completedAt: completion?.completedAt || null,
                date: todayDate,
            },
        });
    } catch (error) {
        console.error('Failed to get daily challenge:', error);
        res.status(500).json({ success: false, error: 'Failed to get daily challenge' });
    }
});

// Submit solution for today's daily challenge
router.post('/submit', async (req: AuthRequest, res: Response) => {
    try {
        const { code } = req.body as { code?: string };

        if (!code || !code.trim()) {
            return res.status(400).json({ success: false, error: 'Code is required' });
        }

        const todayDate = getTodayDateString();
        const challengeIndex = getTodayChallengeIndex();
        const challenge = DAILY_CHALLENGES[challengeIndex];

        // Check if already completed today
        const existingCompletion = await DailyChallengeCompletion.findOne({
            userId: req.userId,
            completedDate: todayDate,
        });

        if (existingCompletion) {
            return res.status(400).json({
                success: false,
                error: 'You have already completed today\'s challenge!',
            });
        }

        // Execute the code
        const result = await executeCode(code, challenge.language, challenge.testInput);

        const normalize = (value: string): string => {
            return value.replace(/\r\n/g, '\n').trim();
        };

        const actualOutput = result.error ? result.error : result.output;
        const passed = !result.error && normalize(actualOutput) === normalize(challenge.expectedOutput);

        if (passed) {
            // Mark as completed
            await DailyChallengeCompletion.create({
                userId: req.userId,
                challengeIndex,
                completedDate: todayDate,
            });

            // Award points
            await User.findByIdAndUpdate(req.userId, {
                $inc: { totalPoints: challenge.points },
            });

            res.json({
                success: true,
                data: {
                    passed: true,
                    output: actualOutput,
                    pointsAwarded: challenge.points,
                    message: `Congratulations! You earned ${challenge.points} points!`,
                },
            });
        } else {
            res.json({
                success: true,
                data: {
                    passed: false,
                    output: actualOutput,
                    expected: challenge.expectedOutput,
                    error: result.error || null,
                    message: 'Not quite right. Try again!',
                },
            });
        }
    } catch (error: any) {
        console.error('Failed to submit daily challenge:', error);
        res.status(500).json({
            success: false,
            error: error?.message || 'Failed to submit solution',
        });
    }
});

// Get user's daily challenge history/stats
router.get('/stats', async (req: AuthRequest, res: Response) => {
    try {
        const completions = await DailyChallengeCompletion.find({ userId: req.userId })
            .sort({ completedDate: -1 })
            .limit(30);

        // Calculate streak
        let streak = 0;
        const today = new Date();

        for (let i = 0; i < 30; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - i);
            const dateStr = checkDate.toISOString().split('T')[0];

            const found = completions.find(c => c.completedDate === dateStr);
            if (found) {
                streak++;
            } else if (i > 0) {
                // Allow today to be incomplete, but break streak if yesterday is missing
                break;
            }
        }

        res.json({
            success: true,
            data: {
                totalCompleted: completions.length,
                currentStreak: streak,
                recentCompletions: completions.slice(0, 7).map(c => ({
                    date: c.completedDate,
                    challengeIndex: c.challengeIndex,
                })),
            },
        });
    } catch (error) {
        console.error('Failed to get daily challenge stats:', error);
        res.status(500).json({ success: false, error: 'Failed to get stats' });
    }
});

export default router;
