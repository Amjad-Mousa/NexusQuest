import { Router, Request, Response } from 'express';
import Docker from 'dockerode';
import { logger } from '../utils/logger.js';

export const streamExecutionRouter = Router();
const docker = new Docker();

const languageImages: Record<string, string> = {
  python: 'nexusquest-python',
  javascript: 'nexusquest-javascript',
  java: 'nexusquest-java',
  cpp: 'nexusquest-cpp',
  go: 'nexusquest-go'
};

// Store active sessions with their streams and temp directories
const activeSessions = new Map<string, { container: Docker.Container; stdin: any; tempDir?: string }>();

// Interface for project files
interface ProjectFile {
  name: string;
  content: string;
}

// Helper to create directory structure commands
function createDirectories(files: ProjectFile[], baseDir: string): string[] {
  const dirs = new Set<string>();
  files.forEach(f => {
    const parts = f.name.split('/');
    if (parts.length > 1) {
      for (let i = 1; i < parts.length; i++) {
        dirs.add(parts.slice(0, i).join('/'));
      }
    }
  });
  return Array.from(dirs).map(d => `mkdir -p ${baseDir}/${d}`);
}

// Start streaming execution
streamExecutionRouter.post('/stream-start', async (req, res) => {
  const { code, language, sessionId, files, mainFile } = req.body;

  // Support both single file (code) and multi-file (files array) modes
  if ((!code && !files) || !language || !sessionId) {
    res.status(400).json({ success: false, error: 'Missing required fields' });
    return;
  }

  try {
    const containerName = `nexusquest-stream-${sessionId}`;

    // Create container with interactive shell that stays alive
    const command = ['sh', '-c', 'while true; do sleep 1; done'];

    const container = await docker.createContainer({
      Image: languageImages[language],
      name: containerName,
      Cmd: command,
      Tty: true, // Enable pseudo-TTY for interactive I/O
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
          '/tmp': 'rw,exec,nosuid,size=100m'
        }
      }
    });

    await container.start();

    // Base directory for project files
    const baseDir = '/tmp/project';

    // Determine if this is a multi-file project
    const isMultiFile = files && Array.isArray(files) && files.length > 0;
    const projectFiles: ProjectFile[] = isMultiFile
      ? files
      : [{ name: getDefaultFileName(language, code), content: code }];

    // The file to run (either specified mainFile or the single file)
    const fileToRun = isMultiFile ? (mainFile || projectFiles[0].name) : projectFiles[0].name;

    // Create base directory
    const mkdirExec = await container.exec({
      Cmd: ['sh', '-c', `mkdir -p ${baseDir}`],
      AttachStdout: true,
      AttachStderr: true
    });
    await mkdirExec.start({});

    // Create subdirectories if needed
    const dirCommands = createDirectories(projectFiles, baseDir);
    for (const dirCmd of dirCommands) {
      const dirExec = await container.exec({
        Cmd: ['sh', '-c', dirCmd],
        AttachStdout: true,
        AttachStderr: true
      });
      await dirExec.start({});
    }

    // Write all files
    for (const file of projectFiles) {
      const fileBase64 = Buffer.from(file.content).toString('base64');
      const filePath = `${baseDir}/${file.name}`;
      const writeExec = await container.exec({
        Cmd: ['sh', '-c', `echo '${fileBase64}' | base64 -d > ${filePath}`],
        AttachStdout: true,
        AttachStderr: true
      });
      await writeExec.start({});
    }

    // Prepare execution command based on language
    let execCommand: string;

    if (language === 'python') {
      // Set PYTHONPATH so imports work from project root
      execCommand = `cd ${baseDir} && PYTHONPATH=${baseDir} python3 -u ${fileToRun}`;
    } else if (language === 'javascript') {
      // Node.js can require relative paths from the working directory
      execCommand = `cd ${baseDir} && node ${fileToRun}`;
    } else if (language === 'cpp') {
      // Compile all .cpp files together
      const cppFiles = projectFiles.filter(f => f.name.endsWith('.cpp')).map(f => f.name).join(' ');
      execCommand = `cd ${baseDir} && g++ -std=c++20 -I${baseDir} ${cppFiles} -o a.out && ./a.out`;
    } else if (language === 'java') {
      // Find the main class from the main file
      const mainFileContent = projectFiles.find(f => f.name === fileToRun)?.content || code;
      const classMatch = mainFileContent.match(/public\s+class\s+(\w+)/);
      const className = classMatch ? classMatch[1] : 'Main';
      const javaFiles = projectFiles.filter(f => f.name.endsWith('.java')).map(f => f.name).join(' ');
      execCommand = `cd ${baseDir} && javac ${javaFiles} -d . && java -cp . ${className}`;
    } else {
      await container.remove({ force: true });
      res.status(400).json({ success: false, error: 'Unsupported language' });
      return;
    }

    // Execute the code without TTY to prevent input echo
    const exec = await container.exec({
      Cmd: ['sh', '-c', execCommand],
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: false
    });

    const stream = await exec.start({ hijack: true, stdin: true });

    activeSessions.set(sessionId, { container, stdin: stream, tempDir: baseDir });

    res.json({ success: true, sessionId });
  } catch (error) {
    logger.error('Stream execution failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper to get default file name based on language
function getDefaultFileName(language: string, code: string): string {
  if (language === 'python') return 'main.py';
  if (language === 'javascript') return 'main.js';
  if (language === 'cpp') return 'main.cpp';
  if (language === 'java') {
    const classMatch = code.match(/public\s+class\s+(\w+)/);
    return classMatch ? `${classMatch[1]}.java` : 'Main.java';
  }
  return 'code.txt';
}

// Get output stream (SSE)
streamExecutionRouter.get('/stream-output/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = activeSessions.get(sessionId);

  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Buffer for incomplete frames
  let buffer = Buffer.alloc(0);

  const processOutput = (chunk: Buffer) => {
    // Append new chunk to buffer
    buffer = Buffer.concat([buffer, chunk]);

    // Process complete frames from buffer
    while (buffer.length >= 8) {
      const streamType = buffer.readUInt8(0);
      const payloadSize = buffer.readUInt32BE(4);

      // Check if we have complete frame
      if (buffer.length < 8 + payloadSize) {
        break; // Wait for more data
      }

      // Extract and send payload
      if (streamType === 1 || streamType === 2) {
        const payload = buffer.toString('utf8', 8, 8 + payloadSize);
        // Only send non-empty payloads
        if (payload.length > 0) {
          res.write(`data: ${JSON.stringify({ type: streamType === 1 ? 'stdout' : 'stderr', data: payload })}\n\n`);
        }
      }

      // Remove processed frame from buffer
      buffer = buffer.slice(8 + payloadSize);
    }
  };

  session.stdin.on('data', processOutput);

  session.stdin.on('end', async () => {
    res.write(`data: ${JSON.stringify({ type: 'end', data: '' })}\n\n`);
    res.end();

    // Cleanup container
    try {
      await session.container.remove({ force: true });
    } catch (err) {
      logger.error('Failed to remove container:', err);
    }

    activeSessions.delete(sessionId);
  });

  req.on('close', () => {
    session.stdin.removeListener('data', processOutput);
  });
});

// Send input to stream
streamExecutionRouter.post('/stream-input', async (req, res) => {
  const { sessionId, input } = req.body;

  if (!sessionId) {
    res.status(400).json({ success: false, error: 'Missing sessionId' });
    return;
  }

  const session = activeSessions.get(sessionId);
  if (!session) {
    res.status(404).json({ success: false, error: 'Session not found' });
    return;
  }

  try {
    session.stdin.write(input + '\n');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send input'
    });
  }
});

// Stop stream
streamExecutionRouter.post('/stream-stop', async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    res.status(400).json({ success: false, error: 'Missing sessionId' });
    return;
  }

  const session = activeSessions.get(sessionId);
  if (session) {
    try {
      await session.container.stop();
      await session.container.remove({ force: true });
      activeSessions.delete(sessionId);
    } catch (err) {
      logger.error('Failed to stop/remove container:', err);
    }
  }

  res.json({ success: true });
});
