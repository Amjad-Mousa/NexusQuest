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

    stream.on('data', (chunk: Buffer) => {
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
      resolve({ stdout, stderr });
    });

    stream.on('error', (err: Error) => {
      reject(err);
    });
  });
}

// Get execution command based on language
function getExecutionCommand(language: string, mainFile: string): string {
  switch (language.toLowerCase()) {
    case 'python':
      return `python3 -u /app/${mainFile}`;

    case 'javascript':
      return `node /app/${mainFile}`;

    case 'java': {
      const className = mainFile.replace('.java', '');
      return `cd /app && javac ${mainFile} && java ${className}`;
    }

    case 'cpp':
    case 'c++': {
      const outputName = mainFile.replace('.cpp', '');
      return `cd /app && g++ -std=c++20 -o ${outputName} ${mainFile} && ./${outputName}`;
    }

    default:
      throw new Error(`Unsupported language: ${language}`);
  }
}

// Execute code using PERSISTENT containers
export async function executeCode(code: string, language: string, input?: string): Promise<ExecutionResult> {
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

    // Write code to file using heredoc for safety
    const writeExec = await container.exec({
      Cmd: ['sh', '-c', `cat > /app/${fileName} << 'EOFCODE'\n${code}\nEOFCODE`],
      AttachStdout: true,
      AttachStderr: true,
    });

    const writeStream = await writeExec.start({ hijack: true });
    await new Promise((resolve) => writeStream.on('end', resolve));

    // Execute the code
    const execCommand = getExecutionCommand(language, fileName);
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
    const timeoutPromise = new Promise<never>((_, reject) => {
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
        Cmd: ['sh', '-c', `cd /app && rm -f ${fileName} *.class ${fileName.replace('.cpp', '')}`],
        AttachStdout: false,
        AttachStderr: false,
      });
      const cleanStream = await cleanupExec.start({});
      cleanStream.resume(); // Drain stream
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

    // Create directories if needed
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
      const mkdirCmd = Array.from(dirs).map(d => `mkdir -p /app/${d}`).join(' && ');
      const mkdirExec = await container.exec({
        Cmd: ['sh', '-c', mkdirCmd],
        AttachStdout: false,
        AttachStderr: false,
      });
      const mkdirStream = await mkdirExec.start({});
      mkdirStream.resume();
      await new Promise(resolve => mkdirStream.on('end', resolve));
    }

    // Write all files to container
    for (const file of files) {
      const writeExec = await container.exec({
        Cmd: ['sh', '-c', `cat > /app/${file.name} << 'EOFFILE'\n${file.content}\nEOFFILE`],
        AttachStdout: true,
        AttachStderr: true,
      });
      const writeStream = await writeExec.start({ hijack: true });
      await new Promise(resolve => writeStream.on('end', resolve));
    }

    // Execute the main file
    const execCommand = getExecutionCommand(language, mainFile);
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
      const fileList = files.map(f => f.name).join(' ');
      const cleanupExec = await container.exec({
        Cmd: ['sh', '-c', `cd /app && rm -rf ${fileList} *.class ${mainFile.replace('.cpp', '')}`],
        AttachStdout: false,
        AttachStderr: false,
      });
      const cleanStream = await cleanupExec.start({});
      cleanStream.resume();
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