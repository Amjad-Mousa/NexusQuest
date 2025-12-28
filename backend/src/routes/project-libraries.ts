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

router.post('/:projectId/libraries', auth, upload.single('library'), async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const userId = (req as any).userId;

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const project = await Project.findOne({ _id: projectId, owner: userId });
        if (!project) {
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Project not found' });
        }

        const library = {
            fileName: req.file.filename,
            originalName: req.file.originalname,
            fileType: path.extname(req.file.originalname).substring(1),
            size: req.file.size,
            uploadedAt: new Date()
        };

        if (!project.customLibraries) {
            project.customLibraries = [];
        }
        project.customLibraries.push(library as any);

        if (project.dependencyMetadata) {
            project.dependencyMetadata.installed = false;
        }

        await project.save();

        const containerName = `nexusquest-${project.language}`;
        try {
            const container = docker.getContainer(containerName);
            const info = await container.inspect();

            if (info.State.Running) {
                const customLibDir = `/custom-libs/${projectId}`;

                await container.exec({
                    Cmd: ['sh', '-c', `mkdir -p ${customLibDir}`],
                    AttachStdout: false,
                    AttachStderr: false,
                }).then(exec => exec.start({}));

                const fileContent = fs.readFileSync(req.file.path);
                const base64Content = fileContent.toString('base64');

                await container.exec({
                    Cmd: ['sh', '-c', `echo "${base64Content}" | base64 -d > ${customLibDir}/${req.file.filename}`],
                    AttachStdout: true,
                    AttachStderr: true,
                }).then(exec => exec.start({ hijack: true }));

                logger.info(`[libraries] Uploaded ${req.file.originalname} to container ${containerName}`);
            }
        } catch (error) {
            logger.warn(`[libraries] Could not upload to container: ${error}`);
        }

        res.json({
            success: true,
            library: {
                id: project.customLibraries[project.customLibraries.length - 1]._id,
                ...library
            }
        });
    } catch (error: any) {
        logger.error('[libraries] Upload error:', error);
        if (req.file) {
            fs.unlinkSync(req.file.path);
                _id: project.customLibraries[project.customLibraries.length - 1]._id,
                fileName: library.fileName,
                originalName: library.originalName,
                fileType: library.fileType,
                size: library.size,
                uploadedAt: library.uploadedAt,
                path: `/uploads/libraries/${projectId}/${library.fileName}`
        const { projectId } = req.params;
        const userId = (req as any).userId;

        const project = await Project.findOne({ _id: projectId, owner: userId });
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json({
            success: true,
            libraries: librariesWithPaths
            libraries: project.customLibraries || []
    } catch (error: any) {
        logger.error('[libraries] List error:', error);
        res.status(500).json({ error: error.message || 'Failed to list libraries' });
    }
});

router.delete('/:projectId/libraries/:libraryId', auth, async (req: Request, res: Response) => {
    try {
        const { projectId, libraryId } = req.params;
        // Convert Mongoose documents to plain objects
        const projectObj = project.toObject();
        const librariesWithPaths = (projectObj.customLibraries || []).map((lib: any) => ({
            _id: lib._id,
            fileName: lib.fileName,
            originalName: lib.originalName,
            fileType: lib.fileType,
            size: lib.size,
            uploadedAt: lib.uploadedAt,
            path: `/uploads/libraries/${projectId}/${lib.fileName}`
        }));

            return res.status(404).json({ error: 'Library not found' });
        }

        });
        const filePath = path.join(UPLOAD_DIR, library.fileName);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        project.customLibraries!.splice(libraryIndex, 1);

        if (project.dependencyMetadata) {
            project.dependencyMetadata.installed = false;
        }

        await project.save();

        const containerName = `nexusquest-${project.language}`;
        try {
            const container = docker.getContainer(containerName);
            const customLibDir = `/custom-libs/${projectId}`;

            await container.exec({
                Cmd: ['sh', '-c', `rm -f ${customLibDir}/${library.fileName}`],
                AttachStdout: false,
                AttachStderr: false,
            }).then(exec => exec.start({}));

            logger.info(`[libraries] Deleted ${library.originalName} from container`);
        } catch (error) {
            logger.warn(`[libraries] Could not delete from container: ${error}`);
        }

        res.json({ success: true, message: 'Library deleted successfully' });
    } catch (error: any) {
        logger.error('[libraries] Delete error:', error);
        res.status(500).json({ error: error.message || 'Failed to delete library' });
    }
});

