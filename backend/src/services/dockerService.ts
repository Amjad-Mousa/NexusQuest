import Docker from 'dockerode';
import { logger } from '../utils/logger.js';

const docker = new Docker();

interface ExecutionResult {
  output: string;
  error: string;
  executionTime: number;
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

export async function executeCode(code: string, language: string): Promise<ExecutionResult> {
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
  } catch (error) {
    logger.error('Docker execution error:', error);
    
    // Check if it's a Docker connection error
    if (error instanceof Error && (error.message.includes('ENOENT') || error.message.includes('docker_engine'))) {
      return {
        output: '',
        error: '❌ Docker Desktop is not running!\n\nPlease start Docker Desktop and try again.\n\n📝 Steps:\n1. Open Docker Desktop application\n2. Wait for it to fully start (check system tray icon)\n3. Click "Run Code" again',
        executionTime: Date.now() - startTime
      };
    }
    
    return {
      output: '',
      error: error instanceof Error ? error.message : 'Unknown execution error',
      executionTime: Date.now() - startTime
    };
  }
}

async function executePythonCode(code: string): Promise<{ output: string; error: string }> {
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
    const timeoutPromise = new Promise<never>((_, reject) => {
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

    // Convert buffer to string and clean Docker log formatting
    let output = stream.toString('utf8');
    
    // Remove Docker log headers (8 bytes at start of each line)
    output = output.replace(/[\x00-\x08]/g, '');
    
    // Clean up container
    await container.remove({ force: true });

    // Split into lines and filter empty ones
    const lines = output.split('\n').filter((line: string) => line.trim());
    
    // Separate stdout and stderr
    const hasError = lines.some((line: string) => 
      line.includes('Error') || 
      line.includes('Traceback') || 
      line.includes('File "<string>"')
    );

    if (hasError) {
      return {
        output: '',
        error: lines.join('\n')
      };
    }

    return {
      output: lines.join('\n') || 'Code executed successfully (no output)',
      error: ''
    };

  } catch (error) {
    // Clean up container if it exists
    try {
      const container = docker.getContainer(containerName);
      await container.remove({ force: true });
    } catch {
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