import Docker from 'dockerode';
import { logger } from './logger.js';
import { languageImages, getDefaultFileName } from './execution.js';
import { demuxStream } from './dockerStream.js';

const docker = new Docker();

export interface TempContainerExecResult {
    output: string;
    error: string;
}

export interface TempContainerExecOptions {
    sessionIdPrefix?: string;
    timeoutMs?: number;
    memoryLimit?: number;
}

// Execute code in temporary container (used by daily-challenge, tasks, and quizzes)
export async function executeCodeInTempContainer(
    code: string,
    language: string,
    input?: string,
    options: TempContainerExecOptions = {}
): Promise<TempContainerExecResult> {
    const {
        sessionIdPrefix = 'exec',
        timeoutMs = 10000,
        memoryLimit = 256 * 1024 * 1024
    } = options;

    const sessionId = `${sessionIdPrefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const containerName = `nexusquest-${sessionIdPrefix}-${sessionId}`;

    logger.info(`Temp container execution: language=${language}, sessionId=${sessionId}`);

    try {
        // Check and remove existing container (shouldn't exist but safety check)
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

        // Create temporary container
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
                Memory: memoryLimit,
                AutoRemove: false,
                NetworkMode: 'none',
                Tmpfs: {
                    '/tmp': 'rw,exec,nosuid,size=50m'
                }
            }
        });

        await container.start();
        logger.info(`Temp container started: ${containerName}`);

        // Write code to file
        const fileName = getDefaultFileName(language, 'simple', code);
        const filePath = `/tmp/${fileName}`;

        // Write code using cat with heredoc to avoid issues with special characters
        const escapedCode = code.replace(/'/g, "'\\''");
        const writeCmd = [
            `cat > ${filePath} << 'EOFCODE'`,
            escapedCode,
            'EOFCODE'
        ].join('\n');

        const writeExec = await container.exec({
            Cmd: ['sh', '-c', writeCmd],
            AttachStdout: true,
            AttachStderr: true
        });
        await writeExec.start({});

        // Prepare execution command
        let execCommand: string;
        let className: string | undefined;

        if (language === 'python') {
            execCommand = `python3 -u ${filePath}`;
        } else if (language === 'javascript') {
            execCommand = `node ${filePath}`;
        } else if (language === 'cpp') {
            execCommand = `g++ -std=c++20 ${filePath} -o /tmp/a.out && /tmp/a.out`;
        } else if (language === 'java') {
            const classMatch = code.match(/public\s+class\s+(\w+)/);
            className = classMatch ? classMatch[1] : 'Main';
            execCommand = `cd /tmp && javac ${fileName} && java -cp /tmp ${className}`;
        } else {
            await container.remove({ force: true });
            return { output: '', error: 'Unsupported language' };
        }

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

        // Send input if provided
        if (input) {
            stream.write(input + '\n');
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        stream.end();

        // Collect output
        const outputPromise = demuxStream(stream);

        // Set timeout
        const timeoutPromise = new Promise<{ stdout: string; stderr: string }>((_, reject) => {
            setTimeout(() => {
                stream.destroy();
                reject(new Error(`Execution timeout (${timeoutMs / 1000} seconds)`));
            }, timeoutMs);
        });

        const { stdout, stderr } = await Promise.race([outputPromise, timeoutPromise]);

        // Clean up container
        try {
            await container.stop();
            await new Promise(resolve => setTimeout(resolve, 500));
            await container.remove({ force: true });
            logger.info(`Temp container removed: ${containerName}`);
        } catch (err: any) {
            if (err.statusCode !== 404 && !err.message?.includes('No such container')) {
                logger.warn(`Error removing temp container: ${err.message}`);
            }
        }

        return {
            output: stdout.trim() || 'Code executed successfully (no output)',
            error: stderr.trim()
        };

    } catch (error: any) {
        logger.error('Temp container execution failed:', error);

        // Try to clean up container if it still exists
        try {
            const container = docker.getContainer(containerName);
            await container.remove({ force: true });
        } catch (cleanupErr) {
            // Ignore cleanup errors
        }

        return {
            output: '',
            error: error.message || 'Execution failed'
        };
    }
}
