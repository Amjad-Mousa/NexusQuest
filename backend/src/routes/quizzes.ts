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

        // Get user's submissions for all quizzes
        const submissions = await QuizSubmission.find({
            userId: req.userId,
            quizId: { $in: quizzes.map(q => q._id) },
        });

        const submissionMap = new Map(submissions.map(s => [s.quizId.toString(), s]));

        // Add status and submission to each quiz
        const quizzesWithStatus = quizzes.map(quiz => {
            const submission = submissionMap.get(quiz._id.toString());
            return {
                ...quiz.toObject(),
                status: getQuizStatus(quiz),
                submission: submission ? {
                    status: submission.status,
                    score: submission.score,
                    totalTests: submission.totalTests,
                    pointsAwarded: submission.pointsAwarded,
                    startedAt: submission.startedAt,
                    submittedAt: submission.submittedAt,
                    teacherGrade: submission.teacherGrade,
                    teacherFeedback: submission.teacherFeedback,
                    gradedAt: submission.gradedAt,
                } : null,
            };
        });

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
                    teacherGrade: submission.teacherGrade,
                    teacherFeedback: submission.teacherFeedback,
                    gradedAt: submission.gradedAt,
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

        // Allow resubmission if not all tests passed (until timer ends)
        // Only block if already passed all tests
        if (submission.status === 'passed') {
            return res.status(400).json({ success: false, error: 'You have already passed this quiz!' });
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
        // Only award points automatically if all tests pass
        const newPointsAwarded = allPassed ? quiz.points : 0;

        // Track previous points to handle point adjustments
        const previousPoints = submission.pointsAwarded || 0;
        const pointsDiff = newPointsAwarded - previousPoints;

        // Update submission
        submission.code = code;
        submission.status = allPassed ? 'passed' : 'submitted';
        submission.score = passed;
        submission.totalTests = results.length;
        submission.submittedAt = new Date();

        // Only update points if score improved (all passed)
        if (allPassed && pointsDiff > 0) {
            submission.pointsAwarded = newPointsAwarded;
            await User.findByIdAndUpdate(req.userId, { $inc: { totalPoints: pointsDiff } });
        }

        await submission.save();

        res.json({
            success: true,
            data: {
                total: results.length,
                passed,
                results,
                allPassed,
                pointsAwarded: submission.pointsAwarded || 0,
                canRetry: !allPassed, // Student can retry if not all passed
                submission: {
                    status: submission.status,
                    score: submission.score,
                    totalTests: submission.totalTests,
                    pointsAwarded: submission.pointsAwarded || 0,
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
            .populate('gradedBy', 'name')
            .sort({ score: -1, submittedAt: 1 });

        res.json({
            success: true,
            data: {
                quiz: {
                    _id: quiz._id,
                    title: quiz.title,
                    description: quiz.description,
                    language: quiz.language,
                    totalTests: quiz.testCases.length,
                    points: quiz.points,
                },
                submissions: submissions.map(s => ({
                    _id: s._id,
                    user: s.userId,
                    code: s.code,
                    status: s.status,
                    score: s.score,
                    totalTests: s.totalTests,
                    pointsAwarded: s.pointsAwarded,
                    startedAt: s.startedAt,
                    submittedAt: s.submittedAt,
                    teacherGrade: s.teacherGrade,
                    teacherFeedback: s.teacherFeedback,
                    gradedAt: s.gradedAt,
                    gradedBy: s.gradedBy,
                })),
            },
        });
    } catch {
        res.status(500).json({ success: false, error: 'Failed to fetch results' });
    }
});

// Get a single submission details (teachers only)
router.get('/:id/submission/:submissionId', teacherMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const quiz = await Quiz.findOne({ _id: req.params.id, createdBy: req.userId });

        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found or not authorized' });
        }

        const submission = await QuizSubmission.findOne({
            _id: req.params.submissionId,
            quizId: quiz._id,
        })
            .populate('userId', 'name email')
            .populate('gradedBy', 'name');

        if (!submission) {
            return res.status(404).json({ success: false, error: 'Submission not found' });
        }

        res.json({
            success: true,
            data: {
                quiz: {
                    _id: quiz._id,
                    title: quiz.title,
                    description: quiz.description,
                    language: quiz.language,
                    testCases: quiz.testCases,
                    points: quiz.points,
                },
                submission: {
                    _id: submission._id,
                    user: submission.userId,
                    code: submission.code,
                    status: submission.status,
                    score: submission.score,
                    totalTests: submission.totalTests,
                    pointsAwarded: submission.pointsAwarded,
                    startedAt: submission.startedAt,
                    submittedAt: submission.submittedAt,
                    teacherGrade: submission.teacherGrade,
                    teacherFeedback: submission.teacherFeedback,
                    gradedAt: submission.gradedAt,
                    gradedBy: submission.gradedBy,
                },
            },
        });
    } catch {
        res.status(500).json({ success: false, error: 'Failed to fetch submission' });
    }
});

// Grade a submission (teachers only)
router.post('/:id/submission/:submissionId/grade', teacherMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { grade, feedback } = req.body as { grade?: number; feedback?: string };

        if (grade === undefined || grade < 0 || grade > 100) {
            return res.status(400).json({ success: false, error: 'Grade must be between 0 and 100' });
        }

        const quiz = await Quiz.findOne({ _id: req.params.id, createdBy: req.userId });

        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found or not authorized' });
        }

        const submission = await QuizSubmission.findOne({
            _id: req.params.submissionId,
            quizId: quiz._id,
        }).populate('userId', 'name email');

        if (!submission) {
            return res.status(404).json({ success: false, error: 'Submission not found' });
        }

        // Calculate new points based on teacher grade
        const previousPoints = submission.pointsAwarded;
        const newPoints = Math.round((grade / 100) * quiz.points);
        const pointsDiff = newPoints - previousPoints;

        // Update submission
        submission.teacherGrade = grade;
        submission.teacherFeedback = feedback || '';
        submission.gradedAt = new Date();
        submission.gradedBy = req.userId as any;
        submission.pointsAwarded = newPoints;
        await submission.save();

        // Update user's total points
        if (pointsDiff !== 0) {
            await User.findByIdAndUpdate(submission.userId, {
                $inc: { totalPoints: pointsDiff },
            });
        }

        res.json({
            success: true,
            data: {
                submission: {
                    _id: submission._id,
                    teacherGrade: submission.teacherGrade,
                    teacherFeedback: submission.teacherFeedback,
                    gradedAt: submission.gradedAt,
                    pointsAwarded: submission.pointsAwarded,
                    previousPoints,
                    pointsDiff,
                },
                message: `Graded successfully. Points ${pointsDiff >= 0 ? 'added' : 'adjusted'}: ${pointsDiff}`,
            },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error?.message || 'Failed to grade submission' });
    }
});

export default router;
