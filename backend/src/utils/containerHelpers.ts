import Docker from 'dockerode';
import { logger } from './logger.js';

const docker = new Docker();

export interface ContainerConfig {
    language: string;
    sessionId: string;
    needsNetwork: boolean;
    languageImages: Record<string, string>;
}

/**
 * Remove existing container if it exists
 */
export async function removeExistingContainer(containerName: string): Promise<void> {
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
}

/**
 * Create and start a new container for project execution
 */
export async function createProjectContainer(config: ContainerConfig): Promise<Docker.Container> {
    const { language, sessionId, needsNetwork, languageImages } = config;
    const containerName = `nexusquest-project-${sessionId}`;

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
            Memory: 1024 * 1024 * 1024, // 1GB
            AutoRemove: false,
            NetworkMode: needsNetwork ? 'bridge' : 'none',
            Dns: needsNetwork ? ['8.8.8.8', '8.8.4.4'] : undefined,
            Binds: [
                `${language}-dependencies:/dependencies:rw`,
                `${language}-custom-libs:/custom-libs:rw`
            ],
            Tmpfs: {
                '/tmp': 'rw,exec,nosuid,size=50m'
            }
        }
    });

    await container.start();
    logger.info(`Container started: ${containerName}`);

    return container;
}

/**
 * Ensure the dependency cache volume is writable
 */
export async function ensureDependencyVolumeWritable(container: Docker.Container): Promise<void> {
    try {
        const depsPermsExec = await container.exec({
            User: 'root',
            Cmd: ['sh', '-c', 'mkdir -p /dependencies && chown -R 1001:1001 /dependencies && chmod 0775 /dependencies && ( [ -w /dependencies ] && echo writable || echo not_writable )'],
            AttachStdout: true,
            AttachStderr: true
        });
        const depsPermsStream = await depsPermsExec.start({});
        let permsOutput = '';
        await new Promise((resolve) => {
            depsPermsStream.on('data', (chunk: Buffer) => { permsOutput += chunk.toString(); });
            depsPermsStream.on('end', resolve);
            depsPermsStream.on('error', resolve);
            setTimeout(resolve, 1000);
        });
        if (permsOutput.includes('writable')) {
            logger.info('[project-execution] /dependencies is writable');
        } else {
            logger.warn('[project-execution] /dependencies is NOT writable');
        }
    } catch (e: any) {
        logger.warn(`[project-execution] Failed to set permissions: ${e?.message || e}`);
    }
}

/**
 * Create base directory and subdirectories for project files
 */
export async function createProjectDirectories(
    container: Docker.Container,
    baseDir: string,
    files: Array<{ name: string }>
): Promise<void> {
    // Create base directory
    const mkdirExec = await container.exec({
        Cmd: ['sh', '-c', `mkdir -p ${baseDir}`],
        AttachStdout: true,
        AttachStderr: true
    });
    await mkdirExec.start({});

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

    for (const dir of dirs) {
        const mkdirDirExec = await container.exec({
            Cmd: ['sh', '-c', `mkdir -p ${baseDir}/${dir}`],
            AttachStdout: true,
            AttachStderr: true
        });
        await mkdirDirExec.start({});
    }
}

/**
 * Write all project files to the container
 */
export async function writeFilesToContainer(
    container: Docker.Container,
    baseDir: string,
    files: Array<{ name: string; content: string }>
): Promise<void> {
    for (const file of files) {
        const base64Content = Buffer.from(file.content).toString('base64');
        const writeCmd = `echo "${base64Content}" | base64 -d > ${baseDir}/${file.name}`;
        const writeExec = await container.exec({
            Cmd: ['sh', '-c', writeCmd],
            AttachStdout: true,
            AttachStderr: true
        });
        const writeStream = await writeExec.start({});
        writeStream.resume();
        await new Promise((resolve) => {
            writeStream.on('end', resolve);
            writeStream.on('error', resolve);
            setTimeout(resolve, 1000);
        });
    }
}

/**
 * Cleanup container (stop and remove)
 */
export async function cleanupContainer(container: Docker.Container): Promise<void> {
    try {
        await container.stop();
        await container.remove({ force: true });
    } catch (err: any) {
        if (err.statusCode !== 404) {
            logger.error(`Cleanup error: ${err}`);
        }
    }
}

