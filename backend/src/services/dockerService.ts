import Docker from 'dockerode';
import { logger } from '../utils/logger.js';
import { demuxStream } from '../utils/dockerStream.js';
import path from 'path';
import fs from 'fs';

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

export interface CustomLibrary {
  fileName: string;
  originalName: string;
  fileType: string;
}

export interface ProjectExecutionRequest {
  files: ProjectFile[];
  mainFile: string;
  language: string;
  input?: string;
  dependencies?: Record<string, string>;
  customLibraries?: CustomLibrary[];
  projectId?: string;
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

// Uses shared demux helper from utils/dockerStream.ts

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
      return `cd ${dir} && javac ${baseName} && java -cp . ${className}`;
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

    // Write code to file using base64 to preserve all characters and newlines
    logger.info(`[executeCode] Writing code to file: ${fileName}`);
    const base64Code = Buffer.from(code).toString('base64');
    const writeExec = await container.exec({
      Cmd: ['sh', '-c', `echo "${base64Code}" | base64 -d > ${tempDir}/${fileName}`],
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

// Helper to compute hash of dependencies for caching
function computeDependencyHash(dependencies: Record<string, string>, customLibs?: CustomLibrary[]): string {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256');
  // Use stable key ordering so the same deps map yields the same hash
  const sortedDeps = Object.keys(dependencies || {}).sort().reduce((acc: Record<string, string>, k) => {
    acc[k] = dependencies[k];
    return acc;
  }, {} as Record<string, string>);
  hash.update(JSON.stringify(sortedDeps));
  if (customLibs && customLibs.length > 0) {
    hash.update(JSON.stringify(customLibs.map(l => l.fileName).sort()));
  }
  return hash.digest('hex');
}

// Helper to check if dependencies are already installed
async function checkDependenciesInstalled(
  container: Docker.Container,
  projectId: string,
  language: string,
  dependencyHash: string
): Promise<boolean> {
  try {
    const depDir = `/dependencies/${projectId}`;
    const hashFile = `${depDir}/.dep_hash`;

    const checkExec = await container.exec({
      Cmd: ['sh', '-c', `test -f ${hashFile} && cat ${hashFile}`],
      AttachStdout: true,
      AttachStderr: true,
    });

    const checkStream = await checkExec.start({ hijack: true });
    const { stdout } = await demuxStream(checkStream);

    return stdout.trim() === dependencyHash;
  } catch (error) {
    logger.info('[checkDependencies] Dependencies not cached yet');
    return false;
  }
}

// Helper to mark dependencies as installed
async function markDependenciesInstalled(
  container: Docker.Container,
  projectId: string,
  dependencyHash: string
): Promise<void> {
  try {
    const depDir = `/dependencies/${projectId}`;
    const hashFile = `${depDir}/.dep_hash`;

    const markExec = await container.exec({
      Cmd: ['sh', '-c', `mkdir -p ${depDir} && echo "${dependencyHash}" > ${hashFile}`],
      AttachStdout: false,
      AttachStderr: false,
    });

    const markStream = await markExec.start({});
    await new Promise((resolve) => {
      markStream.on('end', resolve);
      markStream.on('error', resolve);
    });

    logger.info('[markDependencies] Dependencies marked as installed');
  } catch (error) {
    logger.error('[markDependencies] Error marking dependencies:', error);
  }
}

// Helper to install dependencies for JavaScript projects
async function installJavaScriptDependencies(
  container: any,
  baseDir: string,
  dependencies?: Record<string, string>,
  cacheDir?: string
): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    logger.info('[npm install] Installing JavaScript dependencies');
    logger.info('[npm install] Running npm install in ' + baseDir);
    const installExec = await container.exec({
      Cmd: ['sh', '-c', `cd ${baseDir} && npm install --legacy-peer-deps 2>&1`],
      AttachStdout: true,
      AttachStderr: true,
    });

    const installStream = await installExec.start({ hijack: true });
    const { stdout, stderr } = await demuxStream(installStream);

    if (stderr && !stderr.includes('npm WARN')) {
      logger.error('[npm install] npm install failed:', stderr);
      return {
        success: false,
        output: stdout,
        error: `npm install failed: ${stderr}`,
      };
    }

    logger.info('[npm install] Dependencies installed successfully');
    return {
      success: true,
      output: stdout,
      error: stderr,
    };
  } catch (error: any) {
    logger.error('[npm install] Error installing dependencies:', error);
    return {
      success: false,
      output: '',
      error: error.message || 'Failed to install dependencies',
    };
  }
}

// Helper to resolve library file on disk from multiple possible locations
const resolveLibraryOnDisk = (projectId: string, lib: CustomLibrary): string | null => {
  const candidates = [
    // Try with exact fileName first
    path.join(process.cwd(), 'uploads', 'libraries', projectId, lib.fileName),
    // Try with originalName (might be more descriptive)
    path.join(process.cwd(), 'uploads', 'libraries', projectId, lib.originalName || lib.fileName),
    // Try from __dirname context (for different working directories)
    path.resolve(__dirname, '..', '..', 'uploads', 'libraries', projectId, lib.fileName),
    path.resolve(__dirname, '..', '..', 'uploads', 'libraries', projectId, lib.originalName || lib.fileName),
    // Fallback: try appending extensions in case they're missing
    path.join(process.cwd(), 'uploads', 'libraries', projectId, `${lib.fileName}.gz`),
    path.join(process.cwd(), 'uploads', 'libraries', projectId, `${lib.fileName}.tar.gz`),
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        logger.info(`[resolveLibraryOnDisk] Found library at: ${candidate}`);
        return candidate;
      }
    } catch (err) {
      logger.debug(`[resolveLibraryOnDisk] fs.existsSync check failed for ${candidate}:`, err);
    }
  }

  logger.error(`[resolveLibraryOnDisk] Library not found for project ${projectId}. Tried ${candidates.length} candidates. fileName="${lib.fileName}", originalName="${lib.originalName}"`);
  logger.debug(`[resolveLibraryOnDisk] Candidates: ${JSON.stringify(candidates)}`);
  return null;
};

