import { Router, Response } from 'express';
import { Project } from '../../models/Project.js';
import { AuthRequest } from '../../middleware/auth.js';
import { checkProjectAchievements } from '../../services/gamificationService.js';
import { createDefaultFiles, transformCustomLibraries } from './helpers.js';

const router = Router();

/**
 * GET /
 * Get all projects for current user
 */
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const projects = await Project.find({ owner: req.userId })
            .select('name description language files dependencies customLibraries createdAt updatedAt')
            .sort({ updatedAt: -1 });

        const projectsData = projects.map(project => transformCustomLibraries(project));

        res.json({ success: true, data: projectsData });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch projects' });
    }
});

/**
 * GET /:projectId
 * Get a single project
 */
router.get('/:projectId', async (req: AuthRequest, res: Response) => {
    try {
        const project = await Project.findOne({
            _id: req.params.projectId,
            owner: req.userId,
        });

        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        res.json({ success: true, data: transformCustomLibraries(project) });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch project' });
    }
});

/**
 * POST /
 * Create a new project
 */
router.post('/', async (req: AuthRequest, res: Response) => {
    try {
        const { name, description, language } = req.body;
        const projectLanguage = language || 'python';

        const files = createDefaultFiles(name, projectLanguage, description);

        const project = await Project.create({
            name,
            description,
            language: projectLanguage,
            owner: req.userId,
            files,
        });

        // Check achievements
        try {
            if (req.userId) {
                await checkProjectAchievements(req.userId.toString());
            }
        } catch (achievementError) {
            console.error('Failed to check project achievements:', achievementError);
        }

        res.status(201).json({ success: true, data: project });
    } catch (error: any) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, error: 'Project with this name already exists' });
        }
        res.status(500).json({ success: false, error: 'Failed to create project' });
    }
});

/**
 * PUT /:projectId
 * Update a project
 */
router.put('/:projectId', async (req: AuthRequest, res: Response) => {
    try {
        const { name, description, language, dependencies } = req.body;

        const project = await Project.findOne({
            _id: req.params.projectId,
            owner: req.userId,
        });

        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        if (name !== undefined) project.name = name;
        if (description !== undefined) project.description = description;
        if (language !== undefined) project.language = language;
        if (dependencies !== undefined) {
            project.dependencies = typeof dependencies === 'object' && dependencies !== null ? dependencies : {};
        }

        await project.save();
        res.json({ success: true, data: project.toObject() });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to update project' });
    }
});

/**
 * DELETE /:projectId
 * Delete a project
 */
router.delete('/:projectId', async (req: AuthRequest, res: Response) => {
    try {
        const project = await Project.findOneAndDelete({
            _id: req.params.projectId,
            owner: req.userId,
        });

        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        res.json({ success: true, message: 'Project deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to delete project' });
    }
});

export default router;

