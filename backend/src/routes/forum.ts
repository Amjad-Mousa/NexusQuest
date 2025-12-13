import express from 'express';
import { Question } from '../models/Question';
import { Answer } from '../models/Answer';
import { authMiddleware } from '../middleware/auth';
import mongoose from 'mongoose';

const router = express.Router();

// ==================== QUESTIONS ====================

// Get all questions with pagination and filters
router.get('/questions', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const filter: any = {};

    // Filter by language
    if (req.query.language && req.query.language !== 'all') {
      filter.programmingLanguage = req.query.language;
    }

    // Filter by tag
    if (req.query.tag) {
      filter.tags = req.query.tag;
    }

    // Filter by resolved status
    if (req.query.resolved === 'true') {
      filter.isResolved = true;
    } else if (req.query.resolved === 'false') {
      filter.isResolved = false;
    }

    // Search
    if (req.query.search) {
      filter.$text = { $search: req.query.search as string };
    }

    // Sort options
    let sort: any = { createdAt: -1 }; // Default: newest first
    if (req.query.sort === 'popular') {
      sort = { views: -1 };
    } else if (req.query.sort === 'unanswered') {
      filter.answersCount = 0;
      sort = { createdAt: -1 };
    }

    const [questionsRaw, total] = await Promise.all([
      Question.find(filter)
        .populate('author', 'name email role')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Question.countDocuments(filter),
    ]);

    const questions = questionsRaw.map(q => q.toJSON());

    res.json({
      success: true,
      questions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch questions' });
  }
});

// Get single question with answers
router.get('/questions/:id', async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate('author', 'name email role')
      .populate('acceptedAnswer');

    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const answers = await Answer.find({ question: req.params.id })
      .populate('author', 'name email role')
      .sort({ isAccepted: -1, createdAt: -1 });

    res.json({ success: true, question: question.toJSON(), answers: answers.map(a => a.toJSON()) });
  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch question' });
  }
});

// Create question
router.post('/questions', authMiddleware, async (req, res) => {
  try {
    const { title, content, tags, language, codeSnippet } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }

    const question = new Question({
      title,
      content,
      author: (req as any).user.id,
      tags: tags || [],
      programmingLanguage: language || 'general',
      codeSnippet,
    });

    await question.save();
    await question.populate('author', 'name email role');

    res.status(201).json({ success: true, question });
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ success: false, message: 'Failed to create question' });
  }
});

// Update question
router.put('/questions/:id', authMiddleware, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    if (question.author.toString() !== (req as any).user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { title, content, tags, language, codeSnippet } = req.body;

    question.title = title || question.title;
    question.content = content || question.content;
    question.tags = tags || question.tags;
    question.programmingLanguage = language || question.programmingLanguage;
    question.codeSnippet = codeSnippet;

    await question.save();
    await question.populate('author', 'name email role');

    res.json({ success: true, question });
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ success: false, message: 'Failed to update question' });
  }
});

// Delete question
router.delete('/questions/:id', authMiddleware, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const user = (req as any).user;
    if (question.author.toString() !== user.id && user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Delete all answers for this question
    await Answer.deleteMany({ question: req.params.id });
    await question.deleteOne();

    res.json({ success: true, message: 'Question deleted' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ success: false, message: 'Failed to delete question' });
  }
});

// Vote on question
router.post('/questions/:id/vote', authMiddleware, async (req, res) => {
  try {
    const { type } = req.body; // 'up' or 'down'
    const userId = new mongoose.Types.ObjectId((req as any).user.id);

    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    // Check if user already voted
    const hasUpvoted = question.upvotes.some(id => id.equals(userId));
    const hasDownvoted = question.downvotes.some(id => id.equals(userId));

    // Remove existing votes
    question.upvotes = question.upvotes.filter(id => !id.equals(userId));
    question.downvotes = question.downvotes.filter(id => !id.equals(userId));

    // Toggle logic: only add vote if it's different from existing vote
    if (type === 'up' && !hasUpvoted) {
      question.upvotes.push(userId);
    } else if (type === 'down' && !hasDownvoted) {
      question.downvotes.push(userId);
    }

    await question.save();

    res.json({
      success: true,
      upvotes: question.upvotes.length,
      downvotes: question.downvotes.length,
      voteScore: question.upvotes.length - question.downvotes.length,
    });
  } catch (error) {
    console.error('Error voting:', error);
    res.status(500).json({ success: false, message: 'Failed to vote' });
  }
});

// ==================== ANSWERS ====================