router.post('/:projectId/dependencies/clear-cache', auth, async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const userId = (req as any).userId;

        const project = await Project.findOne({ _id: projectId, owner: userId });
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (project.dependencyMetadata) {
            project.dependencyMetadata.installed = false;
            project.dependencyMetadata.hash = undefined;
            project.dependencyMetadata.installedAt = undefined;
        }

        await project.save();

        const containerName = `nexusquest-${project.language}`;
        try {
            const container = docker.getContainer(containerName);
            const depDir = `/dependencies/${projectId}`;

            await container.exec({
                Cmd: ['sh', '-c', `rm -rf ${depDir}`],
                AttachStdout: false,
                AttachStderr: false,
            }).then(exec => exec.start({}));

            logger.info(`[dependencies] Cleared cache for project ${projectId}`);
        } catch (error) {
            logger.warn(`[dependencies] Could not clear container cache: ${error}`);
        }

        res.json({ success: true, message: 'Dependency cache cleared successfully' });
    } catch (error: any) {
        logger.error('[dependencies] Clear cache error:', error);
        res.status(500).json({ error: error.message || 'Failed to clear cache' });
    }
});

// --- Dependencies management (view + sync) ---
import crypto from 'crypto';

// Map language to Docker image (align with project-execution)
const languageImages: Record<string, string> = {
    python: 'nexusquest-python:latest',
    javascript: 'nexusquest-javascript:latest',
    java: 'nexusquest-java:latest',
    cpp: 'nexusquest-cpp:latest',
};

function stableDepsString(dependencies: Record<string, string>): string {
    const keys = Object.keys(dependencies || {}).sort();
    const normalized: Record<string, string> = {};
    for (const k of keys) normalized[k] = dependencies[k];
    return JSON.stringify(normalized);
}

