import express, { Request, Response } from 'express';
import Docker from 'dockerode';
import { logger } from '../utils/logger.js';

const router = express.Router();
const docker = new Docker();

// Store active streams for input handling
const activeStreams = new Map<string, any>();

interface PlaygroundRequest extends Request {
  body: {
    code: string;
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

const getDefaultFileName = (language: string): string => {
  switch (language) {
    case 'python': return 'main.py';
    case 'javascript': return 'index.js';
    case 'java': return 'Main.java';
    case 'cpp': return 'main.cpp';
    default: return 'main.txt';
  }
};

/**
 * POST /api/playground/execute
 * Execute code from playground (simplified, single file only)
 */
router.post('/execute', async (req: PlaygroundRequest, res: Response) => {
  const { code, language, sessionId } = req.body;

  if (!code || !language || !sessionId) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: code, language, sessionId',
    });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const containerName = `nexusquest-playground-${sessionId}`;

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

    // Write code to file
    let fileName: string;
    let filePath: string;
    let className: string | undefined;
    
    // For Java, extract class name and use it as filename
    if (language === 'java') {
      const classMatch = code.match(/public\s+class\s+(\w+)/);
      className = classMatch ? classMatch[1] : 'Main';
      fileName = `${className}.java`;
      filePath = `/tmp/${fileName}`;
      logger.info(`Java class name: ${className}, file: ${fileName}`);
    } else {
      fileName = getDefaultFileName(language);
      filePath = `/tmp/${fileName}`;
    }
    
    // Write code using cat with heredoc to avoid issues with special characters
    const escapedCode = code.replace(/'/g, "'\\''");
    
    const writeExec = await container.exec({
      Cmd: ['sh', '-c', `cat > ${filePath} << 'EOFCODE'\n${escapedCode}\nEOFCODE`],
      AttachStdout: true,
      AttachStderr: true
    });
    await writeExec.start({});

    // Verify file was created (for Java debugging)
    if (language === 'java') {
      const verifyExec = await container.exec({
        Cmd: ['sh', '-c', `ls -la /tmp/${fileName} && head -5 /tmp/${fileName}`],
        AttachStdout: true,
        AttachStderr: true
      });
      const verifyStream = await verifyExec.start({});
      verifyStream.on('data', (chunk: Buffer) => {
        logger.info(`Java file verification: ${chunk.toString()}`);
      });
    }

    // Prepare execution command
    let execCommand: string;

    if (language === 'python') {
      execCommand = `python3 -u ${filePath}`;
    } else if (language === 'javascript') {
      execCommand = `node ${filePath}`;
    } else if (language === 'cpp') {
      execCommand = `g++ -std=c++20 ${filePath} -o /tmp/a.out && /tmp/a.out`;
    } else if (language === 'java') {
      // Use the className from above
      const finalClassName = className || 'Main';
      execCommand = `cd /tmp && javac ${fileName} && java -cp /tmp ${finalClassName}`;
      logger.info(`Java execution command: ${execCommand}`);
    } else {
      await container.remove({ force: true });
      res.write(`data: ${JSON.stringify({ type: 'error', content: 'Unsupported language' })}\n\n`);
      res.end();
      return;
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
        res.write(`data: ${JSON.stringify({ type: 'output', content: output })}\n\n`);
      }
    });

    stream.on('end', async () => {
      res.write(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
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
      res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`);
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
    logger.error('Playground execution failed:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`);
    res.end();
  }
});

/**
 * POST /api/playground/input
 * Send input to running playground container
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

export { router as playgroundExecutionRouter };
