import Docker from 'dockerode';
import { logger } from './logger.js';

/**
 * Install JavaScript dependencies using npm with caching
 */
export async function installJavaScriptDependencies(
    container: Docker.Container,
    baseDir: string,
    cacheDir: string
): Promise<void> {
    logger.info('[project-execution] Installing JavaScript dependencies');

    const npmInstallExec = await container.exec({
        Cmd: ['sh', '-c', `
            set -e
            CACHE_DIR="${cacheDir}"
            BASE_DIR="${baseDir}"
            if [ -d "$CACHE_DIR/node_modules" ] && [ -f "$CACHE_DIR/.cache-complete" ]; then
                echo "✓ [dependency-cache] Using cached dependencies"
                cp -r $CACHE_DIR/node_modules $BASE_DIR/ 2>&1 || echo "Cache copy failed"
                if [ -d "$BASE_DIR/node_modules" ]; then
                    echo "npm_install_done"
                    exit 0
                fi
            fi
            echo "⚙ [dependency-cache] Installing dependencies..."
            cd $BASE_DIR
            npm install --legacy-peer-deps > npm-install.log 2>&1
            if [ $? -eq 0 ]; then
                echo "[dependency-cache] Caching dependencies..."
                mkdir -p $CACHE_DIR
                cp -r $BASE_DIR/node_modules $CACHE_DIR/ 2>&1 || echo "Warning: Failed to cache"
                touch $CACHE_DIR/.cache-complete
                echo "✓ [dependency-cache] Dependencies cached"
                echo "npm_install_done"
            else
                echo "npm_install_failed"
                exit 1
            fi
        `],
        AttachStdout: true,
        AttachStderr: true
    });

    const npmStream = await npmInstallExec.start({ hijack: true });

    let npmCompleted = false;
    await new Promise<void>((resolve) => {
        npmStream.on('data', (chunk: Buffer) => {
            const output = chunk.toString();
            logger.info('[npm]:', output.trim());
            if (output.includes('npm_install_done') || output.includes('npm_install_failed')) {
                if (!npmCompleted) {
                    npmCompleted = true;
                    resolve();
                }
            }
        });
        npmStream.on('end', () => {
            if (!npmCompleted) {
                npmCompleted = true;
                resolve();
            }
        });
        npmStream.on('error', () => {
            if (!npmCompleted) {
                npmCompleted = true;
                resolve();
            }
        });
        setTimeout(() => {
            if (!npmCompleted) {
                npmCompleted = true;
                resolve();
            }
        }, 120000);
    });
}

/**
 * Install Python dependencies using pip
 */
export async function installPythonDependencies(
    container: Docker.Container,
    baseDir: string,
    dependencies: Record<string, string> | undefined
): Promise<void> {
    const requirementsContent = Object.entries(dependencies || {})
        .map(([pkg, version]) => (version === '*' ? pkg : `${pkg}==${version}`))
        .join('\n');

    if (!requirementsContent.trim()) {
        logger.info('[project-execution] No Python dependencies in requirements.txt, skipping pip install');
        return;
    }

    logger.info('[project-execution] Installing Python dependencies from requirements.txt');

    const base64Requirements = Buffer.from(requirementsContent).toString('base64');
    const writePipExec = await container.exec({
        Cmd: ['sh', '-c', `echo "${base64Requirements}" | base64 -d > ${baseDir}/requirements.txt`],
        AttachStdout: true,
        AttachStderr: true
    });
    const pipFileStream = await writePipExec.start({});
    pipFileStream.resume();
    await new Promise(resolve => {
        pipFileStream.on('end', resolve);
        pipFileStream.on('error', resolve);
        setTimeout(resolve, 1000);
    });

    const pipInstallExec = await container.exec({
        Cmd: ['sh', '-c', `cd ${baseDir} && pip install --user -r requirements.txt 2>&1 || echo "[pip] install completed with warnings"`],
        AttachStdout: true,
        AttachStderr: true
    });
    const pipStream = await pipInstallExec.start({ hijack: true });

    await new Promise<void>((resolve) => {
        let completed = false;
        pipStream.on('data', (chunk: Buffer) => {
            const output = chunk.toString();
            output.split('\n').forEach((line: string) => {
                if (line.trim()) {
                    logger.info(`[pip]:`, line.trim());
                }
            });
        });
        pipStream.on('end', () => {
            if (!completed) {
                completed = true;
                logger.info('[project-execution] Python pip install completed');
                resolve();
            }
        });
        pipStream.on('error', (err: any) => {
            if (!completed) {
                completed = true;
                logger.warn('[project-execution] Python pip install error:', err.message);
                resolve();
            }
        });
        setTimeout(() => {
            if (!completed) {
                completed = true;
                logger.warn('[project-execution] Python pip install timeout (60s)');
                resolve();
            }
        }, 60000);
    });
}

/**
 * Install C++ dependencies using Conan
 */
export async function installCppDependencies(
    container: Docker.Container,
    baseDir: string,
    files: Array<{ name: string }>
): Promise<void> {
    const hasConanfile = files.some(f => f.name === 'conanfile.txt' || f.name === 'conanfile.py');

    if (!hasConanfile) {
        return;
    }

    logger.info('[project-execution] Installing C++ dependencies with Conan');

    const profileExec = await container.exec({
        Cmd: ['sh', '-c', 'conan profile detect --force 2>&1'],
        AttachStdout: true,
        AttachStderr: true
    });
    await profileExec.start({});

    const installExec = await container.exec({
        Cmd: ['sh', '-c', `cd ${baseDir} && conan install . --output-folder=build --build=missing 2>&1`],
        AttachStdout: true,
        AttachStderr: true
    });
    await installExec.start({});
}

/**
 * Install Java dependencies using Maven
 */
export async function installJavaDependencies(
    container: Docker.Container,
    baseDir: string,
    files: Array<{ name: string }>
): Promise<void> {
    const hasPomXml = files.some(f => f.name === 'pom.xml');

    if (!hasPomXml) {
        return;
    }

    logger.info('[project-execution] Installing Java dependencies with Maven');

    const mvnExec = await container.exec({
        Cmd: ['sh', '-c', `cd ${baseDir} && mvn dependency:resolve 2>&1`],
        AttachStdout: true,
        AttachStderr: true
    });
    await mvnExec.start({});
}

/**
 * Install dependencies based on language
 */
export async function installDependencies(
    container: Docker.Container,
    language: string,
    baseDir: string,
    cacheDir: string,
    files: Array<{ name: string }>,
    dependencies?: Record<string, string>
): Promise<void> {
    switch (language) {
        case 'javascript':
            await installJavaScriptDependencies(container, baseDir, cacheDir);
            break;
        case 'python':
            await installPythonDependencies(container, baseDir, dependencies);
            break;
        case 'cpp':
            await installCppDependencies(container, baseDir, files);
            break;
        case 'java':
            await installJavaDependencies(container, baseDir, files);
            break;
    }
}

