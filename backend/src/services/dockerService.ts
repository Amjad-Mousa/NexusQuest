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

// Map languages to their Docker images
const languageImages: Record<string, string> = {
  'python': 'nexusquest-python:latest',
  'javascript': 'nexusquest-javascript:latest',
  'java': 'nexusquest-java:latest',
  'cpp': 'nexusquest-cpp:latest',
  'c++': 'nexusquest-cpp:latest',
  'go': 'nexusquest-go:latest'
};

export async function executeCode(code: string, language: string, input?: string): Promise<ExecutionResult> {
  const startTime = Date.now();
  
  try {
    // Ensure Docker is available
    await docker.ping();
    
    let result;
    switch (language.toLowerCase()) {
      case 'python':
        result = await executePythonCode(code, input);
        break;
      case 'java':
        result = await executeJavaCode(code, input);
        break;
      case 'javascript':
      case 'js':
        result = await executeJavaScriptCode(code, input);
        break;
      case 'cpp':
      case 'c++':
        result = await executeCppCode(code, input);
        break;
      case 'go':
      case 'golang':
        result = await executeGoCode(code, input);
        break;
      default:
        throw new Error(`Language ${language} is not supported yet`);
    }
    
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

async function executePythonCode(code: string, input?: string): Promise<{ output: string; error: string }> {
  const containerName = `nexusquest-python-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Wrap code to handle input
    let wrappedCode = code;
    if (input) {
      const inputs = input.split(',').map(i => i.trim());
      wrappedCode = `
import sys
_inputs = ${JSON.stringify(inputs)}
_input_index = 0

def input(prompt=''):
    global _input_index
    if _input_index < len(_inputs):
        value = _inputs[_input_index]
        _input_index += 1
        print(prompt + value)
        return value
    return ''

${code}
`;
    }
    
    // Create and start container
    const container = await docker.createContainer({
      Image: languageImages['python'],
      name: containerName,
      Cmd: ['python', '-c', wrappedCode],
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
    const buffer = Buffer.isBuffer(stream) ? stream : Buffer.from(stream);
    let output = '';
    
    // Docker multiplexes stdout/stderr with 8-byte headers
    // Format: [stream_type, 0, 0, 0, size1, size2, size3, size4, ...data...]
    let offset = 0;
    while (offset < buffer.length) {
      if (buffer.length - offset < 8) break;
      const payloadSize = buffer.readUInt32BE(offset + 4);
      if (payloadSize > 0 && offset + 8 + payloadSize <= buffer.length) {
        output += buffer.toString('utf8', offset + 8, offset + 8 + payloadSize);
      }
      offset += 8 + payloadSize;
    }
    
    // Fallback if header parsing fails
    if (!output && buffer.length > 0) {
      output = buffer.toString('utf8').replace(/[\x00-\x08]/g, '');
    }
    
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

async function executeJavaCode(code: string, input?: string): Promise<{ output: string; error: string }> {
  const containerName = `nexusquest-java-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Extract class name from code
    const classMatch = code.match(/public\s+class\s+(\w+)/);
    const className = classMatch ? classMatch[1] : 'Main';
    
    // If no public class is found, wrap code in a Main class
    let javaCode = code;
    if (!classMatch) {
      javaCode = `
public class Main {
    public static void main(String[] args) {
${code.split('\n').map(line => '        ' + line).join('\n')}
    }
}`;
    }
    
    // Prepare input for stdin
    const inputData = input ? input.split(',').map(i => i.trim()).join('\n') : '';
    
    // Escape single quotes in Java code for shell
    const escapedCode = javaCode.replace(/'/g, "'\\''");
    
    // Build command with heredoc for input
    let cmd: string;
    if (inputData) {
      // Use heredoc to provide input via stdin
      cmd = `cd /tmp && cat << 'JAVACODE' > ${className}.java
${javaCode}
JAVACODE
javac -d . ${className}.java && cat << 'INPUT' | java -cp . ${className}
${inputData}
INPUT`;
    } else {
      cmd = `cd /tmp && echo '${escapedCode}' > ${className}.java && javac -d . ${className}.java && java -cp . ${className}`;
    }
    
    // Create container with Java
    const container = await docker.createContainer({
      Image: languageImages['java'],
      name: containerName,
      Cmd: [
        'sh',
        '-c',
        cmd
      ],
      WorkingDir: '/tmp',
      HostConfig: {
        Memory: 256 * 1024 * 1024, // 256MB memory limit for Java
        CpuQuota: 50000, // 50% CPU limit
        NetworkMode: 'none', // No network access
        ReadonlyRootfs: false, // Java needs write access for compilation
        Tmpfs: {
          '/app': 'rw,exec,nosuid,size=200m',
          '/tmp': 'rw,exec,nosuid,size=100m'
        }
      },
      AttachStdout: true,
      AttachStderr: true,
    });

    await container.start();

    // Set execution timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Execution timeout (15 seconds)')), 15000);
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
    const buffer = Buffer.isBuffer(stream) ? stream : Buffer.from(stream);
    let output = '';
    
    // Docker multiplexes stdout/stderr with 8-byte headers
    // Format: [stream_type, 0, 0, 0, size1, size2, size3, size4, ...data...]
    let offset = 0;
    while (offset < buffer.length) {
      if (buffer.length - offset < 8) break;
      const payloadSize = buffer.readUInt32BE(offset + 4);
      if (payloadSize > 0 && offset + 8 + payloadSize <= buffer.length) {
        output += buffer.toString('utf8', offset + 8, offset + 8 + payloadSize);
      }
      offset += 8 + payloadSize;
    }
    
    // Fallback if header parsing fails
    if (!output && buffer.length > 0) {
      output = buffer.toString('utf8').replace(/[\x00-\x08]/g, '');
    }
    
    // Clean up container
    await container.remove({ force: true });

    // Split into lines and filter empty ones
    const lines = output.split('\n').filter((line: string) => line.trim());
    
    // Check for compilation or runtime errors
    const hasError = lines.some((line: string) => 
      line.includes('error:') || 
      line.includes('Exception') || 
      line.includes('Error')
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
        error: 'Code execution timed out (maximum 15 seconds allowed)'
      };
    }

    return {
      output: '',
      error: error instanceof Error ? error.message : 'Unknown execution error'
    };
  }
}

async function executeJavaScriptCode(code: string, input?: string): Promise<{ output: string; error: string }> {
  const containerName = `nexusquest-js-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Wrap code to handle input
    let wrappedCode = code;
    if (input) {
      const inputs = input.split(',').map(i => i.trim());
      wrappedCode = `
const _inputs = ${JSON.stringify(inputs)};
let _input_index = 0;

function input(prompt = '') {
    if (_input_index < _inputs.length) {
        const value = _inputs[_input_index];
        _input_index++;
        console.log(prompt + value);
        return value;
    }
    return '';
}

${code}
`;
    }
    
    // Create and start container
    const container = await docker.createContainer({
      Image: languageImages['javascript'],
      name: containerName,
      Cmd: ['node', '-e', wrappedCode],
      WorkingDir: '/app',
      HostConfig: {
        Memory: 128 * 1024 * 1024,
        CpuQuota: 50000,
        NetworkMode: 'none',
        ReadonlyRootfs: true,
        Tmpfs: {
          '/tmp': 'noexec,nosuid,size=100m'
        }
      },
      AttachStdout: true,
      AttachStderr: true,
    });

    await container.start();

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Execution timeout (10 seconds)')), 10000);
    });

    const resultPromise = container.wait();
    await Promise.race([resultPromise, timeoutPromise]);

    const stream = await container.logs({
      stdout: true,
      stderr: true,
      timestamps: false
    });

    const buffer = Buffer.isBuffer(stream) ? stream : Buffer.from(stream);
    let output = '';
    
    let offset = 0;
    while (offset < buffer.length) {
      if (buffer.length - offset < 8) break;
      const payloadSize = buffer.readUInt32BE(offset + 4);
      if (payloadSize > 0 && offset + 8 + payloadSize <= buffer.length) {
        output += buffer.toString('utf8', offset + 8, offset + 8 + payloadSize);
      }
      offset += 8 + payloadSize;
    }
    
    if (!output && buffer.length > 0) {
      output = buffer.toString('utf8').replace(/[\x00-\x08]/g, '');
    }
    
    await container.remove({ force: true });

    const lines = output.split('\n').filter((line: string) => line.trim());
    
    const hasError = lines.some((line: string) => 
      line.includes('Error') || 
      line.includes('TypeError') || 
      line.includes('ReferenceError') ||
      line.includes('at ')
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
    try {
      const container = docker.getContainer(containerName);
      await container.remove({ force: true });
    } catch {}

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

async function executeCppCode(code: string, input?: string): Promise<{ output: string; error: string }> {
  const containerName = `nexusquest-cpp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const inputData = input ? input.split(',').map(i => i.trim()).join('\n') : '';
    
    const escapedCode = code.replace(/'/g, "'\\''");
    
    let cmd: string;
    if (inputData) {
      cmd = `cd /tmp && cat << 'CPPCODE' > main.cpp
${code}
CPPCODE
g++ -std=c++20 -O2 main.cpp -o main && cat << 'INPUT' | ./main
${inputData}
INPUT`;
    } else {
      cmd = `cd /tmp && echo '${escapedCode}' > main.cpp && g++ -std=c++20 -O2 main.cpp -o main && ./main`;
    }
    
    const container = await docker.createContainer({
      Image: languageImages['cpp'],
      name: containerName,
      Cmd: ['sh', '-c', cmd],
      WorkingDir: '/tmp',
      HostConfig: {
        Memory: 256 * 1024 * 1024,
        CpuQuota: 50000,
        NetworkMode: 'none',
        ReadonlyRootfs: false,
        Tmpfs: {
          '/app': 'rw,exec,nosuid,size=200m',
          '/tmp': 'rw,exec,nosuid,size=100m'
        }
      },
      AttachStdout: true,
      AttachStderr: true,
    });

    await container.start();

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Execution timeout (15 seconds)')), 15000);
    });

    const resultPromise = container.wait();
    await Promise.race([resultPromise, timeoutPromise]);

    const stream = await container.logs({
      stdout: true,
      stderr: true,
      timestamps: false
    });

    const buffer = Buffer.isBuffer(stream) ? stream : Buffer.from(stream);
    let output = '';
    
    let offset = 0;
    while (offset < buffer.length) {
      if (buffer.length - offset < 8) break;
      const payloadSize = buffer.readUInt32BE(offset + 4);
      if (payloadSize > 0 && offset + 8 + payloadSize <= buffer.length) {
        output += buffer.toString('utf8', offset + 8, offset + 8 + payloadSize);
      }
      offset += 8 + payloadSize;
    }
    
    if (!output && buffer.length > 0) {
      output = buffer.toString('utf8').replace(/[\x00-\x08]/g, '');
    }
    
    await container.remove({ force: true });

    const lines = output.split('\n').filter((line: string) => line.trim());
    
    const hasError = lines.some((line: string) => 
      line.includes('error:') || 
      line.includes('undefined reference') ||
      line.includes('segmentation fault')
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
    try {
      const container = docker.getContainer(containerName);
      await container.remove({ force: true });
    } catch {}

    if (error instanceof Error && error.message.includes('timeout')) {
      return {
        output: '',
        error: 'Code execution timed out (maximum 15 seconds allowed)'
      };
    }

    return {
      output: '',
      error: error instanceof Error ? error.message : 'Unknown execution error'
    };
  }
}

