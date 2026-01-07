import { Router, Response } from 'express';
import { ProjectSnapshot } from '../../models/ProjectSnapshot.js';
import { Project } from '../../models/Project.js';
import { authMiddleware, AuthRequest } from '../../middleware/auth.js';
import { logger } from '../../utils/logger.js';

const router = Router();

router.use(authMiddleware);

/**
 * POST /project-snapshot
 * Create a project snapshot (all files at once)
 */
router.post('/project-snapshot', async (req: AuthRequest, res: Response) => {
    try {
        const { projectId, name, description, files } = req.body;
        const userId = req.user?._id;

        if (!projectId || !name || !files || !Array.isArray(files)) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const project = await Project.findOne({ _id: projectId, owner: userId });
        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

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

        await (ProjectSnapshot as any).cleanupOldSnapshots(projectId, 50);

        logger.info(`[versions] Created project snapshot "${name}" for project ${projectId} with ${files.length} files`);
        res.json({
            success: true,
            snapshot: {
                _id: snapshot._id,
                name: snapshot.name,
                filesCount: files.length,
                createdAt: snapshot.createdAt,
            },
        });
    } catch (error) {
        logger.error('[versions] Create project snapshot error:', error);
        res.status(500).json({ success: false, error: 'Failed to create project snapshot' });
    }
});

/**
 * GET /project-snapshots/:projectId
 * Get all project snapshots
 */
router.get('/project-snapshots/:projectId', async (req: AuthRequest, res: Response) => {
    try {
        const { projectId } = req.params;
        const userId = req.user?._id;

        const project = await Project.findOne({ _id: projectId, owner: userId });
        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        const snapshots = await ProjectSnapshot.find({ projectId })
            .sort({ createdAt: -1 })
            .select('_id name description files createdAt')
            .lean();

        const snapshotsWithCount = snapshots.map(s => ({
            ...s,
            filesCount: s.files?.length || 0,
            files: undefined,
        }));

        res.json({ success: true, snapshots: snapshotsWithCount });
    } catch (error) {
        logger.error('[versions] Get project snapshots error:', error);
        res.status(500).json({ success: false, error: 'Failed to get project snapshots' });
    }
});

/**
 * GET /project-snapshot/:snapshotId
 * Get a specific project snapshot with all files
 */
router.get('/project-snapshot/:snapshotId', async (req: AuthRequest, res: Response) => {
    try {
        const { snapshotId } = req.params;
        const userId = req.user?._id;

        const snapshot = await ProjectSnapshot.findById(snapshotId);
        if (!snapshot) {
            return res.status(404).json({ success: false, error: 'Snapshot not found' });
        }

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

/**
 * GET /project-snapshot-diff/:snapshotId1/:snapshotId2
 * Compare two project snapshots
 */
router.get('/project-snapshot-diff/:snapshotId1/:snapshotId2', async (req: AuthRequest, res: Response) => {
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

        const project = await Project.findOne({ _id: snapshot1.projectId, owner: userId });
        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

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
                fileDiffs.push({ fileId, fileName: file2.fileName, status: 'added' });
            } else if (file1 && !file2) {
                fileDiffs.push({ fileId, fileName: file1.fileName, status: 'removed' });
            } else if (file1 && file2) {
                if (file1.content === file2.content) {
                    fileDiffs.push({ fileId, fileName: file1.fileName, status: 'unchanged' });
                } else {
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
                            if (line1 !== undefined) diff.push({ type: 'removed', line: line1, lineNum: i + 1 });
                            if (line2 !== undefined) diff.push({ type: 'added', line: line2, lineNum: i + 1 });
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

/**
 * DELETE /project-snapshot/:snapshotId
 * Delete a project snapshot
 */
router.delete('/project-snapshot/:snapshotId', async (req: AuthRequest, res: Response) => {
    try {
        const { snapshotId } = req.params;
        const userId = req.user?._id;

        const snapshot = await ProjectSnapshot.findById(snapshotId);
        if (!snapshot) {
            return res.status(404).json({ success: false, error: 'Snapshot not found' });
        }

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

/**
 * POST /project-snapshot-restore/:snapshotId
 * Restore a project snapshot (updates all files)
 */
router.post('/project-snapshot-restore/:snapshotId', async (req: AuthRequest, res: Response) => {
    try {
        const { snapshotId } = req.params;
        const userId = req.user?._id;

        const snapshot = await ProjectSnapshot.findById(snapshotId);
        if (!snapshot) {
            return res.status(404).json({ success: false, error: 'Snapshot not found' });
        }

        const project = await Project.findOne({ _id: snapshot.projectId, owner: userId });
        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        let restoredCount = 0;
        for (const snapshotFile of snapshot.files) {
            const fileIndex = project.files.findIndex(
                (f: any) => f._id.toString() === snapshotFile.fileId || f.name === snapshotFile.fileName
            );

            if (fileIndex !== -1) {
                project.files[fileIndex].content = snapshotFile.content;
                restoredCount++;
            } else {
                project.files.push({
                    name: snapshotFile.fileName,
                    content: snapshotFile.content,
                    language: snapshotFile.fileName.endsWith('.py') ? 'python' :
                        snapshotFile.fileName.endsWith('.js') ? 'javascript' :
                        snapshotFile.fileName.endsWith('.ts') ? 'typescript' : 'plaintext',
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