// Helper to install dependencies for Python projects
async function installPythonDependencies(
  container: Docker.Container,
  baseDir: string,
  dependencies?: Record<string, string>
): Promise<{ success: boolean; output: string; error: string }> {
  try {
    if (!dependencies || Object.keys(dependencies).length === 0) {
      logger.info('[pip install] No dependencies specified');
      return { success: true, output: 'No dependencies to install', error: '' };
    }

    // Create requirements.txt with dependencies
    const requirementsContent = Object.entries(dependencies)
      .map(([pkg, version]) => (version === '*' ? pkg : `${pkg}==${version}`))
      .join('\n');

    const base64Requirements = Buffer.from(requirementsContent).toString('base64');

    logger.info('[pip install] Creating requirements.txt with dependencies');
    const writeExec = await container.exec({
      Cmd: ['sh', '-c', `echo "${base64Requirements}" | base64 -d > ${baseDir}/requirements.txt`],
      AttachStdout: true,
      AttachStderr: true,
    });

    const writeStream = await writeExec.start({ hijack: true });
    await new Promise((resolve) => {
      writeStream.on('end', resolve);
      writeStream.on('error', (err: any) => {
        logger.error('[pip install] write error:', err);
        resolve(null);
      });
    });

    // Run pip install
    logger.info('[pip install] Running pip install in ' + baseDir);
    const installExec = await container.exec({
      Cmd: ['sh', '-c', `cd ${baseDir} && pip install -r requirements.txt 2>&1`],
      AttachStdout: true,
      AttachStderr: true,
    });

    const installStream = await installExec.start({ hijack: true });
    const { stdout, stderr } = await demuxStream(installStream);

    logger.info('[pip install] Dependencies installed successfully');
    return {
      success: true,
      output: stdout,
      error: stderr,
    };
  } catch (error: any) {
    logger.error('[pip install] Error installing dependencies:', error);
    return {
      success: false,
      output: '',
      error: error.message || 'Failed to install dependencies',
    };
  }
}