async function executeGoCode(code: string, input?: string): Promise<{ output: string; error: string }> {
  const containerName = `nexusquest-go-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const inputData = input ? input.split(',').map(i => i.trim()).join('\n') : '';
    
    let cmd: string;
    if (inputData) {
      cmd = `cd /tmp && cat << 'GOCODE' > main.go
${code}
GOCODE
cat << 'INPUT' | go run main.go
${inputData}
INPUT`;
    } else {
      const escapedCode = code.replace(/'/g, "'\\''");
      cmd = `cd /tmp && echo '${escapedCode}' > main.go && go run main.go`;
    }
    
    const container = await docker.createContainer({
      Image: languageImages['go'],
      name: containerName,
      Cmd: ['sh', '-c', cmd],
      WorkingDir: '/tmp',
      HostConfig: {
        Memory: 256 * 1024 * 1024,
        CpuQuota: 50000,
        NetworkMode: 'none',
        ReadonlyRootfs: false,
        Tmpfs: {
          '/app': 'rw,exec,nosuid,size=200m',
          '/tmp': 'rw,exec,nosuid,size=100m'
        }
      },
      AttachStdout: true,
      AttachStderr: true,
    });

    await container.start();

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Execution timeout (15 seconds)')), 15000);
    });

    const resultPromise = container.wait();
    await Promise.race([resultPromise, timeoutPromise]);

    const stream = await container.logs({
      stdout: true,
      stderr: true,
      timestamps: false
    });

    const buffer = Buffer.isBuffer(stream) ? stream : Buffer.from(stream);
    let output = '';
    
    let offset = 0;
    while (offset < buffer.length) {
      if (buffer.length - offset < 8) break;
      const payloadSize = buffer.readUInt32BE(offset + 4);
      if (payloadSize > 0 && offset + 8 + payloadSize <= buffer.length) {
        output += buffer.toString('utf8', offset + 8, offset + 8 + payloadSize);
      }
      offset += 8 + payloadSize;
    }
    
    if (!output && buffer.length > 0) {
      output = buffer.toString('utf8').replace(/[\x00-\x08]/g, '');
    }
    
    await container.remove({ force: true });

    const lines = output.split('\n').filter((line: string) => line.trim());
    
    const hasError = lines.some((line: string) => 
      line.includes('error:') || 
      line.includes('panic:') ||
      line.includes('fatal error:')
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
    try {
      const container = docker.getContainer(containerName);
      await container.remove({ force: true });
    } catch {}

    if (error instanceof Error && error.message.includes('timeout')) {
      return {
        output: '',
        error: 'Code execution timed out (maximum 15 seconds allowed)'
      };
    }

    return {
      output: '',
      error: error instanceof Error ? error.message : 'Unknown execution error'
    };
  }
}