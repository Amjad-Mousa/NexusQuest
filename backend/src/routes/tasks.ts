import { Router, Response } from 'express';
import { Task } from '../models/Task.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { UserTaskProgress } from '../models/UserTaskProgress.js';
import { executeCode } from '../services/dockerService.js';
import { Notification } from '../models/Notification.js';
import { NotificationType } from '../enums/NotificationType.js';
import { awardXPForTask } from '../services/gamificationService.js';
import Docker from 'dockerode';
import { logger } from '../utils/logger.js';
import { languageImages, getDefaultFileName } from '../utils/execution.js';

const router = Router();
const docker = new Docker();

// Execute code in temporary container (like playground)
async function executeCodeInTempContainer(code: string, language: string, input?: string): Promise<{ output: string; error: string }> {
  const sessionId = `task-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const containerName = `nexusquest-task-${sessionId}`;

  logger.info(`Task test execution: language=${language}, sessionId=${sessionId}`);

  try {
    // Check and remove existing container (shouldn't exist but safety check)
    try {
      const existingContainer = docker.getContainer(containerName);
      await existingContainer.inspect();
      logger.info(`Removing existing container: ${containerName}`);
      await existingContainer.remove({ force: true });
    } catch (error: any) {
      if (error.statusCode !== 404) {
        logger.warn(`Error checking existing container: ${error.message}`);
      }
    }

    // Create temporary container
    const container = await docker.createContainer({
      Image: languageImages[language],
      name: containerName,
      Cmd: ['sh', '-c', 'while true; do sleep 1; done'],
      Tty: true,
      OpenStdin: true,
      StdinOnce: false,
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      HostConfig: {
        Memory: 256 * 1024 * 1024,
        AutoRemove: false,
        NetworkMode: 'none',
        Tmpfs: {
          '/tmp': 'rw,exec,nosuid,size=50m'
        }
      }
    });

    await container.start();
    logger.info(`Task test container started: ${containerName}`);

    // Write code to file
    const fileName = getDefaultFileName(language, 'task-test', code);
    const filePath = `/tmp/${fileName}`;

    // Write code using cat with heredoc to avoid issues with special characters
    const escapedCode = code.replace(/'/g, "'\\''");
    const writeCmd = [
      `cat > ${filePath} << 'EOFCODE'`,
      escapedCode,
      'EOFCODE'
    ].join('\n');

    const writeExec = await container.exec({
      Cmd: ['sh', '-c', writeCmd],
      AttachStdout: true,
      AttachStderr: true
    });
    await writeExec.start({});

    // Prepare execution command
    let execCommand: string;
    let className: string | undefined;

    if (language === 'python') {
      execCommand = `python3 -u ${filePath}`;
    } else if (language === 'javascript') {
      execCommand = `node ${filePath}`;
    } else if (language === 'cpp') {
      execCommand = `g++ -std=c++20 ${filePath} -o /tmp/a.out && /tmp/a.out`;
    } else if (language === 'java') {
      const classMatch = code.match(/public\s+class\s+(\w+)/);
      className = classMatch ? classMatch[1] : 'Main';
      execCommand = `cd /tmp && javac ${fileName} && java -cp /tmp ${className}`;
    } else {
      await container.remove({ force: true });
      return { output: '', error: 'Unsupported language' };
    }

    // Execute code
    const exec = await container.exec({
      Cmd: ['sh', '-c', execCommand],
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: false
    });

    const stream = await exec.start({
      hijack: true,
      stdin: true
    });

    // Send input if provided
    if (input) {
      stream.write(input + '\n');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    stream.end();

    // Collect output
    const outputPromise = new Promise<{ stdout: string; stderr: string }>((resolve) => {
      let stdout = '';
      let stderr = '';

      stream.on('data', (chunk: Buffer) => {
        const data = chunk.toString('utf8');
        stdout += data;
      });

      stream.on('error', (error: Error) => {
        stderr += error.message;
      });

      stream.on('end', () => {
        resolve({ stdout, stderr });
      });
    });

    // Set timeout
    const timeoutPromise = new Promise<{ stdout: string; stderr: string }>((_, reject) => {
      setTimeout(() => {
        stream.destroy();
        reject(new Error('Execution timeout (10 seconds)'));
      }, 10000);
    });

    const { stdout, stderr } = await Promise.race([outputPromise, timeoutPromise]);

    // Clean up container
    try {
      await container.stop();
      await new Promise(resolve => setTimeout(resolve, 500));
      await container.remove({ force: true });
      logger.info(`Task test container removed: ${containerName}`);
    } catch (err: any) {
      if (err.statusCode !== 404 && !err.message?.includes('No such container')) {
        logger.warn(`Error removing task test container: ${err.message}`);
      }
    }

    return {
      output: stdout.trim() || 'Code executed successfully (no output)',
      error: stderr.trim()
    };

  } catch (error: any) {
    logger.error('Task test execution failed:', error);

    // Try to clean up container if it still exists
    try {
      const container = docker.getContainer(containerName);
      await container.remove({ force: true });
    } catch (cleanupErr) {
      // Ignore cleanup errors
    }

    return {
      output: '',
      error: error.message || 'Execution failed'
    };
  }
}

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
      console.error('Failed to create task creation notification:', notifyError);
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

    for (let i = 0; i < testCases.length; i++) {
      const test = testCases[i];

      try {
        // Hard timeout per test so a hanging container doesn't block all results
        const execResult = await Promise.race([
          executeCodeInTempContainer(code, task.language, test.input),
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
          // Show input only if not hidden
          input: test.isHidden ? '(hidden)' : test.input,
          // Never show expected output to students
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
            console.error('Failed to create POINTS_EARNED notification (task run-tests):', notifyError);
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
          console.error('Failed to create TASK_COMPLETED notification (task run-tests):', notifyError);
        }

        // Award XP and check achievements
        try {
          if (userId) {
            const gamificationResult = await awardXPForTask(
              userId.toString(),
              task.points || 10,
              task.language || 'python'
            );

            console.log(`✅ Task completed: User ${userId} earned ${task.points || 10} XP`);
            if (gamificationResult.leveledUp) {
              console.log(`🎉 User leveled up to level ${gamificationResult.newLevel}!`);
            }
            if (gamificationResult.newAchievements.length > 0) {
              console.log(`🏆 Unlocked ${gamificationResult.newAchievements.length} new achievements:`);
              gamificationResult.newAchievements.forEach((ach: any) => {
                console.log(`   - ${ach.icon} ${ach.title}`);
              });
            }
          }
        } catch (gamificationError) {
          console.error('Failed to award XP or check achievements:', gamificationError);
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
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to run tests',
    });
  }
});

export default router;