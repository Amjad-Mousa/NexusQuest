import { Router, Response } from 'express';
import { Quiz, QuizSubmission } from '../../models/Quiz.js';
import { authMiddleware, AuthRequest } from '../../middleware/auth.js';
import { User } from '../../models/User.js';
import { Notification } from '../../models/Notification.js';
import { NotificationType } from '../../enums/NotificationType.js';
import { logger } from '../../utils/logger.js';
import { getQuizStatus, teacherMiddleware } from './helpers.js';

const router = Router();

// All routes require authentication and teacher role
router.use(authMiddleware);
router.use(teacherMiddleware);

/**
 * GET /api/quizzes/teacher/my-quizzes
 * Get quizzes created by the current teacher
 */
router.get('/my-quizzes', async (req: AuthRequest, res: Response) => {
    try {
        const quizzes = await Quiz.find({ createdBy: req.userId })
            .select('+solution')
            .populate('assignedTo', 'name email')
            .sort({ createdAt: -1 });

        const quizzesWithStatus = quizzes.map(quiz => ({
            ...quiz.toObject(),
            status: getQuizStatus(quiz),
        }));

        res.json({ success: true, data: quizzesWithStatus });
    } catch {
        res.status(500).json({ success: false, error: 'Failed to fetch quizzes' });
    }
});

/**
 * GET /api/quizzes/teacher/students/list
 * Get all students (for assignment selection)
 */
router.get('/students/list', async (_req: AuthRequest, res: Response) => {
    try {
        const students = await User.find({ role: 'user' })
            .select('name email')
            .sort({ name: 1 });

        res.json({ success: true, data: students });
    } catch {
        res.status(500).json({ success: false, error: 'Failed to fetch students' });
    }
});

/**
 * POST /api/quizzes/teacher
 * Create a new quiz
 */
router.post('/', async (req: AuthRequest, res: Response) => {
    try {
        const { title, description, points, difficulty, language, starterCode, solution, testCases, startTime, endTime, duration, assignedTo } = req.body;

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
            assignedTo: assignedTo || [],
        });

        // Create notifications for assigned students
        if (Array.isArray(assignedTo) && assignedTo.length > 0) {
            const message = `New quiz "${title}" has been assigned to you.`;
            const notifications = assignedTo.map((studentId: string) => ({
                userId: studentId,
                type: NotificationType.NEW_QUIZ,
                message,
                metadata: {
                    quizId: quiz._id,
                    title: quiz.title,
                    points: quiz.points,
                    startTime: quiz.startTime,
                    endTime: quiz.endTime,
                },
                read: false,
            }));

            try {
                await Notification.insertMany(notifications);
            } catch (notifyError) {
                logger.error('Failed to create NEW_QUIZ notifications:', notifyError);
            }
        }

        await quiz.save();

        // Award points to teacher for creating content
        const teacherPoints = 25;
        await User.findByIdAndUpdate(req.userId, { $inc: { totalPoints: teacherPoints } });

        try {
            await Notification.create({
                userId: req.userId,
                type: NotificationType.POINTS_EARNED,
                message: `You earned ${teacherPoints} points for creating quiz "${title}"`,
                metadata: { quizId: quiz._id, quizTitle: title, points: teacherPoints, reason: 'quiz_creation' },
                read: false,
            });
        } catch (notifyError) {
            logger.error('Failed to create quiz creation notification:', notifyError);
        }

        res.status(201).json({ success: true, data: quiz });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message || 'Failed to create quiz' });
    }
});

/**
 * PUT /api/quizzes/teacher/:id
 * Update a quiz
 */