// Create answer
router.post('/questions/:id/answers', authMiddleware, async (req, res) => {
  try {
    const { content, codeSnippet } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const answer = new Answer({
      content,
      codeSnippet,
      author: (req as any).user.id,
      question: req.params.id,
    });

    await answer.save();
    await answer.populate('author', 'name email role');

    // Update answers count
    question.answersCount += 1;
    await question.save();

    res.status(201).json({ success: true, answer });
  } catch (error) {
    console.error('Error creating answer:', error);
    res.status(500).json({ success: false, message: 'Failed to create answer' });
  }
});

// Update answer
router.put('/answers/:id', authMiddleware, async (req, res) => {
  try {
    const answer = await Answer.findById(req.params.id);

    if (!answer) {
      return res.status(404).json({ success: false, message: 'Answer not found' });
    }

    if (answer.author.toString() !== (req as any).user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { content, codeSnippet } = req.body;
    answer.content = content || answer.content;
    answer.codeSnippet = codeSnippet;

    await answer.save();
    await answer.populate('author', 'name email role');

    res.json({ success: true, answer });
  } catch (error) {
    console.error('Error updating answer:', error);
    res.status(500).json({ success: false, message: 'Failed to update answer' });
  }
});

// Delete answer
router.delete('/answers/:id', authMiddleware, async (req, res) => {
  try {
    const answer = await Answer.findById(req.params.id);

    if (!answer) {
      return res.status(404).json({ success: false, message: 'Answer not found' });
    }

    const user = (req as any).user;
    if (answer.author.toString() !== user.id && user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Update question answers count
    await Question.findByIdAndUpdate(answer.question, { $inc: { answersCount: -1 } });

    // If this was the accepted answer, update question
    await Question.findOneAndUpdate(
      { acceptedAnswer: answer._id },
      { $unset: { acceptedAnswer: 1 }, isResolved: false }
    );

    await answer.deleteOne();

    res.json({ success: true, message: 'Answer deleted' });
  } catch (error) {
    console.error('Error deleting answer:', error);
    res.status(500).json({ success: false, message: 'Failed to delete answer' });
  }
});

// Vote on answer
router.post('/answers/:id/vote', authMiddleware, async (req, res) => {
  try {
    const { type } = req.body;
    const userId = new mongoose.Types.ObjectId((req as any).user.id);

    const answer = await Answer.findById(req.params.id);
    if (!answer) {
      return res.status(404).json({ success: false, message: 'Answer not found' });
    }

    // Check if user already voted
    const hasUpvoted = answer.upvotes.some(id => id.equals(userId));
    const hasDownvoted = answer.downvotes.some(id => id.equals(userId));

    // Remove existing votes
    answer.upvotes = answer.upvotes.filter(id => !id.equals(userId));
    answer.downvotes = answer.downvotes.filter(id => !id.equals(userId));

    // Toggle logic: only add vote if it's different from existing vote
    if (type === 'up' && !hasUpvoted) {
      answer.upvotes.push(userId);
    } else if (type === 'down' && !hasDownvoted) {
      answer.downvotes.push(userId);
    }

    await answer.save();

    res.json({
      success: true,
      upvotes: answer.upvotes.length,
      downvotes: answer.downvotes.length,
      voteScore: answer.upvotes.length - answer.downvotes.length,
    });
  } catch (error) {
    console.error('Error voting:', error);
    res.status(500).json({ success: false, message: 'Failed to vote' });
  }
});

// Accept answer (only question author can do this)
router.post('/answers/:id/accept', authMiddleware, async (req, res) => {
  try {
    const answer = await Answer.findById(req.params.id);
    if (!answer) {
      return res.status(404).json({ success: false, message: 'Answer not found' });
    }

    const question = await Question.findById(answer.question);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    if (question.author.toString() !== (req as any).user.id) {
      return res.status(403).json({ success: false, message: 'Only question author can accept answers' });
    }

    // Unaccept previous answer if any
    await Answer.updateMany({ question: question._id }, { isAccepted: false });

    // Accept this answer
    answer.isAccepted = true;
    await answer.save();

    // Update question
    question.acceptedAnswer = answer._id as mongoose.Types.ObjectId;
    question.isResolved = true;
    await question.save();

    res.json({ success: true, message: 'Answer accepted' });
  } catch (error) {
    console.error('Error accepting answer:', error);
    res.status(500).json({ success: false, message: 'Failed to accept answer' });
  }
});

// Get popular tags
router.get('/tags', async (_req, res) => {
  try {
    const tags = await Question.aggregate([
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);

    res.json({ success: true, tags });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tags' });
  }
});

// Get user's questions
router.get('/my-questions', authMiddleware, async (req, res) => {
  try {
    const questionsRaw = await Question.find({ author: (req as any).user.id })
      .populate('author', 'name email role')
      .sort({ createdAt: -1 });

    const questions = questionsRaw.map(q => q.toJSON());

    res.json({ success: true, questions });
  } catch (error) {
    console.error('Error fetching user questions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch questions' });
  }
});

export default router;
