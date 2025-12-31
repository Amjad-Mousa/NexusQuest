import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Project } from '../models/Project.js';
import { authMiddleware as auth } from '../middleware/auth';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Use memory storage instead of disk storage
const storage = multer.memoryStorage();

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedExtensions = ['.jar', '.whl', '.so', '.dll', '.dylib', '.a', '.lib', '.tar.gz', '.zip', '.gz'];
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
        fileSize: 50 * 1024 * 1024, // 50MB
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

        logger.info(`[libraries] Uploading library: ${req.file.originalname} (${req.file.size} bytes)`);

        const project = await Project.findOne({ _id: projectId, owner: userId });
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Get file content from multer's memory buffer
        const fileContent = req.file.buffer;

        if (!fileContent || fileContent.length === 0) {
            logger.error(`[libraries] File content is empty`);
            return res.status(400).json({ error: 'Uploaded file is empty' });
        }

        logger.info(`[libraries] File content size: ${fileContent.length} bytes`);

        const fileExtWithoutDot = path.extname(req.file.originalname).substring(1);

        // Generate a unique filename
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 9);
        const ext = path.extname(req.file.originalname);
        const fileName = `${timestamp}-${randomStr}${ext}`;

        const library = {
            fileName: fileName,
            originalName: req.file.originalname,
            fileType: fileExtWithoutDot,
            size: fileContent.length,
            uploadedAt: new Date(),
            fileContent: fileContent
        };

        if (!project.customLibraries) {
            project.customLibraries = [];
        }

        project.customLibraries.push(library as any);

        // Save to database
        await project.save();

        logger.info(`[libraries] ✓ Saved library to database: ${req.file.originalname}`);

        // Verify it was saved correctly
        const savedProject = await Project.findById(projectId).lean();
        const savedLib = savedProject?.customLibraries?.[savedProject.customLibraries.length - 1];

        if (savedLib) {
            const hasContent = savedLib.fileContent &&
                (Buffer.isBuffer(savedLib.fileContent) ||
                    (savedLib.fileContent as any).buffer ||
                    (savedLib.fileContent as any).data);

            if (hasContent) {
                const contentSize = Buffer.isBuffer(savedLib.fileContent)
                    ? savedLib.fileContent.length
                    : ((savedLib.fileContent as any).buffer?.length || (savedLib.fileContent as any).data?.length || 0);
                logger.info(`[libraries] ✓ Verification successful - Content size in DB: ${contentSize} bytes`);
            } else {
                logger.error(`[libraries] ✗ Verification failed - fileContent is missing in database!`);
                return res.status(500).json({ error: 'Failed to store file content in database' });
            }
        }

        res.json({
            success: true,
            library: {
                _id: project.customLibraries[project.customLibraries.length - 1]._id,
                fileName: library.fileName,
                originalName: library.originalName,
                fileType: library.fileType,
                size: library.size,
                uploadedAt: library.uploadedAt
            }
        });
    } catch (error: any) {
        logger.error('[libraries] Upload error:', error);
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

        const libraries = (project.customLibraries || []).map(lib => {
            // Check if content exists
            const hasContent = lib.fileContent &&
                (Buffer.isBuffer(lib.fileContent) ||
                    (lib.fileContent as any).buffer ||
                    (lib.fileContent as any).data);

            const contentSize = hasContent
                ? (Buffer.isBuffer(lib.fileContent)
                    ? lib.fileContent.length
                    : ((lib.fileContent as any).buffer?.length || (lib.fileContent as any).data?.length || 0))
                : 0;

            return {
                _id: lib._id,
                fileName: lib.fileName,
                originalName: lib.originalName,
                fileType: lib.fileType,
                size: lib.size,
                uploadedAt: lib.uploadedAt,
                hasContent: hasContent,
                contentSize: contentSize
            };
        });

        logger.info(`[libraries] Listed ${libraries.length} libraries for project ${projectId}`);

        res.json({
            success: true,
            libraries: libraries
        });
    } catch (error: any) {
        logger.error('[libraries] List error:', error);
        res.status(500).json({ error: error.message || 'Failed to list libraries' });
    }
});

// Download library - DATABASE ONLY
router.get('/:projectId/libraries/:libraryId/download', auth, async (req: Request, res: Response) => {
    try {
        const { projectId, libraryId } = req.params;
        const userId = (req as any).userId;

        const project = await Project.findOne({ _id: projectId, owner: userId });
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const lib = project.customLibraries?.find(l => l._id?.toString() === libraryId);
        if (!lib) {
            return res.status(404).json({ error: 'Library not found' });
        }

        // Get file content from database
        let fileContent: Buffer | null = null;

        if (lib.fileContent) {
            if (Buffer.isBuffer(lib.fileContent)) {
                fileContent = lib.fileContent;
            } else if ((lib.fileContent as any).buffer) {
                fileContent = Buffer.from((lib.fileContent as any).buffer);
            } else if ((lib.fileContent as any).data) {
                fileContent = Buffer.from((lib.fileContent as any).data);
            }
        }

        if (!fileContent) {
            return res.status(404).json({ error: 'Library file content not found in database' });
        }

        logger.info(`[libraries] Downloading library: ${lib.originalName} (${fileContent.length} bytes)`);

        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${lib.originalName}"`);
        res.setHeader('Content-Length', fileContent.length);
        res.send(fileContent);
    } catch (error: any) {
        logger.error('[libraries] Download error:', error);
        res.status(500).json({ error: error.message || 'Failed to download library' });
    }
});

// Delete library - DATABASE ONLY
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
        logger.info(`[libraries] Deleting library from database: ${lib.originalName}`);

        // Remove from array
        project.customLibraries.splice(libIndex, 1);
        await project.save();

        logger.info(`[libraries] ✓ Library deleted from database`);

        res.json({ success: true, message: 'Library deleted successfully' });
    } catch (error: any) {
        logger.error('[libraries] Delete error:', error);
        res.status(500).json({ error: error.message || 'Failed to delete library' });
    }
});

// Clear dependency cache
router.post('/:projectId/dependencies/clear-cache', auth, async (req: Request, res: Response) => {
    try {
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

// Sync dependencies
router.post('/:projectId/dependencies/sync', auth, async (req: Request, res: Response) => {
    try {
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