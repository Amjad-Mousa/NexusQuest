import express, { Request, Response } from 'express';
import Docker from 'dockerode';
import { logger } from '../utils/logger.js';

const router = express.Router();
const docker = new Docker();

// Store active streams for input handling
const activeStreams = new Map<string, any>();

interface ProjectExecutionRequest extends Request {
    body: {
        files: Array<{ name: string; content: string }>;
        mainFile: string;
        language: 'python' | 'java' | 'javascript' | 'cpp';
        sessionId: string;
    };
}

const languageImages: Record<string, string> = {
    python: 'nexusquest-python',
    java: 'nexusquest-java',
    javascript: 'nexusquest-javascript',
    cpp: 'nexusquest-cpp',
};

/**
 * Helper to get execution command based on language
 */
function getExecutionCommand(language: string, baseDir: string, files: Array<{ name: string; content: string }>, mainFile: string): string {
    switch (language.toLowerCase()) {
        case 'python':
            return `cd ${baseDir} && PYTHONPATH=${baseDir} python3 -u ${mainFile}`;

        case 'javascript':
            return `cd ${baseDir} && node ${mainFile}`;

        case 'java': {
            const mainFileContent = files.find(f => f.name === mainFile)?.content || '';
            const classMatch = mainFileContent.match(/public\s+class\s+(\w+)/);
            const className = classMatch ? classMatch[1] : 'Main';
            const javaFiles = files.filter(f => f.name.endsWith('.java')).map(f => f.name).join(' ');
            return `cd ${baseDir} && javac ${javaFiles} -d . && java -cp . ${className}`;
        }

        case 'cpp': {
            const cppFiles = files.filter(f => f.name.endsWith('.cpp')).map(f => f.name).join(' ');
            return `cd ${baseDir} && g++ -std=c++20 -I${baseDir} ${cppFiles} -o a.out && ./a.out`;
        }

        default:
            throw new Error(`Unsupported language: ${language}`);
    }
}

/**
 * POST /api/projects/execute
 * Execute project code (multi-file) with streaming output
 */
router.post('/execute', async (req: ProjectExecutionRequest, res: Response) => {
    const { files, mainFile, language, sessionId } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: files array',
        });
    }

    if (!mainFile) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: mainFile',
        });
    }

    if (!language || !sessionId) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: language, sessionId',
        });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const containerName = `nexusquest-project-${sessionId}`;
    const baseDir = `/tmp/project-${sessionId}`;

    try {
        // Check and remove existing container
        try {
            const existingContainer = docker.getContainer(containerName);
            await existingContainer.inspect();
            logger.info(`Removing existing container: ${containerName}`);
            await existingContainer.remove({ force: true });
        } catch (error: any) {
            if (error.statusCode !== 404) {
                logger.warn(`Error checking existing container: ${error.message}`);
            }
        }

        // Create container
        const container = await docker.createContainer({
            Image: languageImages[language],
            name: containerName,
            Cmd: ['sh', '-c', 'while true; do sleep 1; done'],
            Tty: true,
            OpenStdin: true,
            StdinOnce: false,
            AttachStdin: true,
            AttachStdout: true,
            AttachStderr: true,
            HostConfig: {
                Memory: 256 * 1024 * 1024,
                AutoRemove: false,
                NetworkMode: 'none',
                Tmpfs: {
                    '/tmp': 'rw,exec,nosuid,size=50m'
                }
            }
        });

        await container.start();
        logger.info(`Container started: ${containerName}`);

        // Create base directory
        const mkdirExec = await container.exec({
            Cmd: ['sh', '-c', `mkdir -p ${baseDir}`],
            AttachStdout: true,
            AttachStderr: true
        });
        await mkdirExec.start({});

        // Create subdirectories if needed
        const dirs = new Set<string>();
        files.forEach(f => {
            const parts = f.name.split('/');
            if (parts.length > 1) {
                for (let i = 1; i < parts.length; i++) {
                    dirs.add(parts.slice(0, i).join('/'));
                }
            }
        });

        for (const dir of dirs) {
            const mkdirDirExec = await container.exec({
                Cmd: ['sh', '-c', `mkdir -p ${baseDir}/${dir}`],
                AttachStdout: true,
                AttachStderr: true
            });
            await mkdirDirExec.start({});
        }

        // Write all files to container
        for (const file of files) {
            const escapedContent = file.content.replace(/'/g, "'\\''");
            const writeCmd = [
                `cat > ${baseDir}/${file.name} << 'EOFCODE'`,
                escapedContent,
                'EOFCODE'
            ].join('\n');
            const writeExec = await container.exec({
                Cmd: ['sh', '-c', writeCmd],
                AttachStdout: true,
                AttachStderr: true
            });
            await writeExec.start({});
        }

        // Prepare execution command
        const execCommand = getExecutionCommand(language, baseDir, files, mainFile);
        logger.info(`Project execution command: ${execCommand}`);

        // Execute code
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

        // Store stream for input handling
        activeStreams.set(sessionId, stream);

        // Handle client disconnect
        req.on('close', async () => {
            try {
                activeStreams.delete(sessionId);
                stream.end();
                await container.remove({ force: true });
                logger.info(`Container removed after client disconnect: ${containerName}`);
            } catch (err) {
                logger.error(`Error cleaning up container: ${err}`);
            }
        });

        // Stream output to client
        stream.on('data', (chunk: Buffer) => {
            const output = chunk.toString('utf8').replace(/[\x00-\x08]/g, '');
            if (output.trim()) {
                res.write(`data: ${JSON.stringify({ type: 'stdout', data: output })}\n\n`);
            }
        });

        stream.on('end', async () => {
            res.write(`data: ${JSON.stringify({ type: 'end', data: '' })}\n\n`);
            res.end();

            // Clean up
            activeStreams.delete(sessionId);

            try {
                await container.remove({ force: true });
                logger.info(`Container removed after execution: ${containerName}`);
            } catch (err) {
                logger.error(`Error removing container: ${err}`);
            }
        });

        stream.on('error', async (error: Error) => {
            logger.error(`Stream error: ${error.message}`);
            res.write(`data: ${JSON.stringify({ type: 'stderr', data: error.message })}\n\n`);
            res.end();

            // Clean up
            activeStreams.delete(sessionId);

            try {
                await container.remove({ force: true });
            } catch (err) {
                logger.error(`Error removing container after error: ${err}`);
            }
        });

    } catch (error: any) {
        logger.error('Project execution failed:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`);
        res.end();
    }
});

/**
 * POST /api/projects/input
 * Send input to running project container
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
                error: 'No active execution found for this session',
            });
        }

        // Write input to the stream
        stream.write(input + '\n');

        logger.info(`Input sent to session ${sessionId}: ${input}`);
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
