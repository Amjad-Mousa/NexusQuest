import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import Tutorial from '../models/Tutorial.js';
import { User } from '../models/User.js';
import TutorialSettings from '../models/TutorialSettings.js';
import { UserTutorialProgress } from '../models/UserTutorialProgress.js';
import { Notification } from '../models/Notification.js';
import { NotificationType } from '../enums/NotificationType.js';

// Middleware to check if user is a teacher (simplified - removed type check)
const requireTeacher = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    if (!req.userId) {
      return res.status(403).json({ error: 'Access denied. Authentication required.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authorization check failed' });
  }
};

const router = Router();

// Public endpoint for mobile - Get all tutorials without auth
router.get('/public', async (req: AuthRequest, res: Response) => {
  console.log('👉 GET /api/tutorials/public hit');
  try {
    const { language, difficulty } = req.query;

    const filter: any = { isPublished: true };

    if (language) {
      filter.language = language;
    }

    if (difficulty) {
      filter.difficulty = difficulty;
    }

    const tutorials = await Tutorial.find(filter)
      .populate('createdBy', 'name email')
      .sort({ language: 1, order: 1 });

    res.json(tutorials);
  } catch (error: any) {
    console.error('❌ Error fetching public tutorials:', error);
    res.status(500).json({ error: 'Failed to fetch tutorials' });
  }
});

// Get tutorial visibility settings (MUST be before /:id route)
router.get('/settings/visibility', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const settings = await TutorialSettings.find({});

    // Convert to object format: { tutorialId: isPublished }
    const settingsMap: Record<string, boolean> = {};
    settings.forEach(setting => {
      settingsMap[setting.tutorialId] = setting.isPublished;
    });

    res.json(settingsMap);
  } catch (error: any) {
    console.error('Error fetching tutorial settings:', error);
    res.status(500).json({ error: 'Failed to fetch tutorial settings' });
  }
});

// Toggle tutorial visibility (teachers only) (MUST be before /:id route)
router.post('/settings/:tutorialId/toggle', authMiddleware, requireTeacher, async (req: AuthRequest, res: Response) => {
  try {
    const { tutorialId } = req.params;

    let setting = await TutorialSettings.findOne({ tutorialId });

    if (!setting) {
      // Create new setting with opposite of default (default is true, so toggle to false)
      setting = new TutorialSettings({
        tutorialId,
        isPublished: false,
      });
    } else {
      // Toggle existing setting
      setting.isPublished = !setting.isPublished;
    }

    await setting.save();

    res.json({
      tutorialId: setting.tutorialId,
      isPublished: setting.isPublished,
    });
  } catch (error: any) {
    console.error('Error toggling tutorial visibility:', error);
    res.status(500).json({ error: 'Failed to toggle tutorial visibility' });
  }
});

// Get all tutorials - Public endpoint for mobile (no auth required)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { language, difficulty } = req.query;

    const filter: any = { isPublished: true };

    if (language) {
      filter.language = language;
    }

    if (difficulty) {
      filter.difficulty = difficulty;
    }

    const tutorials = await Tutorial.find(filter)
      .populate('createdBy', 'name email')
      .sort({ language: 1, order: 1 });

    res.json(tutorials);
  } catch (error: any) {
    console.error('Error fetching tutorials:', error);
    res.status(500).json({ error: 'Failed to fetch tutorials' });
  }
});

// Get tutorials by language (public - no auth required)
router.get('/language/:language', async (req: AuthRequest, res: Response) => {
  try {
    const { language } = req.params;

    const tutorials = await Tutorial.find({
      language,
      isPublished: true,
    })
      .populate('createdBy', 'name email')
      .sort({ order: 1 });

    res.json(tutorials);
  } catch (error: any) {
    console.error('Error fetching tutorials by language:', error);
    res.status(500).json({ error: 'Failed to fetch tutorials' });
  }
});

// Get single tutorial by ID (public - no auth required)
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const tutorial = await Tutorial.findOne({
      _id: id,
      isPublished: true,
    }).populate('createdBy', 'name email');

    if (!tutorial) {
      return res.status(404).json({ error: 'Tutorial not found' });
    }

    res.json(tutorial);
  } catch (error: any) {
    console.error('Error fetching tutorial:', error);
    res.status(500).json({ error: 'Failed to fetch tutorial' });
  }
});

// Get all tutorials for teacher (including unpublished)
router.get('/teacher/all', authMiddleware, requireTeacher, async (req: AuthRequest, res: Response) => {
  try {
    const tutorials = await Tutorial.find({
      createdBy: req.userId,
    })
      .populate('createdBy', 'name email')
      .sort({ language: 1, order: 1 });

    res.json(tutorials);
  } catch (error: any) {
    console.error('Error fetching teacher tutorials:', error);
    res.status(500).json({ error: 'Failed to fetch tutorials' });
  }
});