// Execute multi-file project using PERSISTENT containers
// Execute multi-file project using PERSISTENT containers
export async function executeProject(request: ProjectExecutionRequest): Promise<ExecutionResult> {
    const startTime = Date.now();
    const { files, mainFile, language, input, dependencies, customLibraries, projectId } = request;
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

        // Check if container is running, start if needed
        const info = await container.inspect();
        if (!info.State.Running) {
            logger.info(`Starting container: ${containerName}`);
            await container.start();
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Use a unique temp directory
        const baseDir = `/tmp/nexusquest-project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Check if we should use cached dependencies
        let useCachedDeps = false;
        let depDir = '';
        if (projectId && (dependencies || customLibraries)) {
            const depHash = computeDependencyHash(dependencies || {}, customLibraries);
            depDir = `/dependencies/${projectId}`;
            useCachedDeps = await checkDependenciesInstalled(container, projectId, language, depHash);

            if (useCachedDeps) {
                logger.info(`[executeProject] Using cached dependencies for project ${projectId}`);
            } else {
                logger.info(`[executeProject] Dependencies changed or not cached, will install for project ${projectId}`);
            }
        }

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
            const subdirExec = await container.exec({
                Cmd: ['sh', '-c', mkdirCmd],
                AttachStdout: false,
                AttachStderr: false,
            });
            const subdirStream = await subdirExec.start({});
            await new Promise((resolve) => {
                subdirStream.on('end', resolve);
                subdirStream.on('error', resolve);
            });
        }

        // Write all files to container using base64 to preserve newlines
        for (const file of files) {
            const base64Content = Buffer.from(file.content).toString('base64');
            const writeExec = await container.exec({
                Cmd: ['sh', '-c', `echo "${base64Content}" | base64 -d > ${baseDir}/${file.name}`],
                AttachStdout: true,
                AttachStderr: true,
            });
            const writeStream = await writeExec.start({ hijack: true });
            await new Promise((resolve) => {
                writeStream.on('end', resolve);
                writeStream.on('error', (err: any) => {
                    logger.error(`[executeProject] Error writing file ${file.name}:`, err);
                    resolve(null);
                });
            });

            // Add a small delay to ensure file is written
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Copy custom libraries if specified (BEFORE installing dependencies)
        if (customLibraries && customLibraries.length > 0 && projectId) {
            logger.info(`[executeProject] Copying ${customLibraries.length} custom libraries for project ${projectId}`);

            const customLibDir = `${baseDir}/node_modules`;

            // Create node_modules directory for custom libs
            const mkLibDirExec = await container.exec({
                Cmd: ['sh', '-c', `mkdir -p ${customLibDir}`],
                AttachStdout: false,
                AttachStderr: false,
            });
            const mkLibDirStream = await mkLibDirExec.start({});
            await new Promise((resolve) => {
                mkLibDirStream.on('end', resolve);
                mkLibDirStream.on('error', resolve);
            });

            // Copy each custom library
            for (const lib of customLibraries) {
                try {
                    const diskPath = resolveLibraryOnDisk(projectId, lib);
                    if (!diskPath) {
                        logger.warn(`[executeProject] Skipping missing library: ${lib.fileName}`);
                        continue;
                    }

                    const libContent = fs.readFileSync(diskPath);
                    const base64LibContent = libContent.toString('base64');

                    // Use originalName when possible so extraction commands match the file extension
                    const targetName = lib.originalName || lib.fileName;
                    const targetPathInContainer = `${customLibDir}/${targetName}`;

                    logger.info(`[executeProject] Copying library to container: ${targetPathInContainer}`);

                    const copyLibExec = await container.exec({
                        Cmd: ['sh', '-c', `echo "${base64LibContent}" | base64 -d > ${targetPathInContainer}`],
                        AttachStdout: true,
                        AttachStderr: true,
                    });
                    const copyLibStream = await copyLibExec.start({ hijack: true });
                    await new Promise((resolve) => {
                        copyLibStream.on('end', resolve);
                        copyLibStream.on('error', (err: any) => {
                            logger.error(`[executeProject] Error copying library ${targetName}:`, err);
                            resolve(null);
                        });
                    });

                    logger.info(`[executeProject] Successfully copied library: ${targetName}`);

                    // Detect compressed archives robustly (tar.gz, .tgz, .zip, .gz)
                    const lower = targetName.toLowerCase();
                    const isTarGz = /\.tar\.gz$/.test(lower) || /\.tgz$/.test(lower) || /\.gz$/.test(lower);
                    const isZip = /\.zip$/.test(lower);
                    const isCompressed = isTarGz || isZip;

                    if (isCompressed) {
                        logger.info(`[executeProject] Extracting compressed library: ${targetName}`);

                        let extractCmd = '';
                        if (isTarGz) {
                            // tar -xzf works for .tar.gz and many .gz tarballs
                            extractCmd = `cd ${customLibDir} && tar -xzf ${targetName} && rm -f ${targetName}`;
                        } else if (isZip) {
                            extractCmd = `cd ${customLibDir} && unzip -q ${targetName} && rm -f ${targetName}`;
                        }

                        if (extractCmd) {
                            const extractExec = await container.exec({
                                Cmd: ['sh', '-c', extractCmd],
                                AttachStdout: true,
                                AttachStderr: true,
                            });
                            const extractStream = await extractExec.start({ hijack: true });
                            await new Promise((resolve) => {
                                extractStream.on('end', resolve);
                                extractStream.on('error', (err: any) => {
                                    logger.error(`[executeProject] Error extracting library ${targetName}:`, err);
                                    resolve(null);
                                });
                            });

                            logger.info(`[executeProject] Successfully extracted library: ${targetName}`);
                        } else {
                            logger.warn(`[executeProject] No extraction command for: ${targetName}`);
                        }
                    }
                } catch (error: any) {
                    logger.error(`[executeProject] Error processing library ${lib.fileName}:`, error);
                }
            }
        }

        // Install dependencies if specified (AFTER copying custom libraries)
        if (dependencies && Object.keys(dependencies).length > 0) {
            logger.info(`[executeProject] Installing dependencies for ${language}`);

            if (language.toLowerCase() === 'javascript') {
                const depResult = await installJavaScriptDependencies(container, baseDir, dependencies);
                if (!depResult.success) {
                    logger.error('[executeProject] Dependency installation failed:', depResult.error);
                    return {
                        output: depResult.output,
                        error: `Dependency installation failed: ${depResult.error}`,
                        executionTime: Date.now() - startTime,
                    };
                }
            } else if (language.toLowerCase() === 'python') {
                const depResult = await installPythonDependencies(container, baseDir, dependencies);
                if (!depResult.success) {
                    logger.error('[executeProject] Dependency installation failed:', depResult.error);
                    return {
                        output: depResult.output,
                        error: `Dependency installation failed: ${depResult.error}`,
                        executionTime: Date.now() - startTime,
                    };
                }
            }
        }

        // Execute the main file (AFTER all setup is complete)
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
                logger.error('[executeProject] TIMEOUT - destroying stream');
                stream.destroy();
                reject(new Error('Execution timeout (10 seconds)'));
            }, 10000);
        });

        // Get output
        const outputPromise = demuxStream(stream);
        const { stdout, stderr } = await Promise.race([outputPromise, timeoutPromise]);

        // Cleanup
        try {
            const cleanupExec = await container.exec({
                Cmd: ['sh', '-c', `rm -rf ${baseDir}`],
                AttachStdout: false,
                AttachStderr: false,
            });
            const cleanStream = await cleanupExec.start({});
            cleanStream.resume();
        } catch (cleanupErr) {
            logger.warn('[executeProject] Cleanup warning:', cleanupErr);
        }

        const executionTime = Date.now() - startTime;
        return {
            output: stdout.trim() || 'Project executed successfully (no output)',
            error: stderr.trim(),
            executionTime,
        };
    } catch (error: any) {
        logger.error('[executeProject] Project execution error:', error);

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

// Instantiate the Docker client
const docker = new Docker();

