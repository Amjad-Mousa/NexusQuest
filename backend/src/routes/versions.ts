import { Router, Response } from 'express';
import { FileSnapshot } from '../models/FileSnapshot';
import { ProjectSnapshot } from '../models/ProjectSnapshot';
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

// ==================== PROJECT SNAPSHOTS ====================

// Create a project snapshot (all files at once)
router.post('/project-snapshot', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { projectId, name, description, files } = req.body;
        const userId = req.user?._id;

        if (!projectId || !name || !files || !Array.isArray(files)) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        // Verify user owns the project
        const project = await Project.findOne({ _id: projectId, owner: userId });
        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        // Create project snapshot
        const snapshot = await ProjectSnapshot.create({
            projectId,
            name,
            description,
            files: files.map((f: any) => ({
                fileId: f.fileId,
                fileName: f.fileName,
                content: f.content,
            })),
            createdBy: userId,
        });

        // Cleanup old snapshots (keep last 50)
        await (ProjectSnapshot as any).cleanupOldSnapshots(projectId, 50);

        logger.info(`[versions] Created project snapshot "${name}" for project ${projectId} with ${files.length} files`);
        res.json({ success: true, snapshot: { _id: snapshot._id, name: snapshot.name, filesCount: files.length, createdAt: snapshot.createdAt } });
    } catch (error) {
        logger.error('[versions] Create project snapshot error:', error);
        res.status(500).json({ success: false, error: 'Failed to create project snapshot' });
    }
});

// Get all project snapshots
router.get('/project-snapshots/:projectId', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { projectId } = req.params;
        const userId = req.user?._id;

        // Verify user owns the project
        const project = await Project.findOne({ _id: projectId, owner: userId });
        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        const snapshots = await ProjectSnapshot.find({ projectId })
            .sort({ createdAt: -1 })
            .select('_id name description files createdAt')
            .lean();

        // Add file count to each snapshot
        const snapshotsWithCount = snapshots.map(s => ({
            ...s,
            filesCount: s.files?.length || 0,
            files: undefined, // Don't send full file content in list
        }));

        res.json({ success: true, snapshots: snapshotsWithCount });
    } catch (error) {
        logger.error('[versions] Get project snapshots error:', error);
        res.status(500).json({ success: false, error: 'Failed to get project snapshots' });
    }
});

// Get a specific project snapshot with all files
router.get('/project-snapshot/:snapshotId', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { snapshotId } = req.params;
        const userId = req.user?._id;

        const snapshot = await ProjectSnapshot.findById(snapshotId);
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
        logger.error('[versions] Get project snapshot error:', error);
        res.status(500).json({ success: false, error: 'Failed to get project snapshot' });
    }
});

