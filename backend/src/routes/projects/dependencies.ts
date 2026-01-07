import { Router, Response } from 'express';
import { Project } from '../../models/Project.js';
import { AuthRequest } from '../../middleware/auth.js';

const router = Router();

/**
 * GET /:projectId/dependencies
 * Get project dependencies
 */
router.get('/:projectId/dependencies', async (req: AuthRequest, res: Response) => {
    try {
        const project = await Project.findOne({
            _id: req.params.projectId,
            owner: req.userId,
        });

        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        let deps = project.dependencies || {};
        if (deps instanceof Map) {
            deps = Object.fromEntries(deps);
        }

        res.json({ success: true, dependencies: deps });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch dependencies' });
    }
});

/**
 * POST /:projectId/dependencies
 * Add or update a single dependency
 */
router.post('/:projectId/dependencies', async (req: AuthRequest, res: Response) => {
    try {
        const { name, version } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, error: 'Dependency name is required' });
        }

        const project = await Project.findOne({
            _id: req.params.projectId,
            owner: req.userId,
        });

        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        if (!project.dependencies) {
            project.dependencies = {};
        }

        project.dependencies[name] = version || '*';
        await project.save();

        res.status(201).json({ success: true, dependencies: project.dependencies });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to add dependency' });
    }
});

/**
 * PUT /:projectId/dependencies
 * Update all dependencies
 */
router.put('/:projectId/dependencies', async (req: AuthRequest, res: Response) => {
    try {
        const { dependencies } = req.body;

        if (!dependencies || typeof dependencies !== 'object') {
            return res.status(400).json({ success: false, error: 'Dependencies must be an object' });
        }

        const project = await Project.findOne({
            _id: req.params.projectId,
            owner: req.userId,
        });

        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        project.dependencies = typeof dependencies === 'object' && dependencies !== null ? dependencies : {};
        await project.save();

        res.json({ success: true, dependencies: project.dependencies });
    } catch (error: any) {
        console.error('Error updating dependencies:', error);
        res.status(500).json({ success: false, error: 'Failed to update dependencies' });
    }
});

/**
 * DELETE /:projectId/dependencies/:dependencyName
 * Delete a specific dependency
 */
router.delete('/:projectId/dependencies/:dependencyName', async (req: AuthRequest, res: Response) => {
    try {
        const project = await Project.findOne({
            _id: req.params.projectId,
            owner: req.userId,
        });

        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        if (!project.dependencies) {
            project.dependencies = {};
        }

        delete project.dependencies[req.params.dependencyName];
        await project.save();

        res.json({
            success: true,
            message: 'Dependency deleted successfully',
            dependencies: project.dependencies,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to delete dependency' });
    }
});

export default router;

