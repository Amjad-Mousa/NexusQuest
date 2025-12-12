import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { UserTaskProgress } from '../models/UserTaskProgress.js';
import { Task } from '../models/Task.js';
import { Notification } from '../models/Notification.js';
import { NotificationType } from '../enums/NotificationType.js';
import { awardXPForTask } from '../services/gamificationService.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get user's task progress (tasks they've started or completed)
router.get('/my-progress', async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    const filter: Record<string, unknown> = { userId: req.userId };

    if (status) filter.status = status;

    const progress = await UserTaskProgress.find(filter)
      .populate({
        path: 'taskId',
        populate: { path: 'createdBy', select: 'name email' }
      })
      .sort({ updatedAt: -1 });

    res.json({ success: true, data: progress });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch progress' });
  }
});

// Get progress for a specific task
router.get('/:taskId', async (req: AuthRequest, res: Response) => {
  try {
    const progress = await UserTaskProgress.findOne({
      userId: req.userId,
      taskId: req.params.taskId,
    });

    res.json({ success: true, data: progress });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch progress' });
  }
});

// Start a task (or get existing progress)
router.post('/:taskId/start', async (req: AuthRequest, res: Response) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    // Use findOneAndUpdate with upsert to handle race conditions atomically
    const progress = await UserTaskProgress.findOneAndUpdate(
      { userId: req.userId, taskId: req.params.taskId },
      {
        $setOnInsert: {
          userId: req.userId,
          taskId: req.params.taskId,
          status: 'started',
          code: task.starterCode || '',
          startedAt: new Date(),
        }
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, data: progress });
  } catch (error: unknown) {
    const err = error as Error;
    res.status(400).json({ success: false, error: err.message || 'Failed to start task' });
  }
});

// Save code progress
router.put('/:taskId/save', async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;

    const progress = await UserTaskProgress.findOneAndUpdate(
      { userId: req.userId, taskId: req.params.taskId },
      { code },
      { new: true }
    );

    if (!progress) {
      return res.status(404).json({ success: false, error: 'Progress not found. Start the task first.' });
    }

    res.json({ success: true, data: progress });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to save progress' });
  }
});

// Mark task as completed
router.put('/:taskId/complete', async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;

    const progress = await UserTaskProgress.findOneAndUpdate(
      { userId: req.userId, taskId: req.params.taskId },
      {
        status: 'completed',
        code,
        completedAt: new Date(),
      },
      { new: true }
    );

    if (!progress) {
      return res.status(404).json({ success: false, error: 'Progress not found. Start the task first.' });
    }

    // Fire-and-forget task completion notification and gamification
    try {
      const task = await Task.findById(req.params.taskId);
      if (task && req.userId) {
        // Create notification
        await Notification.create({
          userId: req.userId,
          type: NotificationType.Task_COMPLETED,
          message: `You completed the task "${task.title}"`,
          metadata: {
            taskId: task._id,
            taskTitle: task.title,
          },
          read: false,
        });

        // Award XP and check achievements
        const gamificationResult = await awardXPForTask(
          req.userId.toString(),
          task.points || 10,
          task.language
        );

        console.log(`Task completed: User ${req.userId} earned ${task.points || 10} XP`);
        if (gamificationResult.leveledUp) {
          console.log(`User leveled up to level ${gamificationResult.newLevel}!`);
        }
        if (gamificationResult.newAchievements.length > 0) {
          console.log(`Unlocked ${gamificationResult.newAchievements.length} new achievements!`);
        }
      }
    } catch (notifyError) {
      console.error('Failed to create TASK_COMPLETED notification or award XP:', notifyError);
    }

    res.json({ success: true, data: progress });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to complete task' });
  }
});

// Get another user's task progress (for viewing their profile)
router.get('/user/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    const filter: Record<string, unknown> = { userId };
    if (status) filter.status = status;

    const progress = await UserTaskProgress.find(filter)
      .populate({
        path: 'taskId',
        populate: { path: 'createdBy', select: 'name email' }
      })
      .sort({ updatedAt: -1 })
      .limit(10); // Limit to recent 10 activities

    res.json({ success: true, data: progress });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch user progress' });
  }
});

export default router;