// GET installed dependencies (JavaScript)
router.get('/:projectId/dependencies', auth, async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const userId = (req as any).userId;

        const project = await Project.findOne({ _id: projectId, owner: userId });
        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        const declared = Object.fromEntries(Object.entries(project.dependencies || {}));

        if (project.language !== 'javascript') {
            return res.json({ success: true, declared, installed: {}, metadata: project.dependencyMetadata || {} });
        }

        // Create a short-lived container to read installed list (from cache if present)
        const language = project.language;
        const containerName = `nexusquest-deps-list-${projectId}-${Date.now()}`;
        const baseDir = `/tmp/project-${projectId}-${Date.now()}`;
        const depsHash = crypto.createHash('md5').update(stableDepsString(declared)).digest('hex');
        const cacheDir = `/dependencies/js-${depsHash}`;

        const container = await docker.createContainer({
            Image: languageImages[language],
            name: containerName,
            Cmd: ['sh', '-c', 'while true; do sleep 1; done'],
            Tty: true,
            HostConfig: {
                NetworkMode: 'none',
                Binds: [
                    `${language}-dependencies:/dependencies:rw`
                ],
                Tmpfs: { '/tmp': 'rw,exec,nosuid,size=50m' }
            }
        });
        await container.start();

        try {
            // Fix perms on /dependencies
            await (await container.exec({
                User: 'root',
                Cmd: ['sh', '-c', 'mkdir -p /dependencies && chown -R 1001:1001 /dependencies && chmod 0775 /dependencies'],
                AttachStdout: true, AttachStderr: true
            })).start({});

            // Prepare base dir and minimal package.json
            await (await container.exec({ Cmd: ['sh', '-c', `mkdir -p ${baseDir}`], AttachStdout: true, AttachStderr: true })).start({});
            const pkgJson = JSON.stringify({ name: 'nexusquest-project', version: '1.0.0', dependencies: declared });
            const pkg64 = Buffer.from(pkgJson).toString('base64');
            await (await container.exec({ Cmd: ['sh', '-c', `echo "${pkg64}" | base64 -d > ${baseDir}/package.json`], AttachStdout: true, AttachStderr: true })).start({});

            // If cache exists, copy node_modules into baseDir to allow npm ls
            await (await container.exec({
                Cmd: ['sh', '-c', `if [ -d "${cacheDir}/node_modules" ] && [ -f "${cacheDir}/.cache-complete" ]; then cp -r ${cacheDir}/node_modules ${baseDir}/ 2>/dev/null || true; fi`],
                AttachStdout: true, AttachStderr: true
            })).start({});

            // Run npm ls to get installed deps (if node_modules missing, npm ls still reports wanted tree)
            const execLs = await container.exec({
                Cmd: ['sh', '-c', `cd ${baseDir} && npm ls --depth=0 --json 2>/dev/null || true`],
                AttachStdout: true,
                AttachStderr: true
            });
            const stream = await execLs.start({});
            let out = '';
            await new Promise((resolve) => {
                stream.on('data', (chunk: Buffer) => out += chunk.toString());
                stream.on('end', resolve);
                stream.on('error', resolve);
                setTimeout(resolve, 1500);
            });
            let installed: Record<string, string> = {};
            try {
                const json = JSON.parse(out || '{}');
                const deps = json.dependencies || {};
                for (const [name, info] of Object.entries<any>(deps)) {
                    if (info && info.version) installed[name] = info.version;
                }
            } catch {
                installed = {};
            }

            res.json({ success: true, declared, installed, metadata: project.dependencyMetadata || {} });
        } finally {
            try { await docker.getContainer(containerName).remove({ force: true }); } catch { }
        }
    } catch (error: any) {
        logger.error('[dependencies] List installed error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to list dependencies' });
    }
});

