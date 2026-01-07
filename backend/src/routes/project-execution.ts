import express, { Request, Response } from 'express';
import type Docker from 'dockerode';
import { logger } from '../utils/logger.js';
import { languageImages, getExecutionCommand, needsNetworkAccess } from '../utils/executionCommands.js';
import {
    removeExistingContainer,
    createProjectContainer,
    ensureDependencyVolumeWritable,
    createProjectDirectories,
    writeFilesToContainer,
    cleanupContainer
} from '../utils/containerHelpers.js';
import { installDependencies } from '../utils/dependencyInstallers.js';
import {
    autoLoadProjectLibraries,
    copyCustomLibrariesToContainer,
    extractCustomLibraries,
    type CustomLibrary
} from '../utils/customLibraryHandlers.js';

const router = express.Router();

// Store active streams for input handling
const activeStreams = new Map<string, any>();

interface ProjectExecutionRequest extends Request {
    body: {
        files: Array<{ name: string; content: string }>;
        mainFile: string;
        language: 'python' | 'java' | 'javascript' | 'cpp';
        sessionId: string;
        projectId?: string;
        dependencies?: Record<string, string>;
        customLibraries?: CustomLibrary[];
    };
}

/**
 * POST /api/projects/execute
 * Execute project code (multi-file) with streaming output
 */
router.post('/execute', async (req: ProjectExecutionRequest, res: Response) => {
    const { files, mainFile, language, sessionId, dependencies, projectId } = req.body;

    // Validate request
    if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ success: false, error: 'Missing required fields: files array' });
    }
    if (!mainFile) {
        return res.status(400).json({ success: false, error: 'Missing required fields: mainFile' });
    }
    if (!language || !sessionId) {
        return res.status(400).json({ success: false, error: 'Missing required fields: language, sessionId' });
    }

    // Set up SSE response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const containerName = `nexusquest-project-${sessionId}`;
    const baseDir = `/tmp/project-${sessionId}`;
    const cacheDir = `/dependencies/${sessionId}`;

    let container: Docker.Container | null = null;

    try {
        // Remove existing container if any
        await removeExistingContainer(containerName);

        // Auto-load custom libraries from project if not provided
        let customLibraries = req.body.customLibraries;
        if (projectId) {
            customLibraries = await autoLoadProjectLibraries(projectId, language, customLibraries);
        }

        // Check if network is needed
        const needsNetwork = needsNetworkAccess(language, dependencies, files);

        // Create and start container
        container = await createProjectContainer({
            language,
            sessionId,
            needsNetwork,
            languageImages
        });

        // Ensure dependency volume is writable
        await ensureDependencyVolumeWritable(container);

        // Create project directories
        await createProjectDirectories(container, baseDir, files);

        // Write all files to container
        await writeFilesToContainer(container, baseDir, files);

        // Copy custom libraries from database to container
        if (customLibraries && customLibraries.length > 0 && projectId) {
            await copyCustomLibrariesToContainer(container, projectId, customLibraries, language);
        }

        // Install dependencies (npm, pip, maven, conan)
        await installDependencies(container, language, baseDir, cacheDir, files, dependencies);

        // Extract/install custom libraries
        if (customLibraries && customLibraries.length > 0 && projectId) {
            await extractCustomLibraries(container, projectId, language, baseDir);
        }

        // Execute code
        const execCommand = getExecutionCommand(language, baseDir, files, mainFile);
        logger.info(`Executing: ${execCommand}`);

        const exec = await container.exec({
            Cmd: ['sh', '-c', execCommand],
            AttachStdin: true,
            AttachStdout: true,
            AttachStderr: true,
            Tty: false
        });

        const stream = await exec.start({
            hijack: true,
            stdin: true
        });

        activeStreams.set(sessionId, stream);

        // Handle client disconnect
        req.on('close', async () => {
            try {
                activeStreams.delete(sessionId);
                stream.end();
                setTimeout(async () => {
                    if (container) {
                        await cleanupContainer(container);
                    }
                }, 1000);
            } catch (err) {
                logger.error(`Disconnect handler error: ${err}`);
            }
        });

        // Stream output
        stream.on('data', (chunk: Buffer) => {
            const output = chunk.toString('utf8').replace(/[\x00-\x08]/g, '');
            if (output.trim()) {
                res.write(`data: ${JSON.stringify({ type: 'stdout', data: output })}\n\n`);
            }
        });

        stream.on('end', async () => {
            res.write(`data: ${JSON.stringify({ type: 'end', data: '' })}\n\n`);
            res.end();
            activeStreams.delete(sessionId);
            setTimeout(async () => {
                if (container) {
                    await cleanupContainer(container);
                }
            }, 1000);
        });

        stream.on('error', async (error: Error) => {
            logger.error(`Stream error: ${error.message}`);
            res.write(`data: ${JSON.stringify({ type: 'stderr', data: error.message })}\n\n`);
            res.end();
            activeStreams.delete(sessionId);
            setTimeout(async () => {
                if (container) {
                    await cleanupContainer(container);
                }
            }, 1000);
        });

    } catch (error: any) {
        logger.error('Execution failed:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`);
        res.end();

        if (container) {
            await cleanupContainer(container);
        }
    }
});

/**
 * POST /api/projects/input
 * Send input to running container
 */
router.post('/input', async (req: Request, res: Response) => {
    const { sessionId, input } = req.body;

    if (!sessionId || input === undefined) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: sessionId, input',
        });
    }

    try {
        const stream = activeStreams.get(sessionId);
        if (!stream) {
            return res.status(404).json({
                success: false,
                error: 'No active execution found',
            });
        }

        stream.write(input + '\n');
        logger.info(`Input sent to ${sessionId}: ${input}`);
        res.json({ success: true });
    } catch (error: any) {
        logger.error('Failed to send input:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

export { router as projectExecutionRouter };

