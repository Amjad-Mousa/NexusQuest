import express, { Request, Response } from 'express';
import Docker from 'dockerode';
import { logger } from '../utils/logger.js';

const router = express.Router();
const docker = new Docker();

// Store active streams for input handling
const activeStreams = new Map<string, any>();

interface ProjectExecutionRequest extends Request {
    body: {
        files: Array<{ name: string; content: string }>;
        mainFile: string;
        language: 'python' | 'java' | 'javascript' | 'cpp';
        sessionId: string;
        dependencies?: Record<string, string>;
    };
}

const languageImages: Record<string, string> = {
    python: 'nexusquest-python',
    java: 'nexusquest-java',
    javascript: 'nexusquest-javascript',
    cpp: 'nexusquest-cpp',
};

/**
 * Helper to get execution command based on language
 */
function getExecutionCommand(language: string, baseDir: string, files: Array<{ name: string; content: string }>, mainFile: string): string {
    switch (language.toLowerCase()) {
        case 'python':
            return `cd ${baseDir} && export PYTHONPATH=${baseDir}:/app/.local/lib/python3.10/site-packages && python3 -u ${mainFile}`;

        case 'javascript':
            return `cd ${baseDir} && node ${mainFile}`;

        case 'java': {
            const mainFileContent = files.find(f => f.name === mainFile)?.content || '';
            const classMatch = mainFileContent.match(/public\s+class\s+(\w+)/);
            const className = classMatch ? classMatch[1] : 'Main';

            // Check if project uses Maven (has pom.xml)
            const hasPomXml = files.some(f => f.name === 'pom.xml');

            if (hasPomXml) {
                // Use Maven to compile and run with dependencies
                // Maven compiles to target/classes, so we need to set classpath properly
                return `cd ${baseDir} && mvn compile -q && java -cp "target/classes:$(mvn dependency:build-classpath -q -DincludeScope=runtime -Dmdep.outputFile=/dev/stdout)" ${className}`;
            } else {
                // Plain Java without dependencies
                const javaFiles = files.filter(f => f.name.endsWith('.java')).map(f => f.name).join(' ');
                return `cd ${baseDir} && javac ${javaFiles} -d . && java -cp . ${className}`;
            }
        }

        case 'cpp': {
            const hasCMake = files.some(f => f.name === 'CMakeLists.txt');
            if (hasCMake) {
                // Use CMake build system
                // Conan generates conan_toolchain.cmake in the build folder when running: conan install . --output-folder=build
                return `cd ${baseDir} && mkdir -p build && cd build && if [ -f conan_toolchain.cmake ]; then cmake .. -DCMAKE_BUILD_TYPE=Release -DCMAKE_TOOLCHAIN_FILE=conan_toolchain.cmake; else cmake .. -DCMAKE_BUILD_TYPE=Release; fi && cmake --build . && find . -maxdepth 1 -type f -executable -exec {} \\;`;
            } else {
                const cppFiles = files.filter(f => f.name.endsWith('.cpp')).map(f => f.name).join(' ');
                return `cd ${baseDir} && g++ -std=c++20 -I${baseDir} ${cppFiles} -o a.out && ./a.out`;
            }
        }

        default:
            throw new Error(`Unsupported language: ${language}`);
    }
}

/**
 * POST /api/projects/execute
 * Execute project code (multi-file) with streaming output
 */
