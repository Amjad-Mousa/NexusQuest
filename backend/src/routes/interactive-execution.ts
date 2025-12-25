import { Router } from 'express';
import Docker from 'dockerode';
import { logger } from '../utils/logger.js';

const router = Router();
const docker = new Docker();

const languageImages: Record<string, string> = {
  'python': 'nexusquest-python:latest',
  'javascript': 'nexusquest-javascript:latest',
  'java': 'nexusquest-java:latest',
  'cpp': 'nexusquest-cpp:latest',
  'go': 'nexusquest-go:latest',
};

// Store active container sessions
const activeSessions = new Map<string, { container: Docker.Container; stream: any }>();

// Execute code interactively with terminal streaming
router.post('/execute-interactive', async (req, res) => {
  try {
    const { code, language, sessionId } = req.body;

    if (!code || !language) {
      return res.status(400).json({ error: 'Code and language are required' });
    }

    const imageName = languageImages[language.toLowerCase()];
    if (!imageName) {
      return res.status(400).json({ error: 'Unsupported language' });
    }

    logger.info(`Starting interactive execution for ${language}`);

    // Create code file content
    let fileName: string;
    let fileContent: string;
    let cmd: string[];

    switch (language.toLowerCase()) {
      case 'python':
        fileName = 'main.py';
        fileContent = code;
        cmd = ['python3', '-u', '/tmp/main.py']; // -u for unbuffered output
        break;
      case 'javascript':
        fileName = 'main.js';
        fileContent = code;
        cmd = ['node', '/tmp/main.js'];
        break;
      case 'java':
        fileName = 'Main.java';
        fileContent = code;
        cmd = ['sh', '-c', 'cd /tmp && javac Main.java && java Main'];
        break;
      case 'cpp':
        fileName = 'main.cpp';
        fileContent = code;
        cmd = ['sh', '-c', 'cd /tmp && g++ -o main main.cpp && ./main'];
        break;
      case 'go':
        fileName = 'main.go';
        fileContent = code;
        cmd = ['sh', '-c', 'cd /tmp && go run main.go'];
        break;
      default:
        return res.status(400).json({ error: 'Unsupported language' });
    }

    // Create container with TTY for interactive input
    const container = await docker.createContainer({
      Image: imageName,
      Cmd: cmd,
      Tty: true,
      OpenStdin: true,
      StdinOnce: false,
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      HostConfig: {
        AutoRemove: true,
        Memory: 256 * 1024 * 1024,
        MemorySwap: 256 * 1024 * 1024,
        CpuPeriod: 100000,
        CpuQuota: 50000,
        NetworkMode: 'none',
        Tmpfs: {
          '/tmp': 'rw,exec,nosuid,size=200m'
        },
      },
    });

    // Write code file to container
    await container.putArchive(
      Buffer.from(
        require('tar-stream')
          .pack()
          .entry({ name: fileName }, fileContent)
          .finalize()
      ),
      { path: '/tmp' }
    );

    // Start container
    await container.start();

    // Attach to container
    const stream = await container.attach({
      stream: true,
      stdin: true,
      stdout: true,
      stderr: true,
    });

    // Store session
    activeSessions.set(sessionId || container.id, { container, stream });

    res.json({
      success: true,
      sessionId: sessionId || container.id,
      message: 'Execution started. Use WebSocket to interact.',
    });

  } catch (error) {
    logger.error('Interactive execution error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to execute code'
    });
  }
});

// Send input to running container
router.post('/send-input', async (req, res) => {
  try {
    const { sessionId, input } = req.body;

    const session = activeSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Send input to container stdin
    session.stream.write(input + '\n');

    res.json({ success: true });
  } catch (error) {
    logger.error('Send input error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to send input'
    });
  }
});

// Stop execution
router.post('/stop-execution', async (req, res) => {
  try {
    const { sessionId } = req.body;

    const session = activeSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await session.container.stop();
    activeSessions.delete(sessionId);

    res.json({ success: true });
  } catch (error) {
    logger.error('Stop execution error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to stop execution'
    });
  }
});

export default router;
export { activeSessions };
