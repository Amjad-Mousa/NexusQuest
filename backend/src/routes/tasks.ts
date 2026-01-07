import { Router, Response } from 'express';
import { Task } from '../models/Task.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { UserTaskProgress } from '../models/UserTaskProgress.js';
import { executeCode } from '../services/dockerService.js';
import { Notification } from '../models/Notification.js';
import { NotificationType } from '../enums/NotificationType.js';
import { awardXPForTask } from '../services/gamificationService.js';
import { executeCodeInTempContainer } from '../utils/tempContainerExec.js';
import { logger } from '../utils/logger.js';

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

// Get all tasks (available to all users, filtered by assignedTo for students)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { difficulty, language, createdBy } = req.query;
    const filter: Record<string, unknown> = {};

    if (difficulty) filter.difficulty = difficulty;
    if (language) filter.language = language;
    if (createdBy) filter.createdBy = createdBy;

    // Check if user is a teacher or student
    const user = await User.findById(req.userId);

    let tasks;
    if (user && user.role === 'teacher') {
      // Teachers see all tasks
      tasks = await Task.find(filter)
        .populate('createdBy', 'name email')
        .populate('assignedTo', '_id name email')
        .sort({ createdAt: -1 });
    } else {
      // Students only see tasks assigned to them OR tasks with empty assignedTo (all students)
      tasks = await Task.find({
        ...filter,
        $or: [
          { assignedTo: { $size: 0 } }, // Empty array = all students
          { assignedTo: { $exists: false } }, // No assignedTo field = all students
          { assignedTo: req.userId } // Assigned to this specific student
        ]
      })
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 });
    }

    res.json({
      success: true,
      data: tasks,
    });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch tasks' });
  }
});

// Get tasks created by the current teacher (includes solution)
router.get('/my-tasks', teacherMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const tasks = await Task.find({ createdBy: req.userId })
      .select('+solution') // Include solution for teacher's own tasks
      .populate('assignedTo', '_id name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: tasks,
    });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch tasks' });
  }
});

// Get list of students (for task assignment) - MUST be before /:id route
router.get('/students/list', teacherMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // In this system, 'user' role represents students (non-teachers)
    const students = await User.find({ role: 'user' })
      .select('_id name email')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: students,
    });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch students' });
  }
});

// Get a single task by ID
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', '_id name email');

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    res.json({ success: true, data: task });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch task' });
  }
});

// Create a new task (teachers only)
router.post('/', teacherMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, points, difficulty, language, starterCode, solution, testCases, assignedTo } = req.body;

    if (!Array.isArray(testCases) || testCases.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one test case is required' });
    }

    const task = await Task.create({
      title,
      description,
      points,
      difficulty,
      language: language || 'python',
      createdBy: req.userId,
      starterCode,
      solution,
      testCases,
      assignedTo: assignedTo || [],
    });

    // Award points to teacher for creating content
    const teacherPoints = 20; // Points for creating a task
    await User.findByIdAndUpdate(req.userId, { $inc: { totalPoints: teacherPoints } });

    try {
      await Notification.create({
        userId: req.userId,
        type: NotificationType.POINTS_EARNED,
        message: `You earned ${teacherPoints} points for creating task "${title}"`,
        metadata: {
          taskId: task._id,
          taskTitle: title,
          points: teacherPoints,
          reason: 'task_creation',
        },
        read: false,
      });
    } catch (notifyError) {
      logger.error('Failed to create task creation notification:', notifyError);
    }

    res.status(201).json({ success: true, data: task });
  } catch (error: unknown) {
    const err = error as Error;
    res.status(400).json({ success: false, error: err.message || 'Failed to create task' });
  }
});

// Update a task (teachers only, own tasks)
router.put('/:id', teacherMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, createdBy: req.userId })
      .select('+solution'); // Include solution for updating

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found or not authorized' });
    }

    const { title, description, points, difficulty, language, starterCode, solution, testCases, assignedTo } = req.body;

    if (title) task.title = title;
    if (description) task.description = description;
    if (points) task.points = points;
    if (difficulty) task.difficulty = difficulty;
    if (language) task.language = language;
    if (starterCode !== undefined) task.starterCode = starterCode;
    if (solution !== undefined) task.solution = solution;
    if (testCases !== undefined) {
      if (!Array.isArray(testCases) || testCases.length === 0) {
        return res.status(400).json({ success: false, error: 'At least one test case is required' });
      }
      task.testCases = testCases;
    }
    if (assignedTo !== undefined) task.assignedTo = assignedTo;

    await task.save();

    res.json({ success: true, data: task });
  } catch (error: unknown) {
    const err = error as Error;
    res.status(400).json({ success: false, error: err.message || 'Failed to update task' });
  }
});

