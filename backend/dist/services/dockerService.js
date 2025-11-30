import Docker from 'dockerode';
import { logger } from '../utils/logger.js';
const docker = new Docker();
export async function checkDockerStatus() {
    try {
        await docker.ping();
        return {
            available: true,
            message: 'Docker is running'
        };
    }
    catch (error) {
        logger.error('Docker is not available:', error);
        return {
            available: false,
            message: 'Docker Desktop is not running. Please start Docker Desktop.'
        };
    }
}
// Map languages to their PERSISTENT container names (from docker-compose)
const persistentContainers = {
    'python': 'nexusquest-python',
    'javascript': 'nexusquest-javascript',
    'java': 'nexusquest-java',
    'cpp': 'nexusquest-cpp',
    'c++': 'nexusquest-cpp'
};
// Helper to demultiplex Docker stream
function demuxStream(stream) {
    return new Promise((resolve, reject) => {
        let stdout = '';
        let stderr = '';
        stream.on('data', (chunk) => {
            // Docker uses 8-byte headers for multiplexed streams
            let offset = 0;
            while (offset < chunk.length) {
                if (chunk.length - offset < 8)
                    break;
                const streamType = chunk.readUInt8(offset);
                const payloadSize = chunk.readUInt32BE(offset + 4);
                if (payloadSize > 0 && offset + 8 + payloadSize <= chunk.length) {
                    const payload = chunk.toString('utf8', offset + 8, offset + 8 + payloadSize);
                    if (streamType === 1) {
                        stdout += payload;
                    }
                    else if (streamType === 2) {
                        stderr += payload;
                    }
                }
                offset += 8 + payloadSize;
            }
        });
        stream.on('end', () => {
            resolve({ stdout, stderr });
        });
        stream.on('error', (err) => {
            reject(err);
        });
    });
}
// Get execution command based on language
function getExecutionCommand(language, mainFile) {
    switch (language.toLowerCase()) {
        case 'python':
            return `python3 -u ${mainFile}`;
        case 'javascript':
            return `node ${mainFile}`;
        case 'java': {
            const baseName = mainFile.substring(mainFile.lastIndexOf('/') + 1);
            const className = baseName.replace('.java', '');
            const dir = mainFile.substring(0, mainFile.lastIndexOf('/'));
            return `cd ${dir} && javac ${baseName} && java ${className}`;
        }
        case 'cpp':
        case 'c++': {
            const baseName = mainFile.substring(mainFile.lastIndexOf('/') + 1);
            const outputName = baseName.replace('.cpp', '');
            const dir = mainFile.substring(0, mainFile.lastIndexOf('/'));
            return `cd ${dir} && g++ -std=c++20 -o ${outputName} ${baseName} && ./${outputName}`;
        }
        default:
            throw new Error(`Unsupported language: ${language}`);
    }
}
// Execute code using PERSISTENT containers
export async function executeCode(code, language, input) {
    const startTime = Date.now();
    const containerName = persistentContainers[language.toLowerCase()];
    if (!containerName) {
        return {
            output: '',
            error: `Unsupported language: ${language}`,
            executionTime: Date.now() - startTime,
        };
    }
    try {
        const container = docker.getContainer(containerName);
        // Check if container exists and is running
        try {
            const info = await container.inspect();
            if (!info.State.Running) {
                logger.info(`Starting container: ${containerName}`);
                await container.start();
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        catch (err) {
            if (err.statusCode === 404) {
                return {
                    output: '',
                    error: `Container ${containerName} not found. Please run: docker-compose up -d`,
                    executionTime: Date.now() - startTime,
                };
            }
            throw err;
        }
        // Determine file name based on language
        let fileName;
        switch (language.toLowerCase()) {
            case 'python':
                fileName = 'main.py';
                break;
            case 'javascript':
                fileName = 'main.js';
                break;
            case 'java':
                const classMatch = code.match(/public\s+class\s+(\w+)/);
                fileName = `${classMatch ? classMatch[1] : 'Main'}.java`;
                break;
            case 'cpp':
            case 'c++':
                fileName = 'main.cpp';
                break;
            default:
                fileName = 'main.txt';
        }
        // Use a temp directory to avoid volume write issues
        const tempDir = '/tmp/nexusquest-exec';
        // Create temp directory
        const mkdirExec = await container.exec({
            Cmd: ['sh', '-c', `mkdir -p ${tempDir}`],
            AttachStdout: false,
            AttachStderr: false,
        });
        const mkdirStream = await mkdirExec.start({});
        await new Promise((resolve) => {
            mkdirStream.on('end', resolve);
            mkdirStream.on('error', resolve);
        });
        // Write code to file using heredoc for safety
        const escapedCode = code.replace(/'/g, "'\\''");
        const writeCmd = [
            `cat > ${tempDir}/${fileName} << 'EOFCODE'`,
            escapedCode,
            'EOFCODE'
        ].join('\n');
        const writeExec = await container.exec({
            Cmd: ['sh', '-c', writeCmd],
            AttachStdout: false,
            AttachStderr: false,
        });
        const writeStream = await writeExec.start({ hijack: true });
        await new Promise((resolve) => {
            writeStream.on('end', resolve);
            writeStream.on('error', resolve);
        });
        // Execute the code - use absolute path in temp directory
        const execCommand = getExecutionCommand(language, `${tempDir}/${fileName}`).replace(/\/app\//g, `${tempDir}/`);
        logger.info(`Executing: ${execCommand}`);
        const exec = await container.exec({
            Cmd: ['sh', '-c', execCommand],
            AttachStdin: !!input,
            AttachStdout: true,
            AttachStderr: true,
            Tty: false,
        });
        const stream = await exec.start({
            hijack: true,
            stdin: !!input,
        });
        // Send input if provided
        if (input) {
            stream.write(input + '\n');
            stream.end();
        }
        // Set timeout
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                stream.destroy();
                reject(new Error('Execution timeout (10 seconds)'));
            }, 10000);
        });
        // Get output
        const outputPromise = demuxStream(stream);
        const { stdout, stderr } = await Promise.race([outputPromise, timeoutPromise]);
        // Cleanup files
        try {
            const cleanupExec = await container.exec({
                Cmd: ['sh', '-c', `rm -rf ${tempDir}`],
                AttachStdout: false,
                AttachStderr: false,
            });
            const cleanStream = await cleanupExec.start({});
            cleanStream.resume();
        }
        catch (cleanupErr) {
            logger.warn('Cleanup warning:', cleanupErr);
        }
        const executionTime = Date.now() - startTime;
        return {
            output: stdout.trim() || 'Code executed successfully (no output)',
            error: stderr.trim(),
            executionTime,
        };
    }
    catch (error) {
        logger.error('Code execution error:', error);
        if (error.message?.includes('timeout')) {
            return {
                output: '',
                error: 'Execution timed out (maximum 10 seconds allowed)',
                executionTime: Date.now() - startTime,
            };
        }
        return {
            output: '',
            error: error.message || 'Execution failed',
            executionTime: Date.now() - startTime,
        };
    }
}
// Execute multi-file project using PERSISTENT containers
export async function executeProject(request) {
    const startTime = Date.now();
    const { files, mainFile, language, input } = request;
    const containerName = persistentContainers[language.toLowerCase()];
    if (!containerName) {
        return {
            output: '',
            error: `Unsupported language: ${language}`,
            executionTime: Date.now() - startTime,
        };
    }
    try {
        const container = docker.getContainer(containerName);
        // Check if container exists and is running
        try {
            const info = await container.inspect();
            if (!info.State.Running) {
                logger.info(`Starting container: ${containerName}`);
                await container.start();
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        catch (err) {
            if (err.statusCode === 404) {
                return {
                    output: '',
                    error: `Container ${containerName} not found. Please run: docker-compose up -d`,
                    executionTime: Date.now() - startTime,
                };
            }
            throw err;
        }
        // Use a temp directory to avoid volume write issues
        const baseDir = '/tmp/nexusquest-project';
        // Create base directory
        const mkdirExec = await container.exec({
            Cmd: ['sh', '-c', `mkdir -p ${baseDir}`],
            AttachStdout: false,
            AttachStderr: false,
        });
        const mkdirStream = await mkdirExec.start({});
        await new Promise((resolve) => {
            mkdirStream.on('end', resolve);
            mkdirStream.on('error', resolve);
        });
        // Create subdirectories if needed
        const dirs = new Set();
        files.forEach(f => {
            const parts = f.name.split('/');
            if (parts.length > 1) {
                for (let i = 1; i < parts.length; i++) {
                    dirs.add(parts.slice(0, i).join('/'));
                }
            }
        });
        if (dirs.size > 0) {
            const mkdirCmd = Array.from(dirs).map(d => `mkdir -p ${baseDir}/${d}`).join(' && ');
            const mkdirExec = await container.exec({
                Cmd: ['sh', '-c', mkdirCmd],
                AttachStdout: false,
                AttachStderr: false,
            });
            const mkdirStream = await mkdirExec.start({});
            await new Promise((resolve) => {
                mkdirStream.on('end', resolve);
                mkdirStream.on('error', resolve);
            });
        }
        // Write all files to container
        for (const file of files) {
            const escapedContent = file.content.replace(/'/g, "'\\''");
            const writeCmd = [
                `cat > ${baseDir}/${file.name} << 'EOFFILE'`,
                escapedContent,
                'EOFFILE'
            ].join('\n');
            const writeExec = await container.exec({
                Cmd: ['sh', '-c', writeCmd],
                AttachStdout: false,
                AttachStderr: false,
            });
            const writeStream = await writeExec.start({ hijack: true });
            await new Promise((resolve) => {
                writeStream.on('end', resolve);
                writeStream.on('error', resolve);
            });
        }
        // Execute the main file
        const execCommand = getExecutionCommand(language, `${baseDir}/${mainFile}`);
        logger.info(`Executing project: ${execCommand}`);
        const exec = await container.exec({
            Cmd: ['sh', '-c', execCommand],
            AttachStdin: !!input,
            AttachStdout: true,
            AttachStderr: true,
            Tty: false,
        });
        const stream = await exec.start({
            hijack: true,
            stdin: !!input,
        });
        // Send input if provided
        if (input) {
            stream.write(input + '\n');
            stream.end();
        }
        // Set timeout
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                stream.destroy();
                reject(new Error('Execution timeout (15 seconds)'));
            }, 15000);
        });
        // Get output
        const outputPromise = demuxStream(stream);
        const { stdout, stderr } = await Promise.race([outputPromise, timeoutPromise]);
        // Cleanup files
        try {
            const cleanupExec = await container.exec({
                Cmd: ['sh', '-c', `rm -rf ${baseDir}`],
                AttachStdout: false,
                AttachStderr: false,
            });
            const cleanStream = await cleanupExec.start({});
            await new Promise((resolve) => {
                cleanStream.on('end', resolve);
                cleanStream.on('error', resolve);
            });
        }
        catch (cleanupErr) {
            logger.warn('Cleanup warning:', cleanupErr);
        }
        const executionTime = Date.now() - startTime;
        return {
            output: stdout.trim() || 'Code executed successfully (no output)',
            error: stderr.trim(),
            executionTime,
        };
    }
    catch (error) {
        logger.error('Project execution error:', error);
        if (error.message?.includes('timeout')) {
            return {
                output: '',
                error: 'Execution timed out (maximum 15 seconds allowed)',
                executionTime: Date.now() - startTime,
            };
        }
        return {
            output: '',
            error: error.message || 'Execution failed',
            executionTime: Date.now() - startTime,
        };
    }
}
//# sourceMappingURL=dockerService.js.map