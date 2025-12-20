import { Router, Request, Response } from 'express';
import { User } from '../models/User.js';
import { Task } from '../models/Task.js';
import Tutorial from '../models/Tutorial.js';
import { Quiz } from '../models/Quiz.js';

const router = Router();

// Public stats endpoint - no auth required
router.get('/', async (req: Request, res: Response) => {
  try {
    // Get counts from database
    const [usersCount, tasksCount, tutorialsCount, quizzesCount] = await Promise.all([
      User.countDocuments(),
      Task.countDocuments(),
      Tutorial.countDocuments(),
      Quiz.countDocuments(),
    ]);

    // Get unique languages from tasks and quizzes
    const [taskLanguages, quizLanguages] = await Promise.all([
      Task.distinct('language'),
      Quiz.distinct('language'),
    ]);

    // Combine and deduplicate languages
    const allLanguages = [...new Set([...taskLanguages, ...quizLanguages])];
    
    // Fallback to default languages if none found
    const languages = allLanguages.length > 0 ? allLanguages : ['python', 'javascript', 'java', 'cpp'];

    res.json({
      users: usersCount,
      challenges: tasksCount + quizzesCount,
      tutorials: tutorialsCount,
      languages: languages.length,
      languagesList: languages,
    });
  } catch (error: any) {
    console.error('Error fetching public stats:', error);
    // Return fallback stats on error
    res.json({
      users: 0,
      challenges: 0,
      tutorials: 0,
      languages: 4,
      languagesList: ['python', 'javascript', 'java', 'cpp'],
    });
  }
});

export default router;