// POST sync/install dependencies (JavaScript) and return installed
router.post('/:projectId/dependencies/sync', auth, async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const userId = (req as any).userId;
        const project = await Project.findOne({ _id: projectId, owner: userId });
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
        if (project.language !== 'javascript') return res.status(400).json({ success: false, error: 'Only JavaScript dependencies are supported for now' });

        const rawDeps: Record<string, unknown> = (() => {
            const deps: any = (project as any).dependencies || {};
            if (deps && typeof deps.entries === 'function') {
                return Object.fromEntries(deps.entries());
            }
            return deps;
        })();
        const declared: Record<string, string> = {};
        for (const [name, version] of Object.entries(rawDeps || {})) {
            const depName = String(name || '').trim();
            if (!depName) continue;
            const depVersion = typeof version === 'string' && version.trim() ? version.trim() : '*';
            declared[depName] = depVersion;
        }
        const depsHash = crypto.createHash('md5').update(stableDepsString(declared)).digest('hex');
        const cacheDir = `/dependencies/js-${depsHash}`;
        const language = project.language;
        const containerName = `nexusquest-deps-sync-${projectId}-${Date.now()}`;
        const baseDir = `/tmp/project-${projectId}-${Date.now()}`;

        const container = await docker.createContainer({
            Image: languageImages[language],
            name: containerName,
            Cmd: ['sh', '-c', 'while true; do sleep 1; done'],
            Tty: true,
            OpenStdin: false,
            HostConfig: {
                NetworkMode: 'bridge',
                Dns: ['8.8.8.8', '8.8.4.4'],
                Binds: [`${language}-dependencies:/dependencies:rw`],
                Tmpfs: { '/tmp': 'rw,exec,nosuid,size=50m' }
            }
        });
        await container.start();

        let installed: Record<string, string> = {};
        let usedCache = false;
        try {
            // Fix perms on /dependencies
            await (await container.exec({ User: 'root', Cmd: ['sh', '-c', 'mkdir -p /dependencies && chown -R 1001:1001 /dependencies && chmod 0775 /dependencies'], AttachStdout: true, AttachStderr: true })).start({});
            // Write package.json
            await (await container.exec({ Cmd: ['sh', '-c', `mkdir -p ${baseDir}`], AttachStdout: true, AttachStderr: true })).start({});
            const pkgJson = JSON.stringify({ name: 'nexusquest-project', version: '1.0.0', dependencies: declared });
            const pkg64 = Buffer.from(pkgJson).toString('base64');
            await (await container.exec({ Cmd: ['sh', '-c', `echo "${pkg64}" | base64 -d > ${baseDir}/package.json`], AttachStdout: true, AttachStderr: true })).start({});

            // Try cache
            const checkExec = await container.exec({ Cmd: ['sh', '-c', `[ -d "${cacheDir}/node_modules" ] && [ -f "${cacheDir}/.cache-complete" ] && echo cache_exists || echo cache_missing`], AttachStdout: true, AttachStderr: true });
            const checkStream = await checkExec.start({});
            let checkOut = '';
            await new Promise((resolve) => { checkStream.on('data', (c: Buffer) => checkOut += c.toString()); checkStream.on('end', resolve); checkStream.on('error', resolve); setTimeout(resolve, 1000); });
            if (checkOut.includes('cache_exists')) {
                usedCache = true;
                await (await container.exec({ Cmd: ['sh', '-c', `cp -r ${cacheDir}/node_modules ${baseDir}/ 2>/dev/null || true`], AttachStdout: true, AttachStderr: true })).start({});
            } else {
                // Install and cache
                const installExec = await container.exec({
                    Cmd: ['sh', '-c', `cd ${baseDir} && npm install --legacy-peer-deps --no-audit --no-fund > npm-install.log 2>&1; ec=$?; if [ $ec -eq 0 ]; then mkdir -p ${cacheDir} && cp -r ${baseDir}/node_modules ${cacheDir}/ 2>/dev/null || true; touch ${cacheDir}/.cache-complete; echo ok; else echo fail; echo "---- package.json ----"; cat ${baseDir}/package.json 2>/dev/null || true; echo "---- npm-install.log (tail) ----"; tail -n 400 npm-install.log 2>/dev/null || true; fi`],
                    AttachStdout: true,
                    AttachStderr: true
                });
                const installStream = await installExec.start({});
                let instOut = '';
                await new Promise((resolve) => { installStream.on('data', (c: Buffer) => instOut += c.toString()); installStream.on('end', resolve); installStream.on('error', resolve); setTimeout(resolve, 300000); });
                if (!instOut.includes('ok')) {
                    const details = instOut.length > 12000 ? instOut.slice(-12000) : instOut;
                    return res.status(500).json({ success: false, error: 'npm install failed', details });
                }
            }

            // npm ls to extract installed
            const lsExec = await container.exec({ Cmd: ['sh', '-c', `cd ${baseDir} && npm ls --depth=0 --json 2>/dev/null || true`], AttachStdout: true, AttachStderr: true });
            const lsStream = await lsExec.start({});
            let out = '';
            await new Promise((resolve) => { lsStream.on('data', (c: Buffer) => out += c.toString()); lsStream.on('end', resolve); lsStream.on('error', resolve); setTimeout(resolve, 1500); });
            try {
                const json = JSON.parse(out || '{}');
                const deps = json.dependencies || {};
                for (const [name, info] of Object.entries<any>(deps)) {
                    if (info && info.version) installed[name] = info.version;
                }
            } catch { }

            // Update project metadata
            project.dependencyMetadata = {
                installed: true,
                installedAt: new Date(),
                hash: depsHash,
            } as any;
            await project.save();

            res.json({ success: true, declared, installed, usedCache });
        } finally {
            try { await docker.getContainer(containerName).remove({ force: true }); } catch { }
        }
    } catch (error: any) {
        logger.error('[dependencies] Sync error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to sync dependencies' });
    }
});

export default router;
