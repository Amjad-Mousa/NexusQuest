import { Router, Response } from 'express';
import { Quiz, QuizSubmission } from '../../models/Quiz.js';
import { authMiddleware, AuthRequest } from '../../middleware/auth.js';
import { User } from '../../models/User.js';
import { Notification } from '../../models/Notification.js';
import { NotificationType } from '../../enums/NotificationType.js';
import { checkQuizAchievements } from '../../services/gamificationService.js';
import { executeCodeInTempContainer } from '../../utils/tempContainerExec.js';
import { logger } from '../../utils/logger.js';
import { getQuizStatus, normalizeOutput } from './helpers.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/quizzes
 * Get all quizzes (students see only assigned, teachers see all)
 */
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.userId);
        const isTeacher = user?.role === 'teacher';

        const { language, difficulty } = req.query;
        const filter: any = {};

        if (language) filter.language = language;
        if (difficulty) filter.difficulty = difficulty;

        let quizzes;
        if (isTeacher) {
            quizzes = await Quiz.find(filter)
                .populate('createdBy', 'name email')
                .sort({ createdAt: -1 });
        } else {
            filter.assignedTo = req.userId;
            quizzes = await Quiz.find(filter)
                .populate('createdBy', 'name email')
                .sort({ startTime: -1 });
        }

        // Get user's submissions
        const submissions = await QuizSubmission.find({
            quizId: { $in: quizzes.map(q => q._id) },
            userId: req.userId,
        });

        const submissionMap = new Map(submissions.map(s => [s.quizId.toString(), s]));

        const quizzesWithStatus = quizzes.map(quiz => {
            const submission = submissionMap.get(quiz._id.toString()) || {};
            return {
                ...quiz.toObject(),
                status: getQuizStatus(quiz),
                submission: {
                    status: (submission as any).status,
                    score: (submission as any).score,
                    totalTests: (submission as any).totalTests,
                    pointsAwarded: (submission as any).pointsAwarded,
                    startedAt: (submission as any).startedAt,
                    submittedAt: (submission as any).submittedAt,
                    teacherGrade: (submission as any).teacherGrade,
                    teacherFeedback: (submission as any).teacherFeedback,
                    gradedAt: (submission as any).gradedAt,
                },
            };
        });

        res.json({ success: true, data: quizzesWithStatus });
    } catch (error: any) {
        logger.error('Failed to fetch quizzes:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch quizzes' });
    }
});

/**
 * GET /api/quizzes/:id
 * Get single quiz by ID
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.userId);
        const isTeacher = user?.role === 'teacher';

        let quiz;
        if (isTeacher) {
            quiz = await Quiz.findById(req.params.id)
                .populate('createdBy', 'name email')
                .populate('assignedTo', 'name email');
        } else {
            quiz = await Quiz.findById(req.params.id)
                .populate('createdBy', 'name email');
        }

        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found' });
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
                    code: submission.code,
                } : null,
            },
        });
    } catch (error: any) {
        logger.error('Failed to fetch quiz:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch quiz' });
    }
});

/**
 * POST /api/quizzes/:id/start
 * Start a quiz attempt (student)
 */
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
                data: { submission, alreadyStarted: true },
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
            data: { submission, alreadyStarted: false },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message || 'Failed to start quiz' });
    }
});

/**
 * POST /api/quizzes/:id/run
 * Run code against visible test cases (without submitting)
 */
router.post('/:id/run', async (req: AuthRequest, res: Response) => {
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

        // Only run against visible test cases
        const visibleTestCases = (quiz.testCases || []).filter((tc: any) => !tc.isHidden);
        const results: Array<{
            index: number;
            passed: boolean;
            input: string;
            expectedOutput: string;
            actualOutput: string;
            error?: string;
        }> = [];

        const timeoutMs = 15000;

        for (let i = 0; i < visibleTestCases.length; i++) {
            const test = visibleTestCases[i];
            try {
                const execResult = await executeCodeInTempContainer(code, quiz.language, test.input, {
                    sessionIdPrefix: 'quiz-test',
                    timeoutMs,
                });

                const actual = execResult.error ? execResult.error : execResult.output;
                const passed = !execResult.error && normalizeOutput(actual) === normalizeOutput(test.expectedOutput);

                results.push({
                    index: i,
                    passed,
                    input: test.input,
                    expectedOutput: test.expectedOutput,
                    actualOutput: actual,
                    error: execResult.error || undefined,
                });
            } catch (error: any) {
                logger.error(`Quiz test case ${i} failed:`, error.message);
                results.push({
                    index: i,
                    passed: false,
                    input: test.input,
                    expectedOutput: test.expectedOutput,
                    actualOutput: '',
                    error: error?.message || 'Execution failed',
                });
            }
        }

        const passed = results.filter(r => r.passed).length;

        res.json({
            success: true,
            data: { total: results.length, passed, results },
        });
    } catch (error: any) {
        logger.error('Failed to run quiz code:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to run code' });
    }
});