// Delete a task (teachers only, own tasks)
router.delete('/:id', teacherMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, createdBy: req.userId });

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found or not authorized' });
    }

    res.json({ success: true, message: 'Task deleted' });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to delete task' });
  }
});

// Run all test cases for a task against submitted code
router.post('/:id/run-tests', async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body as { code?: string };

    if (!code || !code.trim()) {
      return res.status(400).json({ success: false, error: 'Code is required' });
    }

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    const testCases = task.testCases || [];

    if (testCases.length === 0) {
      return res.status(400).json({ success: false, error: 'No test cases defined for this task' });
    }

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

    // Execute test cases sequentially to avoid Docker container overload
    const timeoutMs = 15000; // Increased timeout per test

    for (let i = 0; i < testCases.length; i++) {
      const test = testCases[i];
      try {
        const execResult = await executeCodeInTempContainer(code, task.language, test.input, {
          sessionIdPrefix: 'task-test',
          timeoutMs: timeoutMs
        });

        const actual = execResult.error
          ? execResult.error
          : execResult.output;

        const passed = !execResult.error && normalize(actual) === normalize(test.expectedOutput);

        results.push({
          index: i,
          passed,
          // Show input only if not hidden
          input: test.isHidden ? '(hidden)' : test.input,
          // Never show expected output to students
          actualOutput: test.isHidden ? (passed ? '(correct)' : '(incorrect)') : actual,
          error: execResult.error || undefined,
        });
      } catch (error: any) {
        logger.error(`Test case ${i} failed:`, error.message);
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

    let completionUpdated = false;

    if (passed === results.length) {
      const userId = req.userId;
      const taskId = req.params.id;

      const existingProgress = await UserTaskProgress.findOne({ userId, taskId });

      const isFirstCompletion = !existingProgress || existingProgress.status !== 'completed';

      await UserTaskProgress.findOneAndUpdate(
        { userId, taskId },
        {
          userId,
          taskId,
          status: 'completed',
          code,
          completedAt: new Date(),
        },
        { new: true, upsert: true }
      );

      if (isFirstCompletion) {
        // Points for first completion
        if (typeof task.points === 'number' && task.points > 0) {
          await User.findByIdAndUpdate(userId, { $inc: { totalPoints: task.points } });

          try {
            await Notification.create({
              userId,
              type: NotificationType.POINTS_EARNED,
              message: `You earned ${task.points} points for completing task "${task.title}"`,
              metadata: {
                taskId,
                taskTitle: task.title,
                points: task.points,
                reason: 'task_completion',
              },
              read: false,
            });
          } catch (notifyError) {
            logger.error('Failed to create POINTS_EARNED notification:', notifyError);
          }
        }

        // Task completed notification
        try {
          await Notification.create({
            userId,
            type: NotificationType.Task_COMPLETED,
            message: `You completed the task "${task.title}"`,
            metadata: {
              taskId,
              taskTitle: task.title,
            },
            read: false,
          });
        } catch (notifyError) {
          logger.error('Failed to create TASK_COMPLETED notification:', notifyError);
        }

        // Award XP and check achievements
        try {
          if (userId) {
            const gamificationResult = await awardXPForTask(
              userId.toString(),
              task.points || 10,
              task.language || 'python'
            );

            logger.info(`✅ Task completed: User ${userId} earned ${task.points || 10} XP`);
            if (gamificationResult.leveledUp) {
              logger.info(`🎉 User leveled up to level ${gamificationResult.newLevel}!`);
            }
            if (gamificationResult.newAchievements.length > 0) {
              logger.info(`🏆 Unlocked ${gamificationResult.newAchievements.length} new achievements`);
              gamificationResult.newAchievements.forEach((ach: any) => {
                logger.info(`   - ${ach.icon} ${ach.title}`);
              });
            }
          }
        } catch (gamificationError) {
          logger.error('Failed to award XP or check achievements:', gamificationError);
        }

        completionUpdated = true;
      }
    }

    res.json({
      success: true,
      data: {
        total: results.length,
        passed,
        results,
        completed: completionUpdated,
      },
    });
  } catch (error: any) {
    logger.error('Failed to run tests:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to run tests',
    });
  }
});

export default router;