import { Router, Response } from 'express';
import { User, UserRole } from '../models/User.js';
import { generateToken, authMiddleware, AuthRequest } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { UserTaskProgress } from '../models/UserTaskProgress.js';
import { Task } from '../models/Task.js';

const router = Router();

/**
 * POST /api/auth/signup
 * Register a new user
 */
router.post('/signup', async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and password are required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters',
      });
    }

    // Validate role if provided
    const validRoles: UserRole[] = ['user', 'teacher'];
    const userRole: UserRole = role && validRoles.includes(role) ? role : 'user';

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered',
      });
    }

    // Create new user
    const user = new User({
      name,
      email: email.toLowerCase(),
      password,
      role: userRole,
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id.toString(), user.email);

    logger.info(`New ${user.role} registered: ${user.email}`);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarImage: user.avatarImage,
        coverImage: user.coverImage,
      },
    });
  } catch (error) {
    logger.error('Signup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create account',
    });
  }
});

/**
 * GET /api/auth/users
 * Get list of users for chat (basic info only)
 */
router.get('/users', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.find({}, {
      name: 1,
      email: 1,
      role: 1,
    })
      .sort({ name: 1 })
      .lean();

    res.json({
      success: true,
      users: users.map(u => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
      })),
    });
  } catch (error) {
    logger.error('List users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load users',
    });
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    // Find user with password
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Generate token
    const token = generateToken(user._id.toString(), user.email);

    logger.info(`User logged in: ${user.email}`);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarImage: user.avatarImage,
        coverImage: user.coverImage,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // Fetch fresh user data to get totalPoints
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarImage: user.avatarImage,
        coverImage: user.coverImage,
        totalPoints: user.totalPoints,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile',
    });
  }
});

/**
 * PUT /api/auth/profile/images
 * Update user avatar and cover images
 */
router.put('/profile/images', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { avatarImage, coverImage } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Update images if provided
    if (avatarImage !== undefined) {
      user.avatarImage = avatarImage;
    }
    if (coverImage !== undefined) {
      user.coverImage = coverImage;
    }

    await user.save();

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarImage: user.avatarImage,
        coverImage: user.coverImage,
      },
    });
  } catch (error) {
    logger.error('Update images error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update images',
    });
  }
});

/**
 * PUT /api/auth/profile
 * Update user profile (name and/or password)
 */
router.put('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { name, password } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Update name if provided
    if (name && name.trim()) {
      user.name = name.trim();
    }

    // Update password if provided
    if (password && password.trim()) {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 6 characters',
        });
      }
      user.password = password;
    }

    await user.save();

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarImage: user.avatarImage,
        coverImage: user.coverImage,
      },
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
    });
  }
});

/**
 * POST /api/auth/sync-points
 * Recalculate totalPoints based on completed tasks (for migration)
 */
router.post('/sync-points', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Get all completed tasks for this user
    const completedProgress = await UserTaskProgress.find({
      userId,
      status: 'completed',
    });

    // Calculate total points from completed tasks
    let totalPoints = 0;
    for (const progress of completedProgress) {
      const task = await Task.findById(progress.taskId);
      if (task) {
        totalPoints += task.points;
      }
    }

    // Update user's totalPoints
    const user = await User.findByIdAndUpdate(
      userId,
      { totalPoints },
      { new: true }
    );

    logger.info(`Synced points for user ${userId}: ${totalPoints} points from ${completedProgress.length} tasks`);

    res.json({
      success: true,
      totalPoints,
      completedTasks: completedProgress.length,
      user: {
        id: user?._id,
        name: user?.name,
        totalPoints: user?.totalPoints,
      },
    });
  } catch (error) {
    logger.error('Sync points error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync points',
    });
  }
});

export default router;

