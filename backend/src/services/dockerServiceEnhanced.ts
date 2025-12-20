import Docker from 'dockerode';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

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

const persistentContainers: Record<string, string> = {
    'python': 'nexusquest-python',
    'javascript': 'nexusquest-javascript',
    'java': 'nexusquest-java',
    'cpp': 'nexusquest-cpp',
    'c++': 'nexusquest-cpp'
};

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

function computeDependencyHash(dependencies: Record<string, string>, customLibs?: CustomLibrary[]): string {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(dependencies));
    if (customLibs && customLibs.length > 0) {
        hash.update(JSON.stringify(customLibs.map(l => l.fileName)));
    }
    return hash.digest('hex');
}

async function checkDependenciesInstalled(
    container: Docker.Container,
    projectId: string,
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

async function installJavaScriptDependencies(
    container: Docker.Container,
    projectId: string,
    dependencies: Record<string, string>
): Promise<{ success: boolean; output: string; error: string }> {
    try {
        const depDir = `/dependencies/${projectId}`;

        await container.exec({
            Cmd: ['sh', '-c', `mkdir -p ${depDir}`],
            AttachStdout: false,
            AttachStderr: false,
        }).then(exec => exec.start({}));

        const packageJson = {
            name: 'nexusquest-project',
            version: '1.0.0',
            dependencies,
        };

        const packageJsonContent = JSON.stringify(packageJson, null, 2);
        const base64PackageJson = Buffer.from(packageJsonContent).toString('base64');

        const writeExec = await container.exec({
            Cmd: ['sh', '-c', `echo "${base64PackageJson}" | base64 -d > ${depDir}/package.json`],
            AttachStdout: true,
            AttachStderr: true,
        });

        const writeStream = await writeExec.start({ hijack: true });
        await new Promise((resolve) => {
            writeStream.on('end', resolve);
            writeStream.on('error', resolve);
        });

        logger.info(`[npm install] Running npm install in ${depDir}`);
        const installExec = await container.exec({
            Cmd: ['sh', '-c', `cd ${depDir} && npm install --legacy-peer-deps 2>&1`],
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

async function installPythonDependencies(
    container: Docker.Container,
    projectId: string,
    dependencies: Record<string, string>
): Promise<{ success: boolean; output: string; error: string }> {
    try {
        const depDir = `/dependencies/${projectId}`;

        await container.exec({
            Cmd: ['sh', '-c', `mkdir -p ${depDir}`],
            AttachStdout: false,
            AttachStderr: false,
        }).then(exec => exec.start({}));

        const requirementsContent = Object.entries(dependencies)
            .map(([pkg, version]) => (version === '*' ? pkg : `${pkg}==${version}`))
            .join('\n');

        const base64Requirements = Buffer.from(requirementsContent).toString('base64');

        const writeExec = await container.exec({
            Cmd: ['sh', '-c', `echo "${base64Requirements}" | base64 -d > ${depDir}/requirements.txt`],
            AttachStdout: true,
            AttachStderr: true,
        });

        const writeStream = await writeExec.start({ hijack: true });
        await new Promise((resolve) => {
            writeStream.on('end', resolve);
            writeStream.on('error', resolve);
        });

        logger.info(`[pip install] Running pip install in ${depDir}`);
        const installExec = await container.exec({
            Cmd: ['sh', '-c', `cd ${depDir} && pip install --target ${depDir}/site-packages -r requirements.txt 2>&1`],
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

async function copyCustomLibraries(
    container: Docker.Container,
    projectId: string,
    customLibraries: CustomLibrary[]
): Promise<void> {
    const customLibDir = `/custom-libs/${projectId}`;

    await container.exec({
        Cmd: ['sh', '-c', `mkdir -p ${customLibDir}`],
        AttachStdout: false,
        AttachStderr: false,
    }).then(exec => exec.start({}));

    logger.info(`[customLibs] Custom libraries directory created: ${customLibDir}`);
}

function getExecutionCommand(language: string, mainFile: string, projectId?: string): string {
    const depDir = projectId ? `/dependencies/${projectId}` : '';
    const customLibDir = projectId ? `/custom-libs/${projectId}` : '';

    switch (language.toLowerCase()) {
        case 'python':
            if (projectId && depDir) {
                return `PYTHONPATH=${depDir}/site-packages:$PYTHONPATH python3 -u ${mainFile}`;
            }
            return `python3 -u ${mainFile}`;

        case 'javascript':
            if (projectId && depDir) {
                return `NODE_PATH=${depDir}/node_modules:$NODE_PATH node ${mainFile}`;
            }
            return `node ${mainFile}`;

        case 'java': {
            const baseName = mainFile.substring(mainFile.lastIndexOf('/') + 1);
            const className = baseName.replace('.java', '');
            const dir = mainFile.substring(0, mainFile.lastIndexOf('/'));
            const classpath = projectId ? `-cp .:${customLibDir}/*` : '-cp .';
            return `cd ${dir} && javac ${baseName} && java ${classpath} ${className}`;
        }

        case 'cpp':
        case 'c++': {
            const baseName = mainFile.substring(mainFile.lastIndexOf('/') + 1);
            const outputName = baseName.replace('.cpp', '');
            const dir = mainFile.substring(0, mainFile.lastIndexOf('/'));
            const libPath = projectId ? `-L${customLibDir}` : '';
            return `cd ${dir} && g++ -std=c++20 ${libPath} -o ${outputName} ${baseName} && ./${outputName}`;
        }

        default:
            throw new Error(`Unsupported language: ${language}`);
    }
}

export async function executeProjectWithCache(request: ProjectExecutionRequest): Promise<ExecutionResult> {
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

        const info = await container.inspect();
        if (!info.State.Running) {
            logger.info(`Starting container: ${containerName}`);
            await container.start();
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const baseDir = `/tmp/nexusquest-project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        let needsInstall = false;
        if (projectId && (dependencies || customLibraries)) {
            const depHash = computeDependencyHash(dependencies || {}, customLibraries);
            const cached = await checkDependenciesInstalled(container, projectId, depHash);

            if (cached) {
                logger.info(`[executeProject] Using cached dependencies for project ${projectId}`);
            } else {
                logger.info(`[executeProject] Installing dependencies for project ${projectId}`);
                needsInstall = true;

                if (dependencies && Object.keys(dependencies).length > 0) {
                    if (language.toLowerCase() === 'javascript') {
                        const result = await installJavaScriptDependencies(container, projectId, dependencies);
                        if (!result.success) {
                            return {
                                output: result.output,
                                error: `Dependency installation failed: ${result.error}`,
                                executionTime: Date.now() - startTime,
                            };
                        }
                    } else if (language.toLowerCase() === 'python') {
                        const result = await installPythonDependencies(container, projectId, dependencies);
                        if (!result.success) {
                            return {
                                output: result.output,
                                error: `Dependency installation failed: ${result.error}`,
                                executionTime: Date.now() - startTime,
                            };
                        }
                    }
                }

                if (customLibraries && customLibraries.length > 0) {
                    await copyCustomLibraries(container, projectId, customLibraries);
                }

                await markDependenciesInstalled(container, projectId, depHash);
            }
        }

        await container.exec({
            Cmd: ['sh', '-c', `mkdir -p ${baseDir}`],
            AttachStdout: false,
            AttachStderr: false,
        }).then(exec => exec.start({}));

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
            await container.exec({
                Cmd: ['sh', '-c', mkdirCmd],
                AttachStdout: false,
                AttachStderr: false,
            }).then(exec => exec.start({}));
        }

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
                writeStream.on('error', resolve);
            });
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        const execCommand = getExecutionCommand(language, `${baseDir}/${mainFile}`, projectId);
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

        if (input) {
            stream.write(input);
            stream.write('\n');
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        stream.end();

        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
                stream.destroy();
                reject(new Error('Execution timeout (15 seconds)'));
            }, 15000);
        });

        const outputPromise = demuxStream(stream);
        const { stdout, stderr } = await Promise.race([outputPromise, timeoutPromise]);

        try {
            await container.exec({
                Cmd: ['sh', '-c', `rm -rf ${baseDir}`],
                AttachStdout: false,
                AttachStderr: false,
            }).then(exec => exec.start({}));
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
