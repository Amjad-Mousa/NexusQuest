import { Router, Response } from 'express';
import { FileSnapshot } from '../models/FileSnapshot';
import { Project } from '../models/Project';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Create a snapshot (called on file save)
router.post('/snapshot', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { projectId, fileId, fileName, content, message } = req.body;
        const userId = req.user?._id;

        if (!projectId || !fileId || !fileName || content === undefined) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        // Verify user owns the project (field is 'owner' not 'userId')
        const project = await Project.findOne({ _id: projectId, owner: userId });
        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        // Check if content is different from last snapshot
        const lastSnapshot = await FileSnapshot.findOne({ projectId, fileId })
            .sort({ createdAt: -1 });

        if (lastSnapshot && lastSnapshot.content === content) {
            // No changes, don't create a new snapshot
            return res.json({ success: true, snapshot: lastSnapshot, unchanged: true });
        }

        // Create new snapshot
        const snapshot = await FileSnapshot.create({
            projectId,
            fileId,
            fileName,
            content,
            message: message || 'Auto-save',
            createdBy: userId,
        });

        // Cleanup old snapshots (keep last 20)
        await (FileSnapshot as any).cleanupOldSnapshots(projectId, fileId, 20);

        logger.info(`[versions] Created snapshot for file ${fileName} in project ${projectId}`);
        res.json({ success: true, snapshot });
    } catch (error) {
        logger.error('[versions] Create snapshot error:', error);
        res.status(500).json({ success: false, error: 'Failed to create snapshot' });
    }
});

// Create snapshots for all files in a project (bulk snapshot)
router.post('/snapshot-all', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { projectId, files, message } = req.body;
        const userId = req.user?._id;

        if (!projectId || !files || !Array.isArray(files)) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        // Verify user owns the project
        const project = await Project.findOne({ _id: projectId, owner: userId });
        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        const results: { fileId: string; fileName: string; created: boolean }[] = [];

        for (const file of files) {
            const { fileId, fileName, content } = file;
            if (!fileId || !fileName || content === undefined) continue;

            // Check if content is different from last snapshot
            const lastSnapshot = await FileSnapshot.findOne({ projectId, fileId })
                .sort({ createdAt: -1 });

            if (lastSnapshot && lastSnapshot.content === content) {
                results.push({ fileId, fileName, created: false });
                continue;
            }

            // Create new snapshot
            await FileSnapshot.create({
                projectId,
                fileId,
                fileName,
                content,
                message: message || 'Project snapshot',
                createdBy: userId,
            });

            // Cleanup old snapshots
            await (FileSnapshot as any).cleanupOldSnapshots(projectId, fileId, 20);
            results.push({ fileId, fileName, created: true });
        }

        const createdCount = results.filter(r => r.created).length;
        logger.info(`[versions] Created ${createdCount} snapshots for project ${projectId}`);
        res.json({ success: true, results, createdCount });
    } catch (error) {
        logger.error('[versions] Bulk snapshot error:', error);
        res.status(500).json({ success: false, error: 'Failed to create snapshots' });
    }
});

// Get snapshots for a file
router.get('/file/:projectId/:fileId', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { projectId, fileId } = req.params;
        const userId = req.user?._id;

        // Verify user owns the project
        const project = await Project.findOne({ _id: projectId, owner: userId });
        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        const snapshots = await FileSnapshot.find({ projectId, fileId })
            .sort({ createdAt: -1 })
            .limit(20)
            .select('_id fileName message createdAt');

        res.json({ success: true, snapshots });
    } catch (error) {
        logger.error('[versions] Get snapshots error:', error);
        res.status(500).json({ success: false, error: 'Failed to get snapshots' });
    }
});