router.put('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const quiz = await Quiz.findOne({ _id: req.params.id, createdBy: req.userId })
            .select('+solution');

        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found or not authorized' });
        }

        const { title, description, points, difficulty, language, starterCode, solution, testCases, startTime, endTime, duration, assignedTo } = req.body;

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
        if (assignedTo !== undefined) quiz.assignedTo = assignedTo;

        if (quiz.startTime >= quiz.endTime) {
            return res.status(400).json({ success: false, error: 'End time must be after start time' });
        }

        await quiz.save();
        res.json({ success: true, data: quiz });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message || 'Failed to update quiz' });
    }
});

/**
 * DELETE /api/quizzes/teacher/:id
 * Delete a quiz
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const quiz = await Quiz.findOneAndDelete({ _id: req.params.id, createdBy: req.userId });

        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found or not authorized' });
        }

        await QuizSubmission.deleteMany({ quizId: req.params.id });
        res.json({ success: true, message: 'Quiz deleted' });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message || 'Failed to delete quiz' });
    }
});

/**
 * GET /api/quizzes/teacher/:id/results
 * Get quiz results/leaderboard
 */
router.get('/:id/results', async (req: AuthRequest, res: Response) => {
    try {
        const quiz = await Quiz.findOne({ _id: req.params.id, createdBy: req.userId })
            .populate('assignedTo', 'name email');

        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found or not authorized' });
        }

        const submissions = await QuizSubmission.find({ quizId: quiz._id })
            .populate('userId', 'name email')
            .populate('gradedBy', 'name')
            .sort({ score: -1, submittedAt: 1 });

        const submissionMap = new Map(submissions.map(s => [(s.userId as any)._id.toString(), s]));

        let assignedStudents: any[] = [];
        if (quiz.assignedTo && quiz.assignedTo.length > 0) {
            assignedStudents = quiz.assignedTo as any[];
        } else {
            assignedStudents = await User.find({ role: 'user' }).select('name email');
        }

        const allResults = assignedStudents.map(student => {
            const submission = submissionMap.get(student._id.toString());

            if (submission) {
                return {
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
                    attempted: true,
                };
            } else {
                return {
                    _id: null,
                    user: student,
                    code: '',
                    status: 'not_attempted',
                    score: 0,
                    totalTests: quiz.testCases.length,
                    pointsAwarded: 0,
                    startedAt: null,
                    submittedAt: null,
                    teacherGrade: undefined,
                    teacherFeedback: undefined,
                    gradedAt: undefined,
                    gradedBy: undefined,
                    attempted: false,
                };
            }
        });

        allResults.sort((a, b) => {
            if (a.attempted && !b.attempted) return -1;
            if (!a.attempted && b.attempted) return 1;
            if (a.attempted && b.attempted) return (b.score || 0) - (a.score || 0);
            return 0;
        });

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
                    assignedCount: assignedStudents.length,
                },
                submissions: allResults,
            },
        });
    } catch {
        res.status(500).json({ success: false, error: 'Failed to fetch results' });
    }
});

/**
 * GET /api/quizzes/teacher/:id/submission/:submissionId
 * Get a single submission details
 */