router.post('/execute', async (req: ProjectExecutionRequest, res: Response) => {
    const { files, mainFile, language, sessionId, dependencies } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: files array',
        });
    }

    if (!mainFile) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: mainFile',
        });
    }

    if (!language || !sessionId) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: language, sessionId',
        });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const containerName = `nexusquest-project-${sessionId}`;
    const baseDir = `/tmp/project-${sessionId}`;

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

        // Check if dependencies need to be installed (requires network access)
        let needsNetwork = dependencies && Object.keys(dependencies).length > 0;

        // Also check files for dependency definitions
        if (!needsNetwork && files) {
            if (language === 'javascript') {
                needsNetwork = files.some(f => f.name === 'package.json');
            } else if (language === 'python') {
                needsNetwork = files.some(f => f.name === 'requirements.txt');
            } else if (language === 'cpp') {
                needsNetwork = files.some(f =>
                    f.name === 'conanfile.txt' ||
                    f.name === 'conanfile.py' ||
                    (f.name === 'CMakeLists.txt' && /find_package\s*\(\s*(\w+)/.test(f.content))
                );
            } else if (language === 'java') {
                needsNetwork = files.some(f => f.name === 'pom.xml');
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
                Memory: 1024 * 1024 * 1024, // 1GB
                AutoRemove: false,
                // Use bridge network if dependencies need to be installed, otherwise use 'none' for security
                NetworkMode: needsNetwork ? 'bridge' : 'none',
                Dns: needsNetwork ? ['8.8.8.8', '8.8.4.4'] : undefined, // Google DNS for better reliability
                Tmpfs: {
                    '/tmp': 'rw,exec,nosuid,size=50m'
                }
            }
        });

        await container.start();
        logger.info(`Container started: ${containerName}`);

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

        // Write all files to container using base64 encoding
        for (const file of files) {
            const base64Content = Buffer.from(file.content).toString('base64');
            const writeCmd = `echo "${base64Content}" | base64 -d > ${baseDir}/${file.name}`;
            const writeExec = await container.exec({
                Cmd: ['sh', '-c', writeCmd],
                AttachStdout: true,
                AttachStderr: true
            });
            const writeStream = await writeExec.start({});
            writeStream.resume(); // Consume the stream
            await new Promise((resolve) => {
                writeStream.on('end', resolve);
                writeStream.on('error', resolve);
                setTimeout(resolve, 1000); // Timeout after 1 second
            });
        }

        // Check if C++ project has CMakeLists.txt with find_package() calls
        const hasCppDependencies = language === 'cpp' && files.some(f => {
            if (f.name === 'CMakeLists.txt') {
                const findPackageRegex = /find_package\s*\(\s*(\w+)(?:\s+REQUIRED|\s+QUIET)?\s*\)/gi;
                return findPackageRegex.test(f.content);
            }
            return false;
        });

        // Check if Java project has pom.xml with dependencies
        const hasJavaDependencies = language === 'java' && files.some(f => f.name === 'pom.xml');

        // Install dependencies if specified OR if project has dependency files
        if ((dependencies && Object.keys(dependencies).length > 0) || hasCppDependencies || hasJavaDependencies) {
            if (language === 'javascript') {
                logger.info('[project-execution] Installing JavaScript dependencies');

                // Check if npm is available
                const npmCheckExec = await container.exec({
                    Cmd: ['sh', '-c', 'npm --version'],
                    AttachStdout: true,
                    AttachStderr: true
                });
                const npmCheckStream = await npmCheckExec.start({});
                let npmVersionOutput = '';
                const npmAvailable = await new Promise<boolean>(resolve => {
                    npmCheckStream.on('data', (chunk: any) => {
                        npmVersionOutput += chunk.toString();
                    });
                    npmCheckStream.on('end', () => {
                        logger.info('[npm version check]:', npmVersionOutput.trim());
                        resolve(npmVersionOutput.length > 0);
                    });
                    npmCheckStream.on('error', (err: any) => {
                        logger.error('[npm check error]:', err);
                        resolve(false);
                    });
                    setTimeout(() => resolve(npmVersionOutput.length > 0), 2000);
                });

                if (!npmAvailable) {
                    logger.warn('[project-execution] npm not available in container, proceeding without dependency installation');
                } else {
                    const packageJson = {
                        name: 'nexusquest-project',
                        version: '1.0.0',
                        dependencies
                    };
                    const packageJsonContent = JSON.stringify(packageJson, null, 2);
                    const base64PackageJson = Buffer.from(packageJsonContent).toString('base64');

                    logger.info('[project-execution] Writing package.json to', baseDir);
                    const writePackageExec = await container.exec({
                        Cmd: ['sh', '-c', `echo "${base64PackageJson}" | base64 -d > ${baseDir}/package.json`],
                        AttachStdout: true,
                        AttachStderr: true
                    });
                    const pkgStream = await writePackageExec.start({});
                    pkgStream.resume();
                    await new Promise((resolve) => {
                        pkgStream.on('end', resolve);
                        pkgStream.on('error', resolve);
                        setTimeout(resolve, 1000);
                    });

                    // Verify package.json was written
                    logger.info('[project-execution] Verifying package.json exists');
                    const verifyExec = await container.exec({
                        Cmd: ['sh', '-c', `cat ${baseDir}/package.json`],
                        AttachStdout: true,
                        AttachStderr: true
                    });
                    const verifyStream = await verifyExec.start({});
                    let verifyOutput = '';
                    await new Promise((resolve) => {
                        verifyStream.on('data', (chunk: Buffer) => {
                            verifyOutput += chunk.toString();
                        });
                        verifyStream.on('end', resolve);
                        verifyStream.on('error', resolve);
                        setTimeout(resolve, 1000);
                    });
                    logger.info('[project-execution] package.json content:', verifyOutput.substring(0, 200));

                    // Run npm install and redirect output to file
                    logger.info('[project-execution] Running npm install');
                    const npmInstallExec = await container.exec({
                        Cmd: ['sh', '-c', `cd ${baseDir} && npm install --legacy-peer-deps > npm-install.log 2>&1 && echo "npm_install_done" || echo "npm_install_failed"`],
                        AttachStdout: true,
                        AttachStderr: true
                    });
                    const npmStream = await npmInstallExec.start({ hijack: true });

                    // Wait for npm to complete - collect output to check for completion status
                    let npmOutput = '';
                    let npmCompleted = false;
                    let logCheckerInterval: NodeJS.Timeout | null = null;

                    await new Promise<void>((resolve) => {
                        // Consume stream data
                        npmStream.on('data', (chunk: Buffer) => {
                            const output = chunk.toString();
                            npmOutput += output;
                            logger.info('[npm exec response]:', output.trim());

                            // Check if we see the completion marker
                            if (output.includes('npm_install_done')) {
                                if (!npmCompleted) {
                                    npmCompleted = true;
                                    if (logCheckerInterval) clearInterval(logCheckerInterval);
                                    logger.info('[project-execution] npm install completed successfully');
                                    resolve();
                                }
                            } else if (output.includes('npm_install_failed')) {
                                if (!npmCompleted) {
                                    npmCompleted = true;
                                    if (logCheckerInterval) clearInterval(logCheckerInterval);
                                    logger.error('[project-execution] npm install failed');
                                    resolve();
                                }
                            }
                        });
                        npmStream.on('end', () => {
                            if (!npmCompleted) {
                                npmCompleted = true;
                                if (logCheckerInterval) clearInterval(logCheckerInterval);
                                logger.info('[project-execution] npm exec stream ended');
                                resolve();
                            }
                        });
                        npmStream.on('error', (err: any) => {
                            if (!npmCompleted) {
                                npmCompleted = true;
                                if (logCheckerInterval) clearInterval(logCheckerInterval);
                                logger.error('[project-execution] npm exec stream error:', err);
                                resolve();
                            }
                        });

                        // Start periodic log checking while waiting
                        let checkCount = 0;
                        logCheckerInterval = setInterval(async () => {
                            checkCount++;
                            if (checkCount > 60) { // Stop after 2 minutes
                                if (logCheckerInterval) clearInterval(logCheckerInterval);
                                return;
                            }

                            try {
                                // Check log file for progress
                                const progressExec = await container.exec({
                                    Cmd: ['sh', '-c', `tail -1 ${baseDir}/npm-install.log 2>/dev/null || echo ""`],
                                    AttachStdout: true,
                                    AttachStderr: true
                                });
                                const progressStream = await progressExec.start({ hijack: true });
                                let logLine = '';
                                await new Promise<void>((resolve) => {
                                    progressStream.on('data', (chunk: Buffer) => {
                                        logLine += chunk.toString();
                                    });
                                    progressStream.on('end', () => {
                                        if (logLine.trim() && !logLine.includes('npm_install_done') && !logLine.includes('npm_install_failed')) {
                                            logger.info(`[npm progress ${checkCount * 2}s]: ${logLine.trim().substring(0, 150)}`);
                                        }
                                        resolve();
                                    });
                                    progressStream.on('error', () => resolve());
                                    setTimeout(() => resolve(), 1000);
                                });
                            } catch (err) {
                                // Ignore errors in progress checking
                            }
                        }, 2000); // Check every 2 seconds

                        // Increased timeout to 120 seconds (2 minutes) for npm install
                        setTimeout(() => {
                            if (logCheckerInterval) clearInterval(logCheckerInterval);
                            if (!npmCompleted) {
                                npmCompleted = true;
                                logger.warn('[project-execution] npm exec timeout after 120s, checking status...');
                                resolve();
                            }
                        }, 120000);
                    });

                    // Poll to check if npm install actually completed
                    let installSuccess = false;
                    logger.info('[project-execution] Starting verification polling...');

                    // First, check if we got the completion marker from stream
                    if (npmOutput.includes('npm_install_done')) {
                        installSuccess = true;
                        logger.info('[project-execution] npm install completed (from stream output)');
                    } else {
                        // Poll up to 30 times (60 seconds total) to check status
                        let npmStillRunning = true;
                        let maxAttempts = 30;
                        let npmFinishedAt = -1;

                        for (let attempt = 0; attempt < maxAttempts; attempt++) {
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            logger.info(`[project-execution] Verification attempt ${attempt + 1}/${maxAttempts}`);

                            // Check if npm process is still running first
                            const procCheckExec = await container.exec({
                                Cmd: ['sh', '-c', `ps aux | grep -E "[n]pm install" | wc -l`],
                                AttachStdout: true,
                                AttachStderr: true
                            });
                            const procStream = await procCheckExec.start({ hijack: true });
                            let procOutput = '';
                            await new Promise((resolve) => {
                                procStream.on('data', (chunk: Buffer) => {
                                    procOutput += chunk.toString();
                                });
                                procStream.on('end', resolve);
                                procStream.on('error', resolve);
                                setTimeout(resolve, 1000);
                            });

                            const runningCount = parseInt(procOutput.trim()) || 0;
                            const wasRunning = npmStillRunning;
                            npmStillRunning = runningCount > 0;

                            if (wasRunning && !npmStillRunning) {
                                npmFinishedAt = attempt;
                                logger.info(`[project-execution] npm process finished at attempt ${attempt + 1}`);
                            }

                            logger.info(`[project-execution] npm process check: ${runningCount} process(es) running`);

                            // Check if node_modules exists
                            const checkModulesExec = await container.exec({
                                Cmd: ['sh', '-c', `test -d ${baseDir}/node_modules && echo "exists" || echo "not_found"`],
                                AttachStdout: true,
                                AttachStderr: true
                            });
                            const checkStream = await checkModulesExec.start({ hijack: true });
                            let checkOutput = '';
                            await new Promise((resolve) => {
                                checkStream.on('data', (chunk: Buffer) => {
                                    checkOutput += chunk.toString();
                                });
                                checkStream.on('end', resolve);
                                checkStream.on('error', resolve);
                                setTimeout(resolve, 2000);
                            });

                            logger.info(`[project-execution] node_modules check result: ${checkOutput.trim()}`);

                            if (checkOutput.includes('exists')) {
                                installSuccess = true;
                                logger.info('[project-execution] ✓ node_modules found, npm install succeeded');
                                break;
                            }

                            // If npm finished but node_modules not found yet, wait a bit more
                            if (!npmStillRunning && !checkOutput.includes('exists') && npmFinishedAt >= 0 && attempt - npmFinishedAt < 3) {
                                logger.info('[project-execution] npm finished but node_modules not found yet, waiting...');
                                await new Promise(resolve => setTimeout(resolve, 1000));

                                // Check again
                                const retryCheckExec = await container.exec({
                                    Cmd: ['sh', '-c', `test -d ${baseDir}/node_modules && echo "exists" || echo "not_found"`],
                                    AttachStdout: true,
                                    AttachStderr: true
                                });
                                const retryStream = await retryCheckExec.start({ hijack: true });
                                let retryOutput = '';
                                await new Promise((resolve) => {
                                    retryStream.on('data', (chunk: Buffer) => {
                                        retryOutput += chunk.toString();
                                    });
                                    retryStream.on('end', resolve);
                                    retryStream.on('error', resolve);
                                    setTimeout(resolve, 2000);
                                });

                                logger.info(`[project-execution] node_modules retry check: ${retryOutput.trim()}`);
                                if (retryOutput.includes('exists')) {
                                    installSuccess = true;
                                    logger.info('[project-execution] ✓ node_modules found on retry, npm install succeeded');
                                    break;
                                }
                            }

                            // If npm finished but node_modules not found yet, wait a bit more
                            if (!npmStillRunning && !checkOutput.includes('exists')) {
                                logger.info('[project-execution] npm finished but node_modules not found yet, waiting...');
                                await new Promise(resolve => setTimeout(resolve, 1000));

                                // Check again
                                const retryCheckExec = await container.exec({
                                    Cmd: ['sh', '-c', `test -d ${baseDir}/node_modules && echo "exists" || echo "not_found"`],
                                    AttachStdout: true,
                                    AttachStderr: true
                                });
                                const retryStream = await retryCheckExec.start({ hijack: true });
                                let retryOutput = '';
                                await new Promise((resolve) => {
                                    retryStream.on('data', (chunk: Buffer) => {
                                        retryOutput += chunk.toString();
                                    });
                                    retryStream.on('end', resolve);
                                    retryStream.on('error', resolve);
                                    setTimeout(resolve, 2000);
                                });

                                logger.info(`[project-execution] node_modules retry check: ${retryOutput.trim()}`);
                                if (retryOutput.includes('exists')) {
                                    installSuccess = true;
                                    logger.info('[project-execution] ✓ node_modules found on retry, npm install succeeded');
                                    break;
                                }
                            }

                            // Also check the log for completion indicators and errors
                            const logExec = await container.exec({
                                Cmd: ['sh', '-c', `tail -30 ${baseDir}/npm-install.log 2>/dev/null || echo "no_log"`],
                                AttachStdout: true,
                                AttachStderr: true
                            });
                            const logStream = await logExec.start({ hijack: true });
                            let logOutput = '';
                            await new Promise((resolve) => {
                                logStream.on('data', (chunk: Buffer) => {
                                    logOutput += chunk.toString();
                                });
                                logStream.on('end', resolve);
                                logStream.on('error', resolve);
                                setTimeout(resolve, 2000);
                            });

                            // Check for npm errors first
                            if (logOutput.includes('npm error')) {
                                let errorMsg = 'npm install failed';
                                if (logOutput.includes('EAI_AGAIN') || logOutput.includes('getaddrinfo')) {
                                    errorMsg = 'Network/DNS error: Cannot reach npm registry. Please check your internet connection or Docker network configuration.';
                                } else if (logOutput.includes('ENOTFOUND')) {
                                    errorMsg = 'DNS resolution failed: Cannot resolve npm registry hostname.';
                                } else if (logOutput.includes('ETIMEDOUT') || logOutput.includes('timeout')) {
                                    errorMsg = 'Network timeout: Connection to npm registry timed out.';
                                } else if (logOutput.includes('ECONNREFUSED')) {
                                    errorMsg = 'Connection refused: Cannot connect to npm registry.';
                                }

                                logger.error(`[project-execution] npm install error detected: ${errorMsg}`);
                                // Don't break here, continue to final check to get full error details
                            }

                            // Check for various completion indicators
                            if (logOutput.includes('added') ||
                                logOutput.includes('up to date') ||
                                logOutput.includes('npm_install_done') ||
                                logOutput.includes('packages in') ||
                                (logOutput.includes('audited') && !logOutput.includes('npm ERR'))) {
                                // Double-check node_modules exists
                                const verifyExec = await container.exec({
                                    Cmd: ['sh', '-c', `test -d ${baseDir}/node_modules && echo "exists" || echo "not_found"`],
                                    AttachStdout: true,
                                    AttachStderr: true
                                });
                                const verifyStream = await verifyExec.start({ hijack: true });
                                let verifyOutput = '';
                                await new Promise((resolve) => {
                                    verifyStream.on('data', (chunk: Buffer) => {
                                        verifyOutput += chunk.toString();
                                    });
                                    verifyStream.on('end', resolve);
                                    verifyStream.on('error', resolve);
                                    setTimeout(resolve, 2000);
                                });

                                if (verifyOutput.includes('exists')) {
                                    installSuccess = true;
                                    logger.info('[project-execution] npm install completed based on log indicators');
                                    break;
                                }
                            }

                            // If npm finished but we haven't found success yet, continue checking a bit more
                            if (!npmStillRunning && attempt < 5) {
                                logger.info('[project-execution] npm process finished, continuing verification...');
                            }
                        }

                        if (!installSuccess && !npmStillRunning) {
                            // Final check - npm finished but we didn't detect success
                            logger.warn('[project-execution] npm process finished but success not confirmed, doing final check...');
                            const finalCheckExec = await container.exec({
                                Cmd: ['sh', '-c', `test -d ${baseDir}/node_modules && echo "exists" || echo "not_found"`],
                                AttachStdout: true,
                                AttachStderr: true
                            });
                            const finalStream = await finalCheckExec.start({ hijack: true });
                            let finalOutput = '';
                            await new Promise((resolve) => {
                                finalStream.on('data', (chunk: Buffer) => {
                                    finalOutput += chunk.toString();
                                });
                                finalStream.on('end', resolve);
                                finalStream.on('error', resolve);
                                setTimeout(resolve, 2000);
                            });

                            if (finalOutput.includes('exists')) {
                                installSuccess = true;
                                logger.info('[project-execution] npm install succeeded - node_modules found on final check');
                            }
                        }
                    }

                    // Final check - read full npm log for debugging and error detection
                    logger.info('[project-execution] Reading npm install log');
                    const logExec = await container.exec({
                        Cmd: ['sh', '-c', `cat ${baseDir}/npm-install.log 2>/dev/null || echo "no log"`],
                        AttachStdout: true,
                        AttachStderr: true
                    });
                    const logStream = await logExec.start({ hijack: true });
                    let logOutput = '';
                    await new Promise((resolve) => {
                        logStream.on('data', (chunk: Buffer) => {
                            logOutput += chunk.toString();
                        });
                        logStream.on('end', resolve);
                        logStream.on('error', resolve);
                        setTimeout(resolve, 3000);
                    });
                    logger.info('[npm install log]:', logOutput.substring(0, 500));

                    // Check for npm errors in the log
                    let npmError = '';
                    if (logOutput.includes('npm error')) {
                        // Extract error message
                        const errorMatch = logOutput.match(/npm error[^\n]*(?:\n[^\n]*)*/);
                        if (errorMatch) {
                            npmError = errorMatch[0].trim();
                        }

                        // Check for specific error types
                        if (logOutput.includes('EAI_AGAIN') || logOutput.includes('getaddrinfo')) {
                            npmError = 'Network/DNS error: Cannot reach npm registry. Please check your internet connection or Docker network configuration.';
                        } else if (logOutput.includes('ENOTFOUND')) {
                            npmError = 'DNS resolution failed: Cannot resolve npm registry hostname.';
                        } else if (logOutput.includes('ETIMEDOUT') || logOutput.includes('timeout')) {
                            npmError = 'Network timeout: Connection to npm registry timed out.';
                        } else if (logOutput.includes('ECONNREFUSED')) {
                            npmError = 'Connection refused: Cannot connect to npm registry.';
                        }
                    }

                    if (!installSuccess) {
                        if (npmError) {
                            logger.error('[project-execution] npm install failed:', npmError);
                            // Return error response instead of proceeding
                            res.status(500).json({
                                success: false,
                                error: `Dependency installation failed: ${npmError}`,
                                details: logOutput.substring(0, 1000)
                            });
                            return;
                        } else if (!npmOutput.includes('npm_install_done')) {
                            logger.warn('[project-execution] npm install may not have completed, but proceeding anyway');
                        }
                    } else {
                        logger.info('[project-execution] npm install completed successfully');
                    }
                }
            } else if (language === 'python') {
                logger.info('[project-execution] Installing Python dependencies');
                const requirementsContent = Object.entries(dependencies || {})
                    .map(([pkg, version]) => (version === '*' ? pkg : `${pkg}==${version}`))
                    .join('\n');
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

                // Run pip install
                const pipInstallExec = await container.exec({
                    Cmd: ['sh', '-c', `cd ${baseDir} && pip install --user -r requirements.txt 2>&1`],
                    AttachStdout: true,
                    AttachStderr: true
                });
                const pipStream = await pipInstallExec.start({ hijack: true });

                let pipOutput = '';
                // Properly wait for completion
                await new Promise<void>((resolve) => {
                    let completed = false;
                    pipStream.on('end', () => {
                        if (!completed) {
                            completed = true;
                            logger.info('[project-execution] pip stream ended');
                            resolve();
                        }
                    });
                    pipStream.on('error', (err: any) => {
                        if (!completed) {
                            completed = true;
                            logger.error('[project-execution] pip stream error:', err);
                            resolve();
                        }
                    });
                    pipStream.on('data', (chunk: Buffer) => {
                        pipOutput += chunk.toString();
                    });
                    // Safety timeout
                    setTimeout(() => {
                        if (!completed) {
                            completed = true;
                            logger.warn('[project-execution] pip install timeout after 120 seconds');
                            resolve();
                        }
                    }, 120000);
                });

                if (pipOutput.includes('ERROR:') || pipOutput.includes('Could not find a version') || pipOutput.includes('command not found')) {
                    logger.error('[project-execution] pip install failed:', pipOutput);
                    res.status(500).json({
                        success: false,
                        error: 'Dependency installation failed',
                        details: pipOutput
                    });
                    return;
                }

                logger.info('[project-execution] pip install completed successfully');
            } else if (language === 'cpp') {
                // Check if project has a conanfile (conanfile.txt or conanfile.py)
                const hasConanfile = files.some(f => f.name === 'conanfile.txt' || f.name === 'conanfile.py');

                // Parse CMakeLists.txt to extract find_package() calls
                const cmakeFile = files.find(f => f.name === 'CMakeLists.txt');
                const requiredPackages: string[] = [];

                if (cmakeFile) {
                    // Extract find_package() calls from CMakeLists.txt
                    const findPackageRegex = /find_package\s*\(\s*(\w+)(?:\s+REQUIRED|\s+QUIET)?\s*\)/gi;
                    let match;
                    while ((match = findPackageRegex.exec(cmakeFile.content)) !== null) {
                        const packageName = match[1];
                        // Skip common system packages
                        if (!['Threads', 'OpenMP', 'CUDA', 'MPI', 'Boost'].includes(packageName)) {
                            requiredPackages.push(packageName);
                        }
                    }

                    if (requiredPackages.length > 0) {
                        logger.info('[project-execution] Found packages in CMakeLists.txt:', requiredPackages);
                    }
                }

                if (hasConanfile || requiredPackages.length > 0 || (dependencies && Object.keys(dependencies).length > 0)) {
                    logger.info('[project-execution] Installing C++ dependencies with Conan');

                    // Generate conanfile.txt from CMakeLists.txt packages or dependencies object
                    if (!hasConanfile) {
                        let conanContent = '[requires]\n';

                        // Add packages from CMakeLists.txt with default versions
                        const packageVersionMap: Record<string, string> = {
                            'fmt': '10.1.1',
                            'nlohmann_json': '3.11.2',
                            'spdlog': '1.12.0',
                            'catch2': '3.4.0',
                            'gtest': '1.14.0'
                        };

                        requiredPackages.forEach(pkg => {
                            const version = packageVersionMap[pkg] || 'latest';
                            conanContent += `${pkg}/${version}\n`;
                        });

                        // Add explicit dependencies if provided
                        if (dependencies && Object.keys(dependencies).length > 0) {
                            Object.entries(dependencies).forEach(([pkg, version]) => {
                                if (!requiredPackages.includes(pkg)) {
                                    conanContent += `${pkg}/${version}\n`;
                                }
                            });
                        }

                        conanContent += '\n[generators]\nCMakeDeps\nCMakeToolchain\n';

                        // Write conanfile.txt
                        const base64Conan = Buffer.from(conanContent).toString('base64');
                        await container.exec({
                            Cmd: ['sh', '-c', `echo "${base64Conan}" | base64 -d > ${baseDir}/conanfile.txt`],
                            AttachStdout: true,
                            AttachStderr: true
                        }).then(e => e.start({}));

                        logger.info('[project-execution] Generated conanfile.txt with packages:', requiredPackages);
                    }

                    // Run conan profile detect
                    logger.info('[project-execution] Setting up Conan profile');
                    const profileExec = await container.exec({
                        Cmd: ['sh', '-c', 'conan profile detect --force 2>&1'],
                        AttachStdout: true,
                        AttachStderr: true
                    });
                    const profileStream = await profileExec.start({ hijack: true });

                    let profileOutput = '';
                    await new Promise<void>((resolve) => {
                        profileStream.on('data', (chunk: Buffer) => {
                            profileOutput += chunk.toString();
                        });
                        profileStream.on('end', () => {
                            logger.info('[project-execution] Conan profile setup completed');
                            logger.info('[project-execution] Profile output:', profileOutput.substring(0, 500));
                            resolve();
                        });
                        profileStream.on('error', (err: any) => {
                            logger.error('[project-execution] Conan profile error:', err);
                            resolve();
                        });
                        // Timeout for profile detection
                        setTimeout(() => {
                            logger.warn('[project-execution] Conan profile detection timeout');
                            resolve();
                        }, 30000); // 30 seconds
                    });

                    // Run conan install
                    logger.info('[project-execution] Running conan install');
                    const installExec = await container.exec({
                        Cmd: ['sh', '-c', `cd ${baseDir} && conan install . --output-folder=build --build=missing 2>&1`],
                        AttachStdout: true,
                        AttachStderr: true
                    });
                    const installStream = await installExec.start({ hijack: true });

                    let conanOutput = '';
                    await new Promise<void>((resolve) => {
                        installStream.on('data', (chunk: Buffer) => {
                            conanOutput += chunk.toString();
                        });
                        installStream.on('end', resolve);
                        installStream.on('error', resolve);
                        // Timeout for conan install (can be slow)
                        setTimeout(resolve, 300000); // 5 minutes
                    });

                    if (conanOutput.includes('ERROR:')) {
                        logger.error('[project-execution] Conan install failed:', conanOutput);
                        res.status(500).json({
                            success: false,
                            error: 'Dependency installation failed (Conan)',
                            details: conanOutput
                        });
                        return;
                    }
                    logger.info('[project-execution] Conan install completed');
                } else {
                    logger.info('[project-execution] No Conan dependencies to install for C++ project');
                }
            } else if (language === 'java') {
                // Check if project has pom.xml
                const hasPomXml = files.some(f => f.name === 'pom.xml');

                if (hasPomXml) {
                    logger.info('[project-execution] Installing Java dependencies with Maven');

                    // Run mvn dependency:resolve to download dependencies
                    logger.info('[project-execution] Running mvn dependency:resolve');
                    const mvnExec = await container.exec({
                        Cmd: ['sh', '-c', `cd ${baseDir} && mvn dependency:resolve 2>&1`],
                        AttachStdout: true,
                        AttachStderr: true
                    });
                    const mvnStream = await mvnExec.start({ hijack: true });

                    let mvnOutput = '';
                    await new Promise<void>((resolve) => {
                        mvnStream.on('data', (chunk: Buffer) => {
                            mvnOutput += chunk.toString();
                        });
                        mvnStream.on('end', () => {
                            logger.info('[project-execution] Maven dependency resolution completed');
                            resolve();
                        });
                        mvnStream.on('error', (err: any) => {
                            logger.error('[project-execution] Maven error:', err);
                            resolve();
                        });
                        // Timeout for Maven (can be slow on first run)
                        setTimeout(() => {
                            logger.warn('[project-execution] Maven dependency resolution timeout');
                            resolve();
                        }, 180000); // 3 minutes
                    });

                    if (mvnOutput.includes('BUILD FAILURE') || mvnOutput.includes('ERROR')) {
                        logger.error('[project-execution] Maven dependency resolution failed:', mvnOutput.substring(0, 500));
                        res.status(500).json({
                            success: false,
                            error: 'Dependency installation failed (Maven)',
                            details: mvnOutput.substring(0, 1000)
                        });
                        return;
                    }
                    logger.info('[project-execution] Maven dependencies installed successfully');
                } else {
                    logger.info('[project-execution] No pom.xml found for Java project');
                }
            }
        }

        // Prepare execution command
        const execCommand = getExecutionCommand(language, baseDir, files, mainFile);
        logger.info(`Project execution command: ${execCommand}`);
        logger.info('[project-execution] About to execute main code');

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

                // Wait a bit before removing container
                setTimeout(async () => {
                    try {
                        // Stop container first if it's still running
                        try {
                            await container.stop();
                        } catch (stopErr: any) {
                            // Container might already be stopped, ignore
                            if (stopErr.statusCode !== 304 && stopErr.statusCode !== 404) {
                                logger.warn(`Error stopping container: ${stopErr.message}`);
                            }
                        }

                        // Small delay before removal
                        await new Promise(resolve => setTimeout(resolve, 500));

                        await container.remove({ force: true });
                        logger.info(`Container removed after client disconnect: ${containerName}`);
                    } catch (err: any) {
                        // Ignore "container not found" errors as they're expected after cleanup
                        if (err.statusCode !== 404 && !err.message?.includes('No such container')) {
                            logger.error(`Error cleaning up container: ${err}`);
                        }
                    }
                }, 1000); // 1 second delay
            } catch (err) {
                logger.error(`Error in client disconnect handler: ${err}`);
            }
        });

        // Stream output to client
        stream.on('data', (chunk: Buffer) => {
            const output = chunk.toString('utf8').replace(/[\x00-\x08]/g, '');
            if (output.trim()) {
                res.write(`data: ${JSON.stringify({ type: 'stdout', data: output })}\n\n`);
            }
        });

        stream.on('end', async () => {
            res.write(`data: ${JSON.stringify({ type: 'end', data: '' })}\n\n`);
            res.end();

            // Clean up
            activeStreams.delete(sessionId);

            // Wait a bit for Docker to finish processing, then remove container
            setTimeout(async () => {
                try {
                    // Stop container first if it's still running
                    try {
                        await container.stop();
                    } catch (stopErr: any) {
                        // Container might already be stopped, ignore
                        if (stopErr.statusCode !== 304 && stopErr.statusCode !== 404) {
                            logger.warn(`Error stopping container: ${stopErr.message}`);
                        }
                    }

                    // Small delay before removal
                    await new Promise(resolve => setTimeout(resolve, 500));

                    await container.remove({ force: true });
                    logger.info(`Container removed after execution: ${containerName}`);
                } catch (err: any) {
                    // Ignore "container not found" errors as they're expected after cleanup
                    if (err.statusCode !== 404 && !err.message?.includes('No such container')) {
                        logger.error(`Error removing container: ${err}`);
                    }
                }
            }, 1000); // 1 second delay
        });

        stream.on('error', async (error: Error) => {
            logger.error(`Stream error: ${error.message}`);
            res.write(`data: ${JSON.stringify({ type: 'stderr', data: error.message })}\n\n`);
            res.end();

            // Clean up
            activeStreams.delete(sessionId);

            // Wait a bit for Docker to finish processing, then remove container
            setTimeout(async () => {
                try {
                    // Stop container first if it's still running
                    try {
                        await container.stop();
                    } catch (stopErr: any) {
                        // Container might already be stopped, ignore
                        if (stopErr.statusCode !== 304 && stopErr.statusCode !== 404) {
                            logger.warn(`Error stopping container: ${stopErr.message}`);
                        }
                    }

                    // Small delay before removal
                    await new Promise(resolve => setTimeout(resolve, 500));

                    await container.remove({ force: true });
                } catch (err: any) {
                    // Ignore "container not found" errors as they're expected after cleanup
                    if (err.statusCode !== 404 && !err.message?.includes('No such container')) {
                        logger.error(`Error removing container after error: ${err}`);
                    }
                }
            }, 1000); // 1 second delay
        });

    } catch (error: any) {
        logger.error('Project execution failed:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`);
        res.end();
    }
});

/**
 * POST /api/projects/input
 * Send input to running project container
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

export { router as projectExecutionRouter };
