import { Router, Response } from 'express';
import { Quiz, QuizSubmission } from '../models/Quiz.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { executeCode } from '../services/dockerService.js';

const router = Router();

// Middleware to check if user is a teacher
const teacherMiddleware = async (req: AuthRequest, res: Response, next: () => void) => {
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

// All routes require authentication
router.use(authMiddleware);

// Helper to get quiz status
function getQuizStatus(quiz: { startTime: Date; endTime: Date }): 'scheduled' | 'active' | 'ended' {
    const now = new Date();
    if (now < quiz.startTime) return 'scheduled';
    if (now > quiz.endTime) return 'ended';
    return 'active';
}

// Get all quizzes (students see only scheduled/active/ended, teachers see all)
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.userId);
        const isTeacher = user?.role === 'teacher';

        let query = {};
        if (!isTeacher) {
            // Students only see quizzes that have started or will start
            query = { startTime: { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } }; // Within next 7 days
        }

        const quizzes = await Quiz.find(query)
            .populate('createdBy', 'name email')
            .sort({ startTime: -1 });

        // Add status to each quiz
        const quizzesWithStatus = quizzes.map(quiz => ({
            ...quiz.toObject(),
            status: getQuizStatus(quiz),
        }));

        res.json({
            success: true,
            data: quizzesWithStatus,
        });
    } catch {
        res.status(500).json({ success: false, error: 'Failed to fetch quizzes' });
    }
});

// Get quizzes created by the current teacher
router.get('/my-quizzes', teacherMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const quizzes = await Quiz.find({ createdBy: req.userId })
            .select('+solution')
            .sort({ createdAt: -1 });

        const quizzesWithStatus = quizzes.map(quiz => ({
            ...quiz.toObject(),
            status: getQuizStatus(quiz),
        }));

        res.json({
            success: true,
            data: quizzesWithStatus,
        });
    } catch {
        res.status(500).json({ success: false, error: 'Failed to fetch quizzes' });
    }
});

// Get a single quiz by ID
router.get('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.userId);
        const isTeacher = user?.role === 'teacher';

        let quiz;
        if (isTeacher) {
            quiz = await Quiz.findById(req.params.id)
                .select('+solution')
                .populate('createdBy', 'name email');
        } else {
            quiz = await Quiz.findById(req.params.id)
                .populate('createdBy', 'name email');
        }

        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found' });
        }

        const status = getQuizStatus(quiz);

        // For students, check if quiz is accessible
        if (!isTeacher && status === 'scheduled') {
            // Return limited info for scheduled quizzes
            return res.json({
                success: true,
                data: {
                    _id: quiz._id,
                    title: quiz.title,
                    description: quiz.description,
                    difficulty: quiz.difficulty,
                    language: quiz.language,
                    points: quiz.points,
                    startTime: quiz.startTime,
                    endTime: quiz.endTime,
                    duration: quiz.duration,
                    status,
                    createdBy: quiz.createdBy,
                },
            });
        }

        // Get user's submission if exists
        const submission = await QuizSubmission.findOne({
            quizId: quiz._id,
            userId: req.userId,
        });

        res.json({
            success: true,
            data: {
                ...quiz.toObject(),
                status,
                submission: submission ? {
                    status: submission.status,
                    score: submission.score,
                    totalTests: submission.totalTests,
                    pointsAwarded: submission.pointsAwarded,
                    startedAt: submission.startedAt,
                    submittedAt: submission.submittedAt,
                } : null,
            },
        });
    } catch {
        res.status(500).json({ success: false, error: 'Failed to fetch quiz' });
    }
});

