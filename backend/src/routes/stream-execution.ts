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

// Start streaming execution
streamExecutionRouter.post('/stream-start', async (req, res) => {
  const { code, language, sessionId } = req.body;

  if (!code || !language || !sessionId) {
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
        AutoRemove: false, // Don't auto-remove so we can get logs even after exit
        NetworkMode: 'none',
        Tmpfs: {
          '/tmp': 'rw,exec,nosuid,size=100m'
        }
      }
    });

    await container.start();

    // Prepare code file and execution command
    let fileName: string;
    let execCommand: string;
    
    if (language === 'python') {
      fileName = '/tmp/code.py';
      execCommand = 'python3 -u /tmp/code.py';
    } else if (language === 'javascript') {
      fileName = '/tmp/code.js';
      execCommand = 'node /tmp/code.js';
    } else if (language === 'cpp') {
      fileName = '/tmp/main.cpp';
      execCommand = 'g++ -std=c++20 /tmp/main.cpp -o /tmp/a.out && /tmp/a.out';
    } else if (language === 'java') {
      const classMatch = code.match(/public\s+class\s+(\w+)/);
      const className = classMatch ? classMatch[1] : 'Main';
      fileName = `/tmp/${className}.java`;
      execCommand = `javac /tmp/${className}.java -d /tmp && java -cp /tmp ${className}`;
    } else {
      await container.remove({ force: true });
      res.status(400).json({ success: false, error: 'Unsupported language' });
      return;
    }

    // Write code to file using base64 encoding to avoid shell escaping issues
    const codeBase64 = Buffer.from(code).toString('base64');
    const writeExec = await container.exec({
      Cmd: ['sh', '-c', `echo '${codeBase64}' | base64 -d > ${fileName}`],
      AttachStdout: true,
      AttachStderr: true
    });
    await writeExec.start({});

    // Execute the code without TTY to prevent input echo
    const exec = await container.exec({
      Cmd: ['sh', '-c', execCommand],
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: false // Disable TTY to prevent automatic echo of input
    });

    const stream = await exec.start({ hijack: true, stdin: true });

    activeSessions.set(sessionId, { container, stdin: stream, tempDir: undefined });

    res.json({ success: true, sessionId });
  } catch (error) {
    logger.error('Stream execution failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

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
