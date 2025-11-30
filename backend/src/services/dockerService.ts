import Docker from 'dockerode';
import { logger } from '../utils/logger.js';

const docker = new Docker();

interface ExecutionResult {
  output: string;
  error: string;
  executionTime: number;
}

export interface ProjectFile {
  name: string;
  content: string;
  language: string;
}

export interface ProjectExecutionRequest {
  files: ProjectFile[];
  mainFile: string;
  language: string;
  input?: string;
}

export async function checkDockerStatus(): Promise<{ available: boolean; message: string }> {
  try {
    await docker.ping();
    return {
      available: true,
      message: 'Docker is running'
    };
  } catch (error) {
    logger.error('Docker is not available:', error);
    return {
      available: false,
      message: 'Docker Desktop is not running. Please start Docker Desktop.'
    };
  }
}

// Map languages to their PERSISTENT container names (from docker-compose)
const persistentContainers: Record<string, string> = {
  'python': 'nexusquest-python',
  'javascript': 'nexusquest-javascript',
  'java': 'nexusquest-java',
  'cpp': 'nexusquest-cpp',
  'c++': 'nexusquest-cpp'
};

// Helper to demultiplex Docker stream
function demuxStream(stream: any): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let dataReceived = false;

    const timeout = setTimeout(() => {
      if (!dataReceived) {
        logger.warn('No data received from stream after 2 seconds');
      }
    }, 2000);

    stream.on('data', (chunk: Buffer) => {
      dataReceived = true;
      clearTimeout(timeout);

      // Docker uses 8-byte headers for multiplexed streams
      let offset = 0;
      while (offset < chunk.length) {
        if (chunk.length - offset < 8) break;

        const streamType = chunk.readUInt8(offset);
        const payloadSize = chunk.readUInt32BE(offset + 4);

        if (payloadSize > 0 && offset + 8 + payloadSize <= chunk.length) {
          const payload = chunk.toString('utf8', offset + 8, offset + 8 + payloadSize);
          if (streamType === 1) {
            stdout += payload;
          } else if (streamType === 2) {
            stderr += payload;
          }
        }
        offset += 8 + payloadSize;
      }
    });

    stream.on('end', () => {
      clearTimeout(timeout);
      resolve({ stdout, stderr });
    });

    stream.on('error', (err: Error) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// Get execution command based on language
function getExecutionCommand(language: string, mainFile: string): string {
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
export async function executeCode(code: string, language: string, input?: string): Promise<ExecutionResult> {
  const startTime = Date.now();
  const containerName = persistentContainers[language.toLowerCase()];

  logger.info(`[executeCode] Starting execution for language: ${language}, input: ${input ? 'yes' : 'no'}`);

  if (!containerName) {
    logger.error(`[executeCode] Unsupported language: ${language}`);
    return {
      output: '',
      error: `Unsupported language: ${language}`,
      executionTime: Date.now() - startTime,
    };
  }

  try {
    const container = docker.getContainer(containerName);
    logger.info(`[executeCode] Got container reference: ${containerName}`);

    // Check if container exists and is running
    try {
      const info = await container.inspect();
      logger.info(`[executeCode] Container state: ${info.State.Status}, Running: ${info.State.Running}`);

      if (!info.State.Running) {
        logger.info(`[executeCode] Starting container: ${containerName}`);
        await container.start();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (err: any) {
      if (err.statusCode === 404) {
        logger.error(`[executeCode] Container not found: ${containerName}`);
        return {
          output: '',
          error: `Container ${containerName} not found. Please run: docker-compose up -d`,
          executionTime: Date.now() - startTime,
        };
      }
      logger.error(`[executeCode] Container inspect error:`, err);
      throw err;
    }

    // Determine file name based on language
    let fileName: string;
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

    // Use a unique temp directory for each execution
    const tempDir = `/tmp/nexusquest-exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    logger.info(`[executeCode] Using temp directory: ${tempDir}`);

    // Create temp directory
    logger.info(`[executeCode] Creating directory...`);
    const mkdirExec = await container.exec({
      Cmd: ['sh', '-c', `mkdir -p ${tempDir}`],
      AttachStdout: true,
      AttachStderr: true,
    });
    const mkdirStream = await mkdirExec.start({ hijack: true });
    await new Promise((resolve) => {
      mkdirStream.on('end', resolve);
      mkdirStream.on('error', (err: any) => {
        logger.error('[executeCode] mkdir error:', err);
        resolve(null);
      });
    });

    // Write code to file
    logger.info(`[executeCode] Writing code to file: ${fileName}`);
    const escapedCode = code.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`');
    const writeExec = await container.exec({
      Cmd: ['sh', '-c', `echo "${escapedCode}" > ${tempDir}/${fileName}`],
      AttachStdout: true,
      AttachStderr: true,
    });

    const writeStream = await writeExec.start({ hijack: true });
    await new Promise((resolve) => {
      writeStream.on('end', resolve);
      writeStream.on('error', (err: any) => {
        logger.error('[executeCode] write error:', err);
        resolve(null);
      });
    });

    // Execute the code
    const execCommand = getExecutionCommand(language, `${tempDir}/${fileName}`);
    logger.info(`[executeCode] Executing command: ${execCommand}`);
    logger.info(`[executeCode] With input: "${input}"`);

    const exec = await container.exec({
      Cmd: ['sh', '-c', execCommand],
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: false,
    });

    const stream = await exec.start({
      hijack: true,
      stdin: true,
    });

    logger.info(`[executeCode] Stream started`);

    // Send input if provided
    if (input) {
      logger.info(`[executeCode] Writing input to stream...`);

      // Simple approach: write and immediately end
      stream.write(input);
      stream.write('\n');

      // Give it a moment to flush
      await new Promise(resolve => setTimeout(resolve, 100));

      stream.end();
      logger.info(`[executeCode] Input sent and stream ended`);
    } else {
      // No input - close stdin immediately
      stream.end();
      logger.info(`[executeCode] No input - stdin closed`);
    }

    // Set timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        logger.error('[executeCode] TIMEOUT - destroying stream');
        stream.destroy();
        reject(new Error('Execution timeout (10 seconds)'));
      }, 10000);
    });

    // Get output
    logger.info(`[executeCode] Waiting for output...`);
    const outputPromise = demuxStream(stream);
    const { stdout, stderr } = await Promise.race([outputPromise, timeoutPromise]);

    logger.info(`[executeCode] Got output - stdout: "${stdout}", stderr: "${stderr}"`);

    // Cleanup files
    try {
      const cleanupExec = await container.exec({
        Cmd: ['sh', '-c', `rm -rf ${tempDir}`],
        AttachStdout: false,
        AttachStderr: false,
      });
      const cleanStream = await cleanupExec.start({});
      cleanStream.resume();
    } catch (cleanupErr) {
      logger.warn('[executeCode] Cleanup warning:', cleanupErr);
    }

    const executionTime = Date.now() - startTime;
    logger.info(`[executeCode] Execution completed in ${executionTime}ms`);

    return {
      output: stdout.trim() || 'Code executed successfully (no output)',
      error: stderr.trim(),
      executionTime,
    };
  } catch (error: any) {
    logger.error('[executeCode] Code execution error:', error);

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
export async function executeProject(request: ProjectExecutionRequest): Promise<ExecutionResult> {
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
    } catch (err: any) {
      if (err.statusCode === 404) {
        return {
          output: '',
          error: `Container ${containerName} not found. Please run: docker-compose up -d`,
          executionTime: Date.now() - startTime,
        };
      }
      throw err;
    }

    // Use a unique temp directory
    const baseDir = `/tmp/nexusquest-project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
    const dirs = new Set<string>();
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
      const escapedContent = file.content.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`');
      const writeExec = await container.exec({
        Cmd: ['sh', '-c', `echo "${escapedContent}" > ${baseDir}/${file.name}`],
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
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: false,
    });

    const stream = await exec.start({
      hijack: true,
      stdin: true,
    });

    // Send input if provided
    if (input) {
      stream.write(input);
      stream.write('\n');
      await new Promise(resolve => setTimeout(resolve, 100));
      stream.end();
    } else {
      stream.end();
    }

    // Set timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
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
    } catch (cleanupErr) {
      logger.warn('Cleanup warning:', cleanupErr);
    }

    const executionTime = Date.now() - startTime;

    return {
      output: stdout.trim() || 'Code executed successfully (no output)',
      error: stderr.trim(),
      executionTime,
    };
  } catch (error: any) {
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