// Get all snapshots for a project (grouped by file)
router.get('/project/:projectId', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { projectId } = req.params;
        const userId = req.user?._id;

        // Verify user owns the project
        const project = await Project.findOne({ _id: projectId, owner: userId });
        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        // Get latest snapshot for each file
        const snapshots = await FileSnapshot.aggregate([
            { $match: { projectId: project._id } },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: '$fileId',
                    fileName: { $first: '$fileName' },
                    latestSnapshot: { $first: '$$ROOT' },
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    fileId: '$_id',
                    fileName: 1,
                    snapshotCount: '$count',
                    lastModified: '$latestSnapshot.createdAt',
                    lastMessage: '$latestSnapshot.message',
                },
            },
        ]);

        res.json({ success: true, files: snapshots });
    } catch (error) {
        logger.error('[versions] Get project snapshots error:', error);
        res.status(500).json({ success: false, error: 'Failed to get project snapshots' });
    }
});

// Get a specific snapshot content
router.get('/snapshot/:snapshotId', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { snapshotId } = req.params;
        const userId = req.user?._id;

        const snapshot = await FileSnapshot.findById(snapshotId);
        if (!snapshot) {
            return res.status(404).json({ success: false, error: 'Snapshot not found' });
        }

        // Verify user owns the project
        const project = await Project.findOne({ _id: snapshot.projectId, owner: userId });
        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        res.json({ success: true, snapshot });
    } catch (error) {
        logger.error('[versions] Get snapshot error:', error);
        res.status(500).json({ success: false, error: 'Failed to get snapshot' });
    }
});

// Restore a snapshot (returns the content, doesn't auto-apply)
router.post('/restore/:snapshotId', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { snapshotId } = req.params;
        const userId = req.user?._id;

        const snapshot = await FileSnapshot.findById(snapshotId);
        if (!snapshot) {
            return res.status(404).json({ success: false, error: 'Snapshot not found' });
        }

        // Verify user owns the project
        const project = await Project.findOne({ _id: snapshot.projectId, owner: userId });
        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        logger.info(`[versions] Restoring snapshot ${snapshotId} for file ${snapshot.fileName}`);
        res.json({
            success: true,
            content: snapshot.content,
            fileName: snapshot.fileName,
            fileId: snapshot.fileId,
        });
    } catch (error) {
        logger.error('[versions] Restore snapshot error:', error);
        res.status(500).json({ success: false, error: 'Failed to restore snapshot' });
    }
});

// Compare two snapshots (simple diff)
router.get('/diff/:snapshotId1/:snapshotId2', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { snapshotId1, snapshotId2 } = req.params;
        const userId = req.user?._id;

        const [snapshot1, snapshot2] = await Promise.all([
            FileSnapshot.findById(snapshotId1),
            FileSnapshot.findById(snapshotId2),
        ]);

        if (!snapshot1 || !snapshot2) {
            return res.status(404).json({ success: false, error: 'Snapshot not found' });
        }

        // Verify user owns the project
        const project = await Project.findOne({ _id: snapshot1.projectId, owner: userId });
        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        // Simple line-by-line diff
        const lines1 = snapshot1.content.split('\n');
        const lines2 = snapshot2.content.split('\n');

        const diff: { type: 'same' | 'added' | 'removed'; line: string; lineNum: number }[] = [];
        const maxLines = Math.max(lines1.length, lines2.length);

        for (let i = 0; i < maxLines; i++) {
            const line1 = lines1[i];
            const line2 = lines2[i];

            if (line1 === line2) {
                diff.push({ type: 'same', line: line1 || '', lineNum: i + 1 });
            } else {
                if (line1 !== undefined) {
                    diff.push({ type: 'removed', line: line1, lineNum: i + 1 });
                }
                if (line2 !== undefined) {
                    diff.push({ type: 'added', line: line2, lineNum: i + 1 });
                }
            }
        }

        res.json({
            success: true,
            diff,
            snapshot1: { id: snapshot1._id, createdAt: snapshot1.createdAt, message: snapshot1.message },
            snapshot2: { id: snapshot2._id, createdAt: snapshot2.createdAt, message: snapshot2.message },
        });
    } catch (error) {
        logger.error('[versions] Diff error:', error);
        res.status(500).json({ success: false, error: 'Failed to compare snapshots' });
    }
});

export default router;
