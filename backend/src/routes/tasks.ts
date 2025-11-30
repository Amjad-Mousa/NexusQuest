import { Router, Response } from 'express';
import { Task } from '../models/Task.js';
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

// Get all tasks (available to all users)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { difficulty, language, createdBy } = req.query;
    const filter: Record<string, unknown> = {};

    if (difficulty) filter.difficulty = difficulty;
    if (language) filter.language = language;
    if (createdBy) filter.createdBy = createdBy;

    const tasks = await Task.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

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
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: tasks,
    });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch tasks' });
  }
});

// Get a single task by ID
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('createdBy', 'name email');

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
    const { title, description, points, difficulty, language, starterCode, solution, testCases } = req.body;

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
    });

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

    const { title, description, points, difficulty, language, starterCode, solution, testCases } = req.body;

    if (title) task.title = title;
    if (description) task.description = description;
    if (points) task.points = points;
    if (difficulty) task.difficulty = difficulty;
    if (language) task.language = language;
    if (starterCode !== undefined) task.starterCode = starterCode;
    if (solution !== undefined) task.solution = solution;
    if (testCases) task.testCases = testCases;

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
      expectedOutput: string;
      actualOutput: string;
      error?: string;
    }>;

    for (let i = 0; i < testCases.length; i++) {
      const test = testCases[i];

      try {
        const execResult = await executeCode(code, task.language, test.input);

        const actual = execResult.error
          ? execResult.error
          : execResult.output;

        const passed = !execResult.error && normalize(actual) === normalize(test.expectedOutput);

        results.push({
          index: i,
          passed,
          input: test.isHidden ? '' : test.input,
          expectedOutput: test.isHidden ? '' : test.expectedOutput,
          actualOutput: test.isHidden ? '' : actual,
          error: execResult.error || undefined,
        });
      } catch (error: any) {
        results.push({
          index: i,
          passed: false,
          input: test.isHidden ? '' : test.input,
          expectedOutput: test.isHidden ? '' : test.expectedOutput,
          actualOutput: '',
          error: error?.message || 'Execution failed',
        });
      }
    }

    const passed = results.filter(r => r.passed).length;

    res.json({
      success: true,
      data: {
        total: results.length,
        passed,
        results,
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
