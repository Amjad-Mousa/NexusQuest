import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { Project } from '../../models/Project.js';
import { AuthRequest } from '../../middleware/auth.js';

const router = Router();

/**
 * POST /:projectId/files
 * Add a file to a project
 */
router.post('/:projectId/files', async (req: AuthRequest, res: Response) => {
    try {
        const { name, content, language } = req.body;

        const project = await Project.findOne({
            _id: req.params.projectId,
            owner: req.userId,
        });

        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
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

        res.status(201).json({ success: true, data: newFile });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to add file' });
    }
});

/**
 * PUT /:projectId/files/:fileId
 * Update a file in a project
 */
router.put('/:projectId/files/:fileId', async (req: AuthRequest, res: Response) => {
    try {
        const { name, content, language } = req.body;

        const project = await Project.findOne({
            _id: req.params.projectId,
            owner: req.userId,
        });

        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        const file = project.files.find((f) => f._id.toString() === req.params.fileId);

        if (!file) {
            return res.status(404).json({ success: false, error: 'File not found' });
        }

        if (name !== undefined) file.name = name;
        if (content !== undefined) file.content = content;
        if (language !== undefined) file.language = language;
        file.updatedAt = new Date();

        await project.save();
        res.json({ success: true, data: file });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to update file' });
    }
});

/**
 * DELETE /:projectId/files/:fileId
 * Delete a file from a project
 */
router.delete('/:projectId/files/:fileId', async (req: AuthRequest, res: Response) => {
    try {
        const project = await Project.findOne({
            _id: req.params.projectId,
            owner: req.userId,
        });

        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        const fileIndex = project.files.findIndex((f) => f._id.toString() === req.params.fileId);

        if (fileIndex === -1) {
            return res.status(404).json({ success: false, error: 'File not found' });
        }

        project.files.splice(fileIndex, 1);
        await project.save();

        res.json({ success: true, message: 'File deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to delete file' });
    }
});

export default router;