// Create new tutorial (teacher only)
router.post('/', authMiddleware, requireTeacher, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, language, content, difficulty, order, isPublished } = req.body;

    if (!title || !description || !language || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const tutorial = await Tutorial.create({
      title,
      description,
      language,
      content,
      difficulty: difficulty || 'beginner',
      order: order || 0,
      isPublished: isPublished || false,
      createdBy: req.userId,
    });

    const createdTutorial = await Tutorial.findById(tutorial._id)
      .populate('createdBy', 'name email');

    res.status(201).json(createdTutorial);
  } catch (error: any) {
    console.error('Error creating tutorial:', error);
    res.status(500).json({ error: 'Failed to create tutorial' });
  }
});

// Update tutorial (teacher only)
router.put('/:id', authMiddleware, requireTeacher, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, language, content, difficulty, order, isPublished } = req.body;

    const tutorial = await Tutorial.findOne({
      _id: id,
      createdBy: req.userId,
    });

    if (!tutorial) {
      return res.status(404).json({ error: 'Tutorial not found or unauthorized' });
    }

    if (title !== undefined) tutorial.title = title;
    if (description !== undefined) tutorial.description = description;
    if (language !== undefined) tutorial.language = language;
    if (content !== undefined) tutorial.content = content;
    if (difficulty !== undefined) tutorial.difficulty = difficulty;
    if (order !== undefined) tutorial.order = order;
    if (isPublished !== undefined) tutorial.isPublished = isPublished;

    await tutorial.save();

    const updatedTutorial = await Tutorial.findById(tutorial._id)
      .populate('createdBy', 'name email');

    res.json(updatedTutorial);
  } catch (error: any) {
    console.error('Error updating tutorial:', error);
    res.status(500).json({ error: 'Failed to update tutorial' });
  }
});

// Delete tutorial (teacher only)
router.delete('/:id', authMiddleware, requireTeacher, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const tutorial = await Tutorial.findOne({
      _id: id,
      createdBy: req.userId,
    });

    if (!tutorial) {
      return res.status(404).json({ error: 'Tutorial not found or unauthorized' });
    }

    await tutorial.deleteOne();

    res.json({ message: 'Tutorial deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting tutorial:', error);
    res.status(500).json({ error: 'Failed to delete tutorial' });
  }
});

// Get available languages
router.get('/meta/languages', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const languages = await Tutorial.distinct('language', { isPublished: true });

    res.json(languages);
  } catch (error: any) {
    console.error('Error fetching languages:', error);
    res.status(500).json({ error: 'Failed to fetch languages' });
  }
});

// Mark tutorial as started
router.post('/:id/start', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const tutorial = await Tutorial.findById(id);
    if (!tutorial) {
      return res.status(404).json({ error: 'Tutorial not found' });
    }

    const progress = await UserTutorialProgress.findOneAndUpdate(
      { userId: req.userId, tutorialId: id },
      {
        userId: req.userId,
        tutorialId: id,
        status: 'in_progress',
      },
      { new: true, upsert: true }
    );

    res.json({ success: true, data: progress });
  } catch (error: any) {
    console.error('Error starting tutorial:', error);
    res.status(500).json({ error: 'Failed to start tutorial' });
  }
});

// Mark tutorial as completed
router.post('/:id/complete', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const tutorial = await Tutorial.findById(id);
    if (!tutorial) {
      return res.status(404).json({ error: 'Tutorial not found' });
    }

    const existingProgress = await UserTutorialProgress.findOne({
      userId: req.userId,
      tutorialId: id,
    });

    const isFirstCompletion = !existingProgress || existingProgress.status !== 'completed';

    const progress = await UserTutorialProgress.findOneAndUpdate(
      { userId: req.userId, tutorialId: id },
      {
        userId: req.userId,
        tutorialId: id,
        status: 'completed',
        completedAt: new Date(),
      },
      { new: true, upsert: true }
    );

    if (isFirstCompletion) {
      // Create completion notification
      try {
        await Notification.create({
          userId: req.userId,
          type: NotificationType.Task_COMPLETED,
          message: `You completed the tutorial "${tutorial.title}"`,
          metadata: {
            tutorialId: id,
            tutorialTitle: tutorial.title,
          },
          read: false,
        });
      } catch (notifyError) {
        console.error('Failed to create tutorial completion notification:', notifyError);
      }

    }

    res.json({ success: true, data: progress });
  } catch (error: any) {
    console.error('Error completing tutorial:', error);
    res.status(500).json({ error: 'Failed to complete tutorial' });
  }
});

// Get user's tutorial progress
router.get('/progress/my', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const progress = await UserTutorialProgress.find({ userId: req.userId })
      .populate('tutorialId')
      .sort({ updatedAt: -1 });

    res.json({ success: true, data: progress });
  } catch (error: any) {
    console.error('Error fetching tutorial progress:', error);
    res.status(500).json({ error: 'Failed to fetch tutorial progress' });
  }
});

export default router;