// Compare two project snapshots
router.get('/project-snapshot-diff/:snapshotId1/:snapshotId2', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { snapshotId1, snapshotId2 } = req.params;
        const userId = req.user?._id;

        const [snapshot1, snapshot2] = await Promise.all([
            ProjectSnapshot.findById(snapshotId1),
            ProjectSnapshot.findById(snapshotId2),
        ]);

        if (!snapshot1 || !snapshot2) {
            return res.status(404).json({ success: false, error: 'Snapshot not found' });
        }

        // Verify user owns the project
        const project = await Project.findOne({ _id: snapshot1.projectId, owner: userId });
        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        // Build file maps
        const files1Map = new Map(snapshot1.files.map(f => [f.fileId, f]));
        const files2Map = new Map(snapshot2.files.map(f => [f.fileId, f]));

        const allFileIds = new Set([...files1Map.keys(), ...files2Map.keys()]);

        const fileDiffs: Array<{
            fileId: string;
            fileName: string;
            status: 'added' | 'removed' | 'modified' | 'unchanged';
            diff?: Array<{ type: 'same' | 'added' | 'removed'; line: string; lineNum: number }>;
        }> = [];

        for (const fileId of allFileIds) {
            const file1 = files1Map.get(fileId);
            const file2 = files2Map.get(fileId);

            if (!file1 && file2) {
                // File added in snapshot2
                fileDiffs.push({ fileId, fileName: file2.fileName, status: 'added' });
            } else if (file1 && !file2) {
                // File removed in snapshot2
                fileDiffs.push({ fileId, fileName: file1.fileName, status: 'removed' });
            } else if (file1 && file2) {
                if (file1.content === file2.content) {
                    fileDiffs.push({ fileId, fileName: file1.fileName, status: 'unchanged' });
                } else {
                    // File modified - compute diff
                    const lines1 = file1.content.split('\n');
                    const lines2 = file2.content.split('\n');
                    const diff: Array<{ type: 'same' | 'added' | 'removed'; line: string; lineNum: number }> = [];
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

                    fileDiffs.push({ fileId, fileName: file1.fileName, status: 'modified', diff });
                }
            }
        }

        res.json({
            success: true,
            fileDiffs,
            snapshot1: { _id: snapshot1._id, name: snapshot1.name, createdAt: snapshot1.createdAt, filesCount: snapshot1.files.length },
            snapshot2: { _id: snapshot2._id, name: snapshot2.name, createdAt: snapshot2.createdAt, filesCount: snapshot2.files.length },
        });
    } catch (error) {
        logger.error('[versions] Project snapshot diff error:', error);
        res.status(500).json({ success: false, error: 'Failed to compare project snapshots' });
    }
});

// Delete a project snapshot
router.delete('/project-snapshot/:snapshotId', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { snapshotId } = req.params;
        const userId = req.user?._id;

        const snapshot = await ProjectSnapshot.findById(snapshotId);
        if (!snapshot) {
            return res.status(404).json({ success: false, error: 'Snapshot not found' });
        }

        // Verify user owns the project
        const project = await Project.findOne({ _id: snapshot.projectId, owner: userId });
        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        await ProjectSnapshot.findByIdAndDelete(snapshotId);
        logger.info(`[versions] Deleted project snapshot ${snapshotId}`);
        res.json({ success: true, message: 'Snapshot deleted' });
    } catch (error) {
        logger.error('[versions] Delete project snapshot error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete snapshot' });
    }
});

// Restore a project snapshot (updates all files in the project)
router.post('/project-snapshot-restore/:snapshotId', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { snapshotId } = req.params;
        const userId = req.user?._id;

        const snapshot = await ProjectSnapshot.findById(snapshotId);
        if (!snapshot) {
            return res.status(404).json({ success: false, error: 'Snapshot not found' });
        }

        // Verify user owns the project
        const project = await Project.findOne({ _id: snapshot.projectId, owner: userId });
        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        // Update each file in the project with the snapshot content
        let restoredCount = 0;
        for (const snapshotFile of snapshot.files) {
            const fileIndex = project.files.findIndex(
                (f: any) => f._id.toString() === snapshotFile.fileId || f.name === snapshotFile.fileName
            );
            
            if (fileIndex !== -1) {
                // Update existing file
                project.files[fileIndex].content = snapshotFile.content;
                restoredCount++;
            } else {
                // File doesn't exist anymore, add it back
                project.files.push({
                    name: snapshotFile.fileName,
                    content: snapshotFile.content,
                    language: snapshotFile.fileName.endsWith('.py') ? 'python' : 
                              snapshotFile.fileName.endsWith('.js') ? 'javascript' :
                              snapshotFile.fileName.endsWith('.ts') ? 'typescript' :
                              snapshotFile.fileName.endsWith('.html') ? 'html' :
                              snapshotFile.fileName.endsWith('.css') ? 'css' : 'plaintext',
                });
                restoredCount++;
            }
        }

        await project.save();

        logger.info(`[versions] Restored project snapshot ${snapshotId} - ${restoredCount} files updated`);
        res.json({
            success: true,
            name: snapshot.name,
            files: snapshot.files,
            restoredCount,
        });
    } catch (error) {
        logger.error('[versions] Restore project snapshot error:', error);
        res.status(500).json({ success: false, error: 'Failed to restore project snapshot' });
    }
});

export default router;