router.get('/:id/submission/:submissionId', async (req: AuthRequest, res: Response) => {
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

/**
 * POST /api/quizzes/teacher/:id/submission/:submissionId/grade
 * Grade a submission
 */
router.post('/:id/submission/:submissionId/grade', async (req: AuthRequest, res: Response) => {
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

        const previousPoints = submission.pointsAwarded;
        const newPoints = Math.round((grade / 100) * quiz.points);
        const pointsDiff = newPoints - previousPoints;

        submission.teacherGrade = grade;
        submission.teacherFeedback = feedback || '';
        submission.gradedAt = new Date();
        submission.gradedBy = req.userId as any;
        submission.pointsAwarded = newPoints;
        await submission.save();

        if (pointsDiff !== 0) {
            await User.findByIdAndUpdate(submission.userId, { $inc: { totalPoints: pointsDiff } });

            if (pointsDiff > 0) {
                try {
                    await Notification.create({
                        userId: submission.userId,
                        type: NotificationType.POINTS_EARNED,
                        message: `You earned ${pointsDiff} points from quiz "${quiz.title}"`,
                        metadata: { quizId: quiz._id, title: quiz.title, points: pointsDiff, reason: 'quiz_teacher_grade' },
                        read: false,
                    });
                } catch (notifyError) {
                    logger.error('Failed to create POINTS_EARNED notification:', notifyError);
                }
            }
        }

        try {
            await Notification.create({
                userId: submission.userId,
                type: NotificationType.GRADE_UPDATED,
                message: `Your grade for quiz "${quiz.title}" has been updated.`,
                metadata: { quizId: quiz._id, title: quiz.title, grade, pointsAwarded: submission.pointsAwarded },
                read: false,
            });
        } catch (notifyError) {
            logger.error('Failed to create GRADE_UPDATED notification:', notifyError);
        }

        res.json({
            success: true,
            data: {
                teacherGrade: submission.teacherGrade,
                teacherFeedback: submission.teacherFeedback,
                pointsAwarded: submission.pointsAwarded,
                gradedAt: submission.gradedAt,
            },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message || 'Failed to grade submission' });
    }
});

/**
 * POST /api/quizzes/teacher/:id/grade-student/:userId
 * Grade a student who didn't submit (teachers only)
 */
router.post('/:id/grade-student/:userId', async (req: AuthRequest, res: Response) => {
    try {
        const { grade, feedback } = req.body as { grade?: number; feedback?: string };

        if (grade === undefined || grade < 0 || grade > 100) {
            return res.status(400).json({ success: false, error: 'Grade must be between 0 and 100' });
        }

        const quiz = await Quiz.findOne({ _id: req.params.id, createdBy: req.userId });

        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found or not authorized' });
        }

        // Check if student exists
        const student = await User.findById(req.params.userId);
        if (!student) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }

        // Find or create submission
        let submission = await QuizSubmission.findOne({
            userId: req.params.userId,
            quizId: quiz._id,
        });

        const newPoints = Math.round((grade / 100) * quiz.points);

        if (!submission) {
            // Create new submission for student who didn't attempt
            submission = await QuizSubmission.create({
                quizId: quiz._id,
                userId: req.params.userId,
                code: '',
                status: 'graded',
                score: 0,
                totalTests: quiz.testCases.length,
                teacherGrade: grade,
                teacherFeedback: feedback || '',
                pointsAwarded: newPoints,
                gradedAt: new Date(),
                gradedBy: req.userId,
            });

            // Award points
            await User.findByIdAndUpdate(req.params.userId, { $inc: { totalPoints: newPoints } });
        } else {
            const previousPoints = submission.pointsAwarded || 0;
            const pointsDiff = newPoints - previousPoints;

            submission.teacherGrade = grade;
            submission.teacherFeedback = feedback || '';
            submission.gradedAt = new Date();
            submission.gradedBy = req.userId as any;
            submission.pointsAwarded = newPoints;
            submission.status = 'graded';
            await submission.save();

            if (pointsDiff !== 0) {
                await User.findByIdAndUpdate(req.params.userId, { $inc: { totalPoints: pointsDiff } });
            }
        }

        // Notification
        try {
            await Notification.create({
                userId: req.params.userId,
                type: NotificationType.GRADE_UPDATED,
                message: `Your grade for quiz "${quiz.title}" has been updated.`,
                metadata: { quizId: quiz._id, title: quiz.title, grade, pointsAwarded: newPoints },
                read: false,
            });
        } catch (notifyError) {
            logger.error('Failed to create GRADE_UPDATED notification:', notifyError);
        }

        res.json({
            success: true,
            data: {
                submissionId: submission._id,
                teacherGrade: submission.teacherGrade,
                teacherFeedback: submission.teacherFeedback,
                pointsAwarded: submission.pointsAwarded,
                gradedAt: submission.gradedAt,
            },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message || 'Failed to grade student' });
    }
});

export default router;

