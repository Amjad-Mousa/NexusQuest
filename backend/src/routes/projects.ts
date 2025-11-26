import { Router, Response } from 'express';
import { Project } from '../models/Project.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import mongoose from 'mongoose';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all projects for current user
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const projects = await Project.find({ owner: req.userId })
      .select('name description language files createdAt updatedAt')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects',
    });
  }
});

// Get a single project
router.get('/:projectId', async (req: AuthRequest, res: Response) => {
  try {
    const project = await Project.findOne({
      _id: req.params.projectId,
      owner: req.userId,
    });

    if (!project) {
      res.status(404).json({
        success: false,
        error: 'Project not found',
      });
      return;
    }

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project',
    });
  }
});

// Create a new project
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, language } = req.body;

    const project = await Project.create({
      name,
      description,
      language: language || 'python',
      owner: req.userId,
      files: [],
    });

    res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error: unknown) {
    const mongoError = error as { code?: number };
    if (mongoError.code === 11000) {
      res.status(400).json({
        success: false,
        error: 'Project with this name already exists',
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: 'Failed to create project',
    });
  }
});

// Update a project
router.put('/:projectId', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, language } = req.body;

    const project = await Project.findOneAndUpdate(
      { _id: req.params.projectId, owner: req.userId },
      { name, description, language },
      { new: true, runValidators: true }
    );

    if (!project) {
      res.status(404).json({
        success: false,
        error: 'Project not found',
      });
      return;
    }

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update project',
    });
  }
});

// Delete a project
router.delete('/:projectId', async (req: AuthRequest, res: Response) => {
  try {
    const project = await Project.findOneAndDelete({
      _id: req.params.projectId,
      owner: req.userId,
    });

    if (!project) {
      res.status(404).json({
        success: false,
        error: 'Project not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete project',
    });
  }
});

// === FILE ROUTES ===

// Add a file to a project
router.post('/:projectId/files', async (req: AuthRequest, res: Response) => {
  try {
    const { name, content, language } = req.body;

    const project = await Project.findOne({
      _id: req.params.projectId,
      owner: req.userId,
    });

    if (!project) {
      res.status(404).json({
        success: false,
        error: 'Project not found',
      });
      return;
    }

    const newFile = {
      _id: new mongoose.Types.ObjectId(),
      name,
      content: content || '',
      language: language || project.language,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    project.files.push(newFile);
    await project.save();

    res.status(201).json({
      success: true,
      data: newFile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to add file',
    });
  }
});

// Update a file in a project
router.put('/:projectId/files/:fileId', async (req: AuthRequest, res: Response) => {
  try {
    const { name, content, language } = req.body;

    const project = await Project.findOne({
      _id: req.params.projectId,
      owner: req.userId,
    });

    if (!project) {
      res.status(404).json({
        success: false,
        error: 'Project not found',
      });
      return;
    }

    const file = project.files.find(
      (f) => f._id.toString() === req.params.fileId
    );

    if (!file) {
      res.status(404).json({
        success: false,
        error: 'File not found',
      });
      return;
    }

    if (name !== undefined) file.name = name;
    if (content !== undefined) file.content = content;
    if (language !== undefined) file.language = language;
    file.updatedAt = new Date();

    await project.save();

    res.json({
      success: true,
      data: file,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update file',
    });
  }
});

// Delete a file from a project
router.delete('/:projectId/files/:fileId', async (req: AuthRequest, res: Response) => {
  try {
    const project = await Project.findOne({
      _id: req.params.projectId,
      owner: req.userId,
    });

    if (!project) {
      res.status(404).json({
        success: false,
        error: 'Project not found',
      });
      return;
    }

    const fileIndex = project.files.findIndex(
      (f) => f._id.toString() === req.params.fileId
    );

    if (fileIndex === -1) {
      res.status(404).json({
        success: false,
        error: 'File not found',
      });
      return;
    }

    project.files.splice(fileIndex, 1);
    await project.save();

    res.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete file',
    });
  }
});

export default router;
