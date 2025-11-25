import Docker from 'dockerode';
import { logger } from '../utils/logger.js';
const docker = new Docker();
export async function executeCode(code, language) {
    const startTime = Date.now();
    try {
        // Ensure Docker is available
        await docker.ping();
        // For now, we only support Python
        if (language !== 'python') {
            throw new Error(`Language ${language} is not supported yet`);
        }
        const result = await executePythonCode(code);
        const executionTime = Date.now() - startTime;
        return {
            ...result,
            executionTime
        };
    }
    catch (error) {
        logger.error('Docker execution error:', error);
        return {
            output: '',
            error: error instanceof Error ? error.message : 'Unknown execution error',
            executionTime: Date.now() - startTime
        };
    }
}
async function executePythonCode(code) {
    const containerName = `nexusquest-python-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    try {
        // Create and start container
        const container = await docker.createContainer({
            Image: 'python:3.10-slim',
            name: containerName,
            Cmd: ['python', '-c', code],
            WorkingDir: '/app',
            HostConfig: {
                Memory: 128 * 1024 * 1024, // 128MB memory limit
                CpuQuota: 50000, // 50% CPU limit
                NetworkMode: 'none', // No network access
                ReadonlyRootfs: true, // Read-only filesystem
                Tmpfs: {
                    '/tmp': 'noexec,nosuid,size=100m'
                }
            },
            AttachStdout: true,
            AttachStderr: true,
        });
        await container.start();
        // Set execution timeout
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Execution timeout (10 seconds)')), 10000);
        });
        // Wait for container to finish or timeout
        const resultPromise = container.wait();
        await Promise.race([resultPromise, timeoutPromise]);
        // Get output
        const stream = await container.logs({
            stdout: true,
            stderr: true,
            timestamps: false
        });
        const output = stream.toString();
        // Clean up container
        await container.remove({ force: true });
        // Parse output (Docker logs include both stdout and stderr)
        const lines = output.split('\n').filter((line) => line.trim());
        const stdout = lines.filter((line) => !line.includes('Error') && !line.includes('Traceback')).join('\n');
        const stderr = lines.filter((line) => line.includes('Error') || line.includes('Traceback')).join('\n');
        return {
            output: stdout || 'Code executed successfully (no output)',
            error: stderr || ''
        };
    }
    catch (error) {
        // Clean up container if it exists
        try {
            const container = docker.getContainer(containerName);
            await container.remove({ force: true });
        }
        catch {
            // Container might not exist, ignore cleanup errors
        }
        if (error instanceof Error && error.message.includes('timeout')) {
            return {
                output: '',
                error: 'Code execution timed out (maximum 10 seconds allowed)'
            };
        }
        return {
            output: '',
            error: error instanceof Error ? error.message : 'Unknown execution error'
        };
    }
}
//# sourceMappingURL=dockerService.js.map