// Create a new quiz (teachers only)
router.post('/', teacherMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { title, description, points, difficulty, language, starterCode, solution, testCases, startTime, endTime, duration } = req.body;

        if (!Array.isArray(testCases) || testCases.length === 0) {
            return res.status(400).json({ success: false, error: 'At least one test case is required' });
        }

        const start = new Date(startTime);
        const end = new Date(endTime);

        if (start >= end) {
            return res.status(400).json({ success: false, error: 'End time must be after start time' });
        }

        const quiz = await Quiz.create({
            title,
            description,
            points,
            difficulty,
            language: language || 'python',
            createdBy: req.userId,
            starterCode,
            solution,
            testCases,
            startTime: start,
            endTime: end,
            duration,
        });

        res.status(201).json({ success: true, data: quiz });
    } catch (error: unknown) {
        const err = error as Error;
        res.status(400).json({ success: false, error: err.message || 'Failed to create quiz' });
    }
});

// Update a quiz (teachers only, own quizzes)
router.put('/:id', teacherMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const quiz = await Quiz.findOne({ _id: req.params.id, createdBy: req.userId })
            .select('+solution');

        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found or not authorized' });
        }

        const { title, description, points, difficulty, language, starterCode, solution, testCases, startTime, endTime, duration } = req.body;

        if (title) quiz.title = title;
        if (description) quiz.description = description;
        if (points) quiz.points = points;
        if (difficulty) quiz.difficulty = difficulty;
        if (language) quiz.language = language;
        if (starterCode !== undefined) quiz.starterCode = starterCode;
        if (solution !== undefined) quiz.solution = solution;
        if (testCases !== undefined) {
            if (!Array.isArray(testCases) || testCases.length === 0) {
                return res.status(400).json({ success: false, error: 'At least one test case is required' });
            }
            quiz.testCases = testCases;
        }
        if (startTime) quiz.startTime = new Date(startTime);
        if (endTime) quiz.endTime = new Date(endTime);
        if (duration) quiz.duration = duration;

        if (quiz.startTime >= quiz.endTime) {
            return res.status(400).json({ success: false, error: 'End time must be after start time' });
        }

        await quiz.save();

        res.json({ success: true, data: quiz });
    } catch (error: unknown) {
        const err = error as Error;
        res.status(400).json({ success: false, error: err.message || 'Failed to update quiz' });
    }
});

// Delete a quiz (teachers only, own quizzes)
router.delete('/:id', teacherMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const quiz = await Quiz.findOneAndDelete({ _id: req.params.id, createdBy: req.userId });

        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found or not authorized' });
        }

        // Also delete all submissions for this quiz
        await QuizSubmission.deleteMany({ quizId: req.params.id });

        res.json({ success: true, message: 'Quiz deleted' });
    } catch {
        res.status(500).json({ success: false, error: 'Failed to delete quiz' });
    }
});

// Start a quiz attempt (student)
router.post('/:id/start', async (req: AuthRequest, res: Response) => {
    try {
        const quiz = await Quiz.findById(req.params.id);

        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found' });
        }

        const status = getQuizStatus(quiz);
        if (status !== 'active') {
            return res.status(400).json({
                success: false,
                error: status === 'scheduled' ? 'Quiz has not started yet' : 'Quiz has ended',
            });
        }

        // Check if already started
        let submission = await QuizSubmission.findOne({
            quizId: quiz._id,
            userId: req.userId,
        });

        if (submission) {
            return res.json({
                success: true,
                data: {
                    submission,
                    alreadyStarted: true,
                },
            });
        }

        // Create new submission
        submission = await QuizSubmission.create({
            quizId: quiz._id,
            userId: req.userId,
            code: quiz.starterCode || '',
            status: 'started',
            totalTests: quiz.testCases.length,
        });

        res.json({
            success: true,
            data: {
                submission,
                alreadyStarted: false,
            },
        });
    } catch (error: unknown) {
        const err = error as Error;
        res.status(500).json({ success: false, error: err.message || 'Failed to start quiz' });
    }
});

