import { Router, Response } from 'express';
import { User } from '../models/User.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { Quiz } from '../models/Quiz.js';
import { Task } from '../models/Task.js';
import Tutorial from '../models/Tutorial.js';

const router = Router();

// Middleware to check if user is a teacher
const teacherMiddleware = async (req: AuthRequest, res: Response, next: any) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Teachers only.',
      });
    }
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get teacher stats
router.get('/stats', authMiddleware, teacherMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const [totalStudents, totalQuizzes, totalTasks, totalTutorials] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Quiz.countDocuments({ createdBy: req.userId }),
      Task.countDocuments({ createdBy: req.userId }),
      Tutorial.countDocuments({ createdBy: req.userId }),
    ]);

    // Get active students (logged in within last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const activeStudents = await User.countDocuments({
      role: 'user',
      lastLogin: { $gte: sevenDaysAgo },
    });

    res.json({
      success: true,
      totalStudents,
      activeStudents,
      totalQuizzes,
      totalTasks,
      totalTutorials,
      pendingSubmissions: 0,
      averageClassScore: 0,
    });
  } catch (error) {
    console.error('Error fetching teacher stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

// Get students list
router.get('/students', authMiddleware, teacherMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;

    const filter: any = { role: 'user' };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [students, total] = await Promise.all([
      User.find(filter, {
        name: 1,
        email: 1,
        totalPoints: 1,
        createdAt: 1,
        lastLogin: 1,
        avatarImage: 1,
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    const formattedStudents = students.map(student => ({
      id: student._id,
      name: student.name,
      email: student.email,
      totalPoints: student.totalPoints || 0,
      completedTutorials: 0,
      completedQuizzes: 0,
      averageScore: 0,
      lastActive: student.lastLogin || student.createdAt,
      avatarImage: student.avatarImage,
    }));

    res.json({
      success: true,
      students: formattedStudents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch students' });
  }
});

// Get student details
router.get('/students/:id', authMiddleware, teacherMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: 'user' }, {
      name: 1,
      email: 1,
      totalPoints: 1,
      createdAt: 1,
      lastLogin: 1,
      avatarImage: 1,
      bio: 1,
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.json({
      success: true,
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        totalPoints: student.totalPoints || 0,
        bio: student.bio,
        avatarImage: student.avatarImage,
        joinedAt: student.createdAt,
        lastActive: student.lastLogin || student.createdAt,
      },
    });
  } catch (error) {
    console.error('Error fetching student details:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch student details' });
  }
});

// Get pending submissions (placeholder)
router.get('/submissions/pending', authMiddleware, teacherMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // This would need a submissions model - returning empty for now
    res.json({
      success: true,
      submissions: [],
    });
  } catch (error) {
    console.error('Error fetching pending submissions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch submissions' });
  }
});

// Grade submission (placeholder)
router.post('/submissions/:id/grade', authMiddleware, teacherMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { grade, feedback } = req.body;
    // This would update a submission - placeholder for now
    res.json({
      success: true,
      message: 'Submission graded successfully',
    });
  } catch (error) {
    console.error('Error grading submission:', error);
    res.status(500).json({ success: false, message: 'Failed to grade submission' });
  }
});

export default router;
