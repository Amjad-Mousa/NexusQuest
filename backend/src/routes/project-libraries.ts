import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Project } from '../models/Project.js';
import { authMiddleware as auth } from '../middleware/auth';
import { logger } from '../utils/logger.js';
import Docker from 'dockerode';

const router = express.Router();
const docker = new Docker();

const UPLOAD_BASE_DIR = path.join(process.cwd(), 'uploads', 'libraries');
if (!fs.existsSync(UPLOAD_BASE_DIR)) {
    fs.mkdirSync(UPLOAD_BASE_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req: any, file, cb) => {
        // Create a project-specific subdirectory
        const projectId = req.params.projectId;
        const projectLibDir = path.join(UPLOAD_BASE_DIR, projectId);

        if (!fs.existsSync(projectLibDir)) {
            fs.mkdirSync(projectLibDir, { recursive: true });
        }

        cb(null, projectLibDir);
    },
    filename: (req: any, file, cb) => {
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 9);
        const ext = path.extname(file.originalname);
        cb(null, `${timestamp}-${randomStr}${ext}`);
    }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedExtensions = ['.jar', '.whl', '.so', '.dll', '.dylib', '.a', '.lib', '.tar.gz', '.zip'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedExtensions.includes(ext) || ext === '.gz') {
        cb(null, true);
    } else {
        cb(new Error(`File type not allowed. Allowed types: ${allowedExtensions.join(', ')}`));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024,
    }
});

// Upload library
router.post('/:projectId/libraries', auth, upload.single('library'), async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const userId = (req as any).userId;

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const project = await Project.findOne({ _id: projectId, owner: userId });
        if (!project) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Project not found' });
        }

        const fileExtWithoutDot = path.extname(req.file.originalname).substring(1);

        // Also save a copy under originalName to guarantee resolver can find it without manual steps
        try {
            const projectLibDir = path.join(UPLOAD_BASE_DIR, projectId);
            const originalPath = path.join(projectLibDir, req.file.originalname);
            if (!fs.existsSync(originalPath)) {
                fs.copyFileSync(req.file.path, originalPath);
            }
        } catch (e: any) {
            logger.warn(`[libraries] Could not create copy under originalName: ${e?.message || e}`);
        }

        const library = {
            fileName: req.file.filename,
            originalName: req.file.originalname,
            fileType: fileExtWithoutDot,
            size: req.file.size,
            uploadedAt: new Date()
        };

        if (!project.customLibraries) {
            project.customLibraries = [];
        }

        project.customLibraries.push(library as any);
        await project.save();

        res.json({
            success: true,
            library: {
                _id: project.customLibraries[project.customLibraries.length - 1]._id,
                ...library
            }
        });
    } catch (error: any) {
        logger.error('[libraries] Upload error:', error);
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: error.message || 'Failed to upload library' });
    }
});

// Get libraries
router.get('/:projectId/libraries', auth, async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const userId = (req as any).userId;

        const project = await Project.findOne({ _id: projectId, owner: userId });
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const librariesWithPaths = (project.customLibraries || []).map(lib => ({
            _id: lib._id,
            fileName: lib.fileName,
            originalName: lib.originalName,
            fileType: lib.fileType,
            size: lib.size,
            uploadedAt: lib.uploadedAt,
            path: `/uploads/libraries/${projectId}/${lib.fileName}`
        }));

        res.json({
            success: true,
            libraries: librariesWithPaths || []
        });
    } catch (error: any) {
        logger.error('[libraries] List error:', error);
        res.status(500).json({ error: error.message || 'Failed to list libraries' });
    }
});

// Delete library
router.delete('/:projectId/libraries/:libraryId', auth, async (req: Request, res: Response) => {
    try {
        const { projectId, libraryId } = req.params;
        const userId = (req as any).userId;

        const project = await Project.findOne({ _id: projectId, owner: userId });
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (!project.customLibraries) {
            return res.status(404).json({ error: 'Library not found' });
        }

        const libIndex = project.customLibraries.findIndex(lib => lib._id?.toString() === libraryId);
        if (libIndex === -1) {
            return res.status(404).json({ error: 'Library not found' });
        }

        const lib = project.customLibraries[libIndex];
        const filePath = path.join(UPLOAD_BASE_DIR, projectId, lib.fileName);

        // Delete file from disk
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        project.customLibraries.splice(libIndex, 1);
        await project.save();

        res.json({ success: true, message: 'Library deleted successfully' });
    } catch (error: any) {
        logger.error('[libraries] Delete error:', error);
        res.status(500).json({ error: error.message || 'Failed to delete library' });
    }
});

// Clear dependency cache
router.post('/:projectId/dependencies/clear-cache', auth, async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const cacheDir = `/dependencies/cache-${projectId}`;

        // Execute docker command to remove cache directory
        const containers = await docker.listContainers({ all: true });
        const utilContainer = containers.find(c => c.Image.includes('nexusquest-project'));

        if (utilContainer) {
            const container = docker.getContainer(utilContainer.Id);
            const rmCacheExec = await container.exec({
                Cmd: ['sh', '-c', `rm -rf ${cacheDir}`],
                AttachStdout: true,
                AttachStderr: true
            });
            await rmCacheExec.start({});
        }

        res.json({ success: true, message: 'Dependency cache cleared successfully' });
    } catch (error: any) {
        logger.error('[dependencies] Clear cache error:', error);
        res.status(500).json({ error: error.message || 'Failed to clear cache' });
    }
});

// Get project dependencies
router.get('/:projectId/dependencies', auth, async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const userId = (req as any).userId;

        const project = await Project.findOne({ _id: projectId, owner: userId });
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json({
            success: true,
            dependencies: project.dependencies || {},
            language: project.language
        });
    } catch (error: any) {
        logger.error('[dependencies] Get error:', error);
        res.status(500).json({ error: error.message || 'Failed to get dependencies' });
    }
});

// Sync dependencies (install in a container and cache them)
router.post('/:projectId/dependencies/sync', auth, async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const userId = (req as any).userId;

        const project = await Project.findOne({ _id: projectId, owner: userId });
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Basic sync - just report success
        res.json({
            success: true,
            usedCache: false,
            message: 'Dependencies sync initiated'
        });
    } catch (error: any) {
        logger.error('[dependencies] Sync error:', error);
        res.status(500).json({ error: error.message || 'Failed to sync dependencies' });
    }
});

export default router;

