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

export async function executeCodeInTempContainer(
    code: string,
    language: string,
    input?: string,
    options: TempContainerExecOptions = {}
): Promise<TempContainerExecResult> {
    const {
        sessionIdPrefix = 'exec',
        timeoutMs = 15000, // Increased from 10000 to 15000
        memoryLimit = 256 * 1024 * 1024
    } = options;

    const sessionId = `${sessionIdPrefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const containerName = `nexusquest-${sessionIdPrefix}-${sessionId}`;

    logger.info(`Temp container execution: language=${language}, sessionId=${sessionId}`);

    let container: Docker.Container | null = null;
    let stream: any = null;

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

        // Create temporary container
        container = await docker.createContainer({
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

        // Write code to file using a more reliable method
        const fileName = getDefaultFileName(language, 'simple', code);
        const filePath = `/tmp/${fileName}`;

        // Use base64 encoding to avoid escaping issues
        const codeBase64 = Buffer.from(code).toString('base64');
        const writeCmd = `echo '${codeBase64}' | base64 -d > ${filePath}`;

        const writeExec = await container.exec({
            Cmd: ['sh', '-c', writeCmd],
            AttachStdout: true,
            AttachStderr: true
        });
        
        // Start the write operation (but don't wait for stream)
        await writeExec.start({});
        
        // Poll the exec to see when it's done
        let writeComplete = false;
        const writeTimeout = Date.now() + 5000;
        while (!writeComplete && Date.now() < writeTimeout) {
            try {
                const inspectData = await writeExec.inspect();
                if (!inspectData.Running) {
                    writeComplete = true;
                    break;
                }
            } catch {
                // Ignore inspect errors
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (!writeComplete) {
            throw new Error('File write timeout');
        }

        // Small delay for filesystem sync
        await new Promise(resolve => setTimeout(resolve, 100));

        // Prepare execution command
        let execCommand: string;
        let className: string | undefined;

        if (language === 'python') {
            execCommand = `timeout ${Math.ceil(timeoutMs / 1000)} python3 -u ${filePath}`;
        } else if (language === 'javascript') {
            execCommand = `timeout ${Math.ceil(timeoutMs / 1000)} node ${filePath}`;
        } else if (language === 'cpp') {
            execCommand = `g++ -std=c++20 ${filePath} -o /tmp/a.out && timeout ${Math.ceil(timeoutMs / 1000)} /tmp/a.out`;
        } else if (language === 'java') {
            const classMatch = code.match(/public\s+class\s+(\w+)/);
            className = classMatch ? classMatch[1] : 'Main';
            execCommand = `cd /tmp && javac ${fileName} && timeout ${Math.ceil(timeoutMs / 1000)} java -cp /tmp ${className}`;
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

        stream = await exec.start({
            hijack: true,
            stdin: true
        });

        // Send input if provided
        if (input) {
            stream.write(input + '\n');
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        stream.end();

        // Collect output with timeout
        const outputPromise = demuxStream(stream, timeoutMs);

        const timeoutPromise = new Promise<{ stdout: string; stderr: string }>((_, reject) => {
            setTimeout(() => {
                if (stream) {
                    try {
                        stream.destroy();
                    } catch {}
                }
                reject(new Error(`Execution timeout (${timeoutMs / 1000} seconds)`));
            }, timeoutMs + 1000); // Small buffer beyond container timeout
        });

        const { stdout, stderr } = await Promise.race([outputPromise, timeoutPromise]);

        // Clean up container
        await cleanupContainer(container, containerName);

        return {
            output: stdout.trim() || 'Code executed successfully (no output)',
            error: stderr.trim()
        };

    } catch (error: any) {
        logger.error('Temp container execution failed:', error);

        // Clean up resources
        if (stream) {
            try {
                stream.destroy();
            } catch { }
        }

        if (container) {
            await cleanupContainer(container, containerName);
        }

        return {
            output: '',
            error: error.message || 'Execution failed'
        };
    }
}

// Helper function for container cleanup
async function cleanupContainer(container: Docker.Container, containerName: string): Promise<void> {
    try {
        // Try graceful stop first with shorter timeout
        await Promise.race([
            container.stop({ t: 1 }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Stop timeout')), 2000))
        ]);
    } catch (err: any) {
        logger.warn(`Could not stop container gracefully: ${err.message}`);
    }

    try {
        // Force remove
        await container.remove({ force: true });
        logger.info(`Temp container removed: ${containerName}`);
    } catch (err: any) {
        if (err.statusCode !== 404 && !err.message?.includes('No such container')) {
            logger.warn(`Error removing temp container: ${err.message}`);
        }
    }
}