// Submit quiz solution
router.post('/:id/submit', async (req: AuthRequest, res: Response) => {
    try {
        const { code } = req.body as { code?: string };

        if (!code || !code.trim()) {
            return res.status(400).json({ success: false, error: 'Code is required' });
        }

        const quiz = await Quiz.findById(req.params.id);

        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found' });
        }

        const status = getQuizStatus(quiz);
        if (status !== 'active') {
            return res.status(400).json({
                success: false,
                error: status === 'scheduled' ? 'Quiz has not started yet' : 'Quiz has ended',
            });
        }

        // Check if user has started the quiz
        const submission = await QuizSubmission.findOne({
            quizId: quiz._id,
            userId: req.userId,
        });

        if (!submission) {
            return res.status(400).json({ success: false, error: 'You must start the quiz first' });
        }

        if (submission.status === 'passed' || submission.status === 'failed') {
            return res.status(400).json({ success: false, error: 'You have already submitted this quiz' });
        }

        const testCases = quiz.testCases || [];
        const normalize = (value: string): string => {
            return value.replace(/\r\n/g, '\n').trim();
        };

        const results = [] as Array<{
            index: number;
            passed: boolean;
            input: string;
            actualOutput: string;
            error?: string;
        }>;

        for (let i = 0; i < testCases.length; i++) {
            const test = testCases[i];

            try {
                const execResult = await Promise.race([
                    executeCode(code, quiz.language, test.input),
                    new Promise<never>((_, reject) => {
                        setTimeout(() => reject(new Error('Test execution timeout (10 seconds)')), 10000);
                    }),
                ]);

                const actual = (execResult as any).error
                    ? (execResult as any).error
                    : (execResult as any).output;

                const passed = !(execResult as any).error && normalize(actual) === normalize(test.expectedOutput);

                results.push({
                    index: i,
                    passed,
                    input: test.isHidden ? '(hidden)' : test.input,
                    actualOutput: test.isHidden ? (passed ? '(correct)' : '(incorrect)') : actual,
                    error: (execResult as any).error || undefined,
                });
            } catch (error: any) {
                results.push({
                    index: i,
                    passed: false,
                    input: test.isHidden ? '(hidden)' : test.input,
                    actualOutput: '',
                    error: error?.message || 'Execution failed',
                });
            }
        }

        const passed = results.filter(r => r.passed).length;
        const allPassed = passed === results.length;

        // Calculate points (proportional to tests passed)
        const pointsAwarded = allPassed ? quiz.points : Math.floor((passed / results.length) * quiz.points * 0.5);

        // Update submission
        submission.code = code;
        submission.status = allPassed ? 'passed' : 'failed';
        submission.score = passed;
        submission.totalTests = results.length;
        submission.pointsAwarded = pointsAwarded;
        submission.submittedAt = new Date();
        await submission.save();

        // Award points to user
        if (pointsAwarded > 0) {
            await User.findByIdAndUpdate(req.userId, { $inc: { totalPoints: pointsAwarded } });
        }

        res.json({
            success: true,
            data: {
                total: results.length,
                passed,
                results,
                allPassed,
                pointsAwarded,
                submission: {
                    status: submission.status,
                    score: submission.score,
                    totalTests: submission.totalTests,
                    pointsAwarded: submission.pointsAwarded,
                    submittedAt: submission.submittedAt,
                },
            },
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error?.message || 'Failed to submit quiz',
        });
    }
});

// Get quiz results/leaderboard (teachers only)
router.get('/:id/results', teacherMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const quiz = await Quiz.findOne({ _id: req.params.id, createdBy: req.userId });

        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found or not authorized' });
        }

        const submissions = await QuizSubmission.find({ quizId: quiz._id })
            .populate('userId', 'name email')
            .sort({ score: -1, submittedAt: 1 });

        res.json({
            success: true,
            data: {
                quiz: {
                    _id: quiz._id,
                    title: quiz.title,
                    totalTests: quiz.testCases.length,
                    points: quiz.points,
                },
                submissions: submissions.map(s => ({
                    user: s.userId,
                    status: s.status,
                    score: s.score,
                    totalTests: s.totalTests,
                    pointsAwarded: s.pointsAwarded,
                    startedAt: s.startedAt,
                    submittedAt: s.submittedAt,
                })),
            },
        });
    } catch {
        res.status(500).json({ success: false, error: 'Failed to fetch results' });
    }
});

export default router;