/**
 * POST /api/quizzes/:id/submit
 * Submit quiz solution
 */
router.post('/:id/submit', async (req: AuthRequest, res: Response) => {
    try {
        const { code, forceSubmit, violations } = req.body as { code?: string; forceSubmit?: boolean; violations?: number };

        if (!forceSubmit && (!code || !code.trim())) {
            return res.status(400).json({ success: false, error: 'Code is required' });
        }

        const submittedCode = code || '';
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

        const submission = await QuizSubmission.findOne({
            quizId: quiz._id,
            userId: req.userId,
        });

        if (!submission) {
            return res.status(400).json({ success: false, error: 'You must start the quiz first' });
        }

        if (submission.status === 'passed') {
            return res.status(400).json({ success: false, error: 'You have already passed this quiz!' });
        }

        const testCases = quiz.testCases || [];
        const results: Array<{
            index: number;
            passed: boolean;
            input: string;
            actualOutput: string;
            error?: string;
        }> = [];

        const timeoutMs = 15000;

        for (let i = 0; i < testCases.length; i++) {
            const test = testCases[i];
            try {
                const execResult = await executeCodeInTempContainer(submittedCode, quiz.language, test.input, {
                    sessionIdPrefix: 'quiz-submit',
                    timeoutMs,
                });

                const actual = execResult.error ? execResult.error : execResult.output;
                const passed = !execResult.error && normalizeOutput(actual) === normalizeOutput(test.expectedOutput);

                results.push({
                    index: i,
                    passed,
                    input: test.isHidden ? '(hidden)' : test.input,
                    actualOutput: test.isHidden ? (passed ? '(correct)' : '(incorrect)') : actual,
                    error: execResult.error || undefined,
                });
            } catch (error: any) {
                logger.error(`Quiz submit test case ${i} failed:`, error.message);
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
        const autoGrade = results.length > 0 ? Math.round((passed / results.length) * 100) : 0;
        const newPointsAwarded = results.length > 0 ? Math.round((passed / results.length) * quiz.points) : 0;
        const previousPoints = submission.pointsAwarded || 0;
        const pointsDiff = newPointsAwarded - previousPoints;

        // Update submission
        submission.code = submittedCode;
        submission.status = allPassed ? 'passed' : 'submitted';
        submission.score = passed;
        submission.totalTests = results.length;
        submission.submittedAt = new Date();

        if (submission.teacherGrade === undefined) {
            submission.teacherGrade = autoGrade;
        }

        // Award points proportionally (only if improved)
        if (pointsDiff > 0) {
            submission.pointsAwarded = newPointsAwarded;
            await User.findByIdAndUpdate(req.userId, { $inc: { totalPoints: pointsDiff } });

            try {
                await Notification.create({
                    userId: req.userId,
                    type: NotificationType.POINTS_EARNED,
                    message: `You earned ${pointsDiff} points from quiz "${quiz.title}" (${passed}/${results.length} tests passed)`,
                    metadata: {
                        quizId: quiz._id,
                        title: quiz.title,
                        points: pointsDiff,
                        testsPassed: passed,
                        totalTests: results.length,
                        autoGrade,
                        reason: 'quiz_auto_grade',
                    },
                    read: false,
                });
            } catch (notifyError) {
                logger.error('Failed to create POINTS_EARNED notification:', notifyError);
            }
        }

        await submission.save();

        // Handle force submit (violation detection)
        if (forceSubmit) {
            try {
                const student = await User.findById(req.userId).select('name email');
                await Notification.create({
                    userId: quiz.createdBy,
                    type: NotificationType.QUIZ_VIOLATION,
                    message: `⚠️ Student ${student?.name || 'Unknown'} attempted to leave quiz "${quiz.title}" and was force-submitted`,
                    metadata: {
                        quizId: quiz._id,
                        quizTitle: quiz.title,
                        studentId: req.userId,
                        studentName: student?.name,
                        studentEmail: student?.email,
                        violations: violations || 1,
                        reason: 'tab_switch_detected',
                        submittedAt: new Date(),
                    },
                    read: false,
                });
                logger.info(`Quiz violation notification sent for student: ${student?.name}`);
            } catch (notifyError) {
                logger.error('Failed to create QUIZ_VIOLATION notification:', notifyError);
            }
        }

        // Check achievements
        try {
            if (req.userId) {
                await checkQuizAchievements(req.userId.toString());
            }
        } catch (achievementError) {
            logger.error('Failed to check quiz achievements:', achievementError);
        }

        res.json({
            success: true,
            data: {
                total: results.length,
                passed,
                results,
                allPassed,
                pointsAwarded: submission.pointsAwarded || 0,
                canRetry: !allPassed,
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
        logger.error('Failed to submit quiz:', error);
        res.status(500).json({ success: false, error: error?.message || 'Failed to submit quiz' });
    }
});

export default router;

