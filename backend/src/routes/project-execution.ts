import express, { Request, Response } from 'express';
import Docker from 'dockerode';
import * as tar from 'tar-stream';
import { logger } from '../utils/logger.js';
import { Project } from '../models/Project.js';

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
        projectId?: string;
        dependencies?: Record<string, string>;
        customLibraries?: Array<{ fileName: string; originalName: string; fileType: string }>;
    };
}

const languageImages = {
    python: 'nexusquest-python',
    java: 'nexusquest-java',
    javascript: 'nexusquest-javascript',
    cpp: 'nexusquest-cpp',
};

/**
 * Helper to get execution command based on language
 */
function getExecutionCommand(language: string, baseDir: string, files: Array<{ name: string; content: string }>, mainFile: string): string {
    switch (language) {
        case 'python':
            return `cd ${baseDir} && python ${mainFile}`;
        case 'java':
            const javaFiles = files.filter(f => f.name.endsWith('.java')).map(f => f.name).join(' ');
            // Include custom libraries from lib/ directory in classpath
            return `cd ${baseDir} && javac -cp ".:lib/*" ${javaFiles} && java -cp ".:lib/*" ${mainFile.replace('.java', '')}`;
        case 'javascript':
            return `cd ${baseDir} && node ${mainFile}`;
        case 'cpp':
            const cppFiles = files.filter(f => f.name.endsWith('.cpp')).map(f => f.name).join(' ');
            // Include custom libraries: headers from include/, libraries from lib/
            return `cd ${baseDir} && g++ -std=c++20 -I${baseDir} -I${baseDir}/include -L${baseDir}/lib ${cppFiles} -o a.out && ./a.out`;
        default:
            throw new Error(`Unsupported language: ${language}`);
    }
}

/**
 * POST /api/projects/execute
 * Execute project code (multi-file) with streaming output
 */
router.post('/execute', async (req: ProjectExecutionRequest, res: Response) => {
    const { files, mainFile, language, sessionId, dependencies, projectId } = req.body;

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
    const cacheDir = `/dependencies/${sessionId}`;

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

        let { customLibraries } = req.body;

        // Auto-include project libraries when none explicitly provided (ALL LANGUAGES)
        if (projectId && (!customLibraries || customLibraries.length === 0)) {
            try {
                const project = await Project.findById(projectId).lean();
                const libs = (project?.customLibraries || []) as any[];
                if (libs.length > 0) {
                    customLibraries = libs.map((lib: any) => ({
                        _id: lib._id,
                        fileName: lib.fileName,
                        originalName: lib.originalName,
                        fileType: lib.fileType
                    }));
                    logger.info(`[project-execution] Auto-including ${customLibraries.length} custom libraries for ${language} from project ${projectId}`);
                }
            } catch (e: any) {
                logger.warn(`[project-execution] Failed to load project libraries for ${projectId}: ${e?.message || e}`);
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

        // Ensure dependency cache volume is present and writable
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

        // Write all files to container
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

        // ==========================================
        // CUSTOM LIBRARIES - COPY FROM DATABASE (ALL LANGUAGES)
        // ==========================================
        if (customLibraries && customLibraries.length > 0 && projectId) {
            logger.info(`[project-execution] Processing ${customLibraries.length} custom libraries for ${language} from DATABASE`);

            const customLibDir = `/custom-libs/${projectId}`;

            // Create directory
            try {
                const mkCustomDirExec = await container.exec({
                    User: 'root',
                    Cmd: ['sh', '-c', `mkdir -p ${customLibDir} && chown -R 1001:1001 ${customLibDir} && chmod -R 0775 ${customLibDir} && echo "DIRECTORY_CREATED"`],
                    AttachStdout: true,
                    AttachStderr: true
                });
                const setupStream = await mkCustomDirExec.start({ hijack: true });
                let setupOutput = '';
                await new Promise((resolve) => {
                    setupStream.on('data', (chunk: Buffer) => { setupOutput += chunk.toString(); });
                    setupStream.on('end', resolve);
                    setupStream.on('error', resolve);
                    setTimeout(resolve, 2000);
                });

                if (!setupOutput.includes('DIRECTORY_CREATED')) {
                    throw new Error('Failed to create custom libs directory');
                }
                logger.info('[project-execution] ✓ Custom libs directory created');
            } catch (e: any) {
                logger.error(`[project-execution] Failed to create directory: ${e?.message || e}`);
            }

            // Load project from database
            const project = await Project.findById(projectId).lean();
            if (!project) {
                logger.error(`[project-execution] Project ${projectId} not found in database`);
            } else {
                logger.info(`[project-execution] Found project with ${(project.customLibraries as any[] || []).length} libraries in database`);

                // Process each library - READ FROM DATABASE ONLY
                for (const lib of customLibraries) {
                    try {
                        const libAny: any = lib;

                        logger.info(`[project-execution] Looking for library: originalName="${lib.originalName}", fileName="${lib.fileName}", _id="${libAny?._id}"`);

                        // Find library in project's customLibraries array
                        const dbLib = (project.customLibraries as any[] || []).find((d: any) => {
                            // Try matching by _id first
                            if (libAny?._id && d?._id) {
                                const libId = libAny._id.toString();
                                const dbId = d._id.toString();
                                if (libId === dbId) {
                                    logger.info(`[project-execution] Matched library by _id: ${libId}`);
                                    return true;
                                }
                            }
                            // Fallback to name matching
                            if (d.originalName === lib.originalName) {
                                logger.info(`[project-execution] Matched library by originalName: ${lib.originalName}`);
                                return true;
                            }
                            if (d.fileName === lib.fileName) {
                                logger.info(`[project-execution] Matched library by fileName: ${lib.fileName}`);
                                return true;
                            }
                            return false;
                        });

                        if (!dbLib) {
                            logger.warn(`[project-execution] Library not found in database: ${lib.originalName}`);
                            logger.warn(`[project-execution] Available libraries: ${(project.customLibraries as any[] || []).map((l: any) => l.originalName).join(', ')}`);
                            continue;
                        }

                        // Extract fileContent from database
                        let libContent: Buffer | null = null;

                        if (dbLib.fileContent) {
                            if (Buffer.isBuffer(dbLib.fileContent)) {
                                libContent = dbLib.fileContent;
                            } else if (dbLib.fileContent.buffer) {
                                libContent = Buffer.from(dbLib.fileContent.buffer);
                            } else if (dbLib.fileContent.data) {
                                libContent = Buffer.from(dbLib.fileContent.data);
                            } else if (typeof dbLib.fileContent === 'string') {
                                libContent = Buffer.from(dbLib.fileContent, 'base64');
                            }
                        }

                        if (!libContent || libContent.length === 0) {
                            logger.error(`[project-execution] Library has no content in database: ${dbLib.originalName}`);
                            continue;
                        }

                        logger.info(`[project-execution] Loaded ${libContent.length} bytes from database for ${dbLib.originalName}`);

                        // Copy to container using Docker's putArchive API (avoids argument list too long error)
                        const targetName = dbLib.originalName;

                        try {
                            // Create a tar archive containing the file
                            const pack = tar.pack();
                            pack.entry({ name: targetName }, libContent);
                            pack.finalize();

                            // Collect the tar stream into a buffer
                            const chunks: Buffer[] = [];
                            for await (const chunk of pack) {
                                chunks.push(chunk);
                            }
                            const tarBuffer = Buffer.concat(chunks);

                            // Use Docker's putArchive to copy the file
                            await container.putArchive(tarBuffer, { path: customLibDir });

                            // Verify the file was copied
                            const verifyExec = await container.exec({
                                Cmd: ['sh', '-c', `ls -lh "${customLibDir}/${targetName}" && echo "COPY_SUCCESS"`],
                                AttachStdout: true,
                                AttachStderr: true
                            });
                            const verifyStream = await verifyExec.start({ hijack: true });
                            let verifyOutput = '';
                            await new Promise((resolve) => {
                                verifyStream.on('data', (chunk: Buffer) => { verifyOutput += chunk.toString(); });
                                verifyStream.on('end', resolve);
                                verifyStream.on('error', resolve);
                                setTimeout(resolve, 2000);
                            });

                            if (!verifyOutput.includes('COPY_SUCCESS')) {
                                logger.error(`[project-execution] Failed to verify copy: ${targetName}`);
                                logger.error(`[project-execution] Verify output: ${verifyOutput}`);
                            } else {
                                logger.info(`[project-execution] ✓ Successfully copied: ${targetName} (${libContent.length} bytes)`);
                            }
                        } catch (copyError: any) {
                            logger.error(`[project-execution] putArchive failed for ${targetName}: ${copyError?.message || copyError}`);
                        }
                    } catch (error: any) {
                        logger.error(`[project-execution] Error copying library ${lib.originalName}:`, error);
                    }
                }
            }
            // NOTE: Extraction to node_modules happens AFTER npm install to avoid being overwritten
        }

        // ==========================================
        // INSTALL DEPENDENCIES (npm, pip, maven, conan)
        // ==========================================

        if (language === 'javascript') {
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

        } else if (language === 'python') {
            const requirementsContent = Object.entries(dependencies || {})
                .map(([pkg, version]) => (version === '*' ? pkg : `${pkg}==${version}`))
                .join('\n');

            // Only run pip install if there are dependencies to install
            if (requirementsContent.trim()) {
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
                        output.split('\n').forEach(line => {
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
                    }, 60000); // Reduced from 120s to 60s
                });
            } else {
                logger.info('[project-execution] No Python dependencies in requirements.txt, skipping pip install');
            }

        } else if (language === 'cpp') {
            const hasConanfile = files.some(f => f.name === 'conanfile.txt' || f.name === 'conanfile.py');
            if (hasConanfile) {
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

        } else if (language === 'java') {
            const hasPomXml = files.some(f => f.name === 'pom.xml');
            if (hasPomXml) {
                logger.info('[project-execution] Installing Java dependencies with Maven');
                const mvnExec = await container.exec({
                    Cmd: ['sh', '-c', `cd ${baseDir} && mvn dependency:resolve 2>&1`],
                    AttachStdout: true,
                    AttachStderr: true
                });
                await mvnExec.start({});
            }
        }

        // ==========================================
        // EXTRACT/INSTALL CUSTOM LIBRARIES (ALL LANGUAGES)
        // ==========================================
        if (customLibraries && customLibraries.length > 0 && projectId) {
            const customLibDir = `/custom-libs/${projectId}`;
            let extractScript = '';

            if (language === 'javascript') {
                logger.info('[project-execution] Extracting JavaScript custom libraries to node_modules');
                extractScript = `
                set -e
                CUSTOM_DIR="${customLibDir}"
                BASE_DIR="${baseDir}"
                
                echo "[custom-libs-js] Starting extraction to node_modules"
                
                if [ ! -d "$CUSTOM_DIR" ]; then
                    echo "[custom-libs-js] Custom libs directory does not exist"
                    exit 0
                fi
                
                file_count=\$(ls -1 "$CUSTOM_DIR" 2>/dev/null | grep -E '\\.(tar\\.gz|tgz)$' | wc -l | tr -d ' ')
                echo "[custom-libs-js] Found \$file_count archive file(s)"
                
                if [ "\$file_count" = "0" ]; then
                    echo "[custom-libs-js] No archive files to process"
                    exit 0
                fi
                
                mkdir -p "$BASE_DIR/node_modules"
                
                for libfile in "$CUSTOM_DIR"/*.tar.gz "$CUSTOM_DIR"/*.tgz; do
                    if [ ! -f "\$libfile" ]; then
                        continue
                    fi
                    
                    filename=\$(basename "\$libfile")
                    echo "[custom-libs-js] Processing: \$filename"
                    
                    archive_name=\$(echo "\$filename" | sed -E 's/\\.(tar\\.gz|tgz)$//')
                    extract_dir="$CUSTOM_DIR/extracted_\$archive_name"
                    rm -rf "\$extract_dir" 2>/dev/null || true
                    mkdir -p "\$extract_dir"
                    
                    tar -xzf "\$libfile" -C "\$extract_dir" 2>&1 || tar -xf "\$libfile" -C "\$extract_dir" 2>&1
                    
                    subdir_count=\$(find "\$extract_dir" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
                    top_file_count=\$(find "\$extract_dir" -mindepth 1 -maxdepth 1 -type f 2>/dev/null | wc -l | tr -d ' ')
                    
                    if [ "\$subdir_count" = "1" ] && [ "\$top_file_count" = "0" ]; then
                        nested_dir=\$(find "\$extract_dir" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | head -n1)
                        if [ -n "\$nested_dir" ]; then
                            temp_dir="$CUSTOM_DIR/temp_\$\$"
                            mv "\$nested_dir" "\$temp_dir"
                            rm -rf "\$extract_dir"
                            mv "\$temp_dir" "\$extract_dir"
                        fi
                    fi
                    
                    pkg_name=""
                    if [ -f "\$extract_dir/package.json" ]; then
                        pkg_name=\$(grep -oE '"name"[[:space:]]*:[[:space:]]*"[^"]+"' "\$extract_dir/package.json" | sed 's/"name"[[:space:]]*:[[:space:]]*"\\([^"]*\\)"/\\1/' | head -n1)
                    fi
                    
                    if [ -z "\$pkg_name" ]; then
                        pkg_name=\$(echo "\$archive_name" | sed -E 's/-[0-9]+\\.[0-9]+\\.[0-9]+.*$//')
                    fi
                    
                    entry_point=""
                    if [ -f "\$extract_dir/package.json" ]; then
                        main_field=\$(grep -oE '"main"[[:space:]]*:[[:space:]]*"[^"]+"' "\$extract_dir/package.json" | sed 's/"main"[[:space:]]*:[[:space:]]*"\\([^"]*\\)"/\\1/' | head -n1)
                        if [ -n "\$main_field" ] && [ -f "\$extract_dir/\$main_field" ]; then
                            entry_point="\$main_field"
                        fi
                    fi
                    
                    if [ -z "\$entry_point" ]; then
                        for candidate in "index.js" "src/index.js" "lib/index.js" "dist/index.js"; do
                            if [ -f "\$extract_dir/\$candidate" ]; then
                                entry_point="\$candidate"
                                break
                            fi
                        done
                    fi
                    
                    rm -rf "$BASE_DIR/node_modules/\$pkg_name" 2>/dev/null || true
                    cp -r "\$extract_dir" "$BASE_DIR/node_modules/\$pkg_name"
                    
                    if [ "\$pkg_name" != "\$archive_name" ]; then
                        rm -rf "$BASE_DIR/node_modules/\$archive_name" 2>/dev/null || true
                        cp -r "\$extract_dir" "$BASE_DIR/node_modules/\$archive_name"
                    fi
                    
                    if [ -n "\$entry_point" ] && [ "\$entry_point" != "index.js" ]; then
                        if [ ! -f "$BASE_DIR/node_modules/\$pkg_name/index.js" ]; then
                            printf "module.exports = require('./\$entry_point');\\n" > "$BASE_DIR/node_modules/\$pkg_name/index.js"
                        fi
                    fi
                    
                    echo "[custom-libs-js] ✓ Installed: \$pkg_name"
                done
                
                echo "[custom-libs-js] ✓ Complete"
                `;
            } else if (language === 'python') {
                logger.info('[project-execution] Installing Python custom libraries with pip');
                extractScript = `
                set -e
                CUSTOM_DIR="${customLibDir}"
                
                echo "[custom-libs-py] Starting Python library installation"
                
                if [ ! -d "$CUSTOM_DIR" ]; then
                    echo "[custom-libs-py] Custom libs directory does not exist"
                    exit 0
                fi
                
                echo "[custom-libs-py] Contents of custom libs dir:"
                ls -la "$CUSTOM_DIR" 2>/dev/null || echo "(empty)"
                
                whl_count=\$(ls -1 "$CUSTOM_DIR"/*.whl 2>/dev/null | wc -l | tr -d ' ')
                tar_count=\$(ls -1 "$CUSTOM_DIR"/*.tar.gz 2>/dev/null | wc -l | tr -d ' ')
                echo "[custom-libs-py] Found \$whl_count wheel(s) and \$tar_count tarball(s)"
                
                if [ "\$whl_count" = "0" ] && [ "\$tar_count" = "0" ]; then
                    echo "[custom-libs-py] No Python packages to install"
                    exit 0
                fi
                
                # Install wheel files
                for pkg in "$CUSTOM_DIR"/*.whl; do
                    if [ ! -f "\$pkg" ]; then
                        continue
                    fi
                    filename=\$(basename "\$pkg")
                    echo "[custom-libs-py] Installing wheel: \$filename"
                    pip install --user --no-deps --no-index --quiet "\$pkg" 2>&1 || echo "[custom-libs-py] Warning: pip install failed for \$filename"
                    echo "[custom-libs-py] ✓ Installed: \$filename"
                done
                
                # Install tar.gz files
                for pkg in "$CUSTOM_DIR"/*.tar.gz; do
                    if [ ! -f "\$pkg" ]; then
                        continue
                    fi
                    filename=\$(basename "\$pkg")
                    echo "[custom-libs-py] Installing tarball: \$filename"
                    pip install --user --no-deps --no-index --quiet "\$pkg" 2>&1 || echo "[custom-libs-py] Warning: pip install failed for \$filename"
                    echo "[custom-libs-py] ✓ Installed: \$filename"
                done
                
                echo "[custom-libs-py] Installed packages:"
                pip list --user 2>/dev/null | head -20 || echo "(unable to list)"
                
                echo "[custom-libs-py] ✓ Complete"
                `;
            } else if (language === 'java') {
                logger.info('[project-execution] Installing Java custom libraries to lib/');
                extractScript = `
                set -e
                CUSTOM_DIR="${customLibDir}"
                BASE_DIR="${baseDir}"
                LIB_DIR="$BASE_DIR/lib"
                
                echo "[custom-libs-java] Starting Java library installation"
                echo "[custom-libs-java] Looking in: \$CUSTOM_DIR"
                
                if [ ! -d "$CUSTOM_DIR" ]; then
                    echo "[custom-libs-java] Custom libs directory does not exist"
                    exit 0
                fi
                
                echo "[custom-libs-java] Contents of custom libs dir:"
                ls -la "$CUSTOM_DIR" 2>/dev/null || echo "(empty)"
                
                jar_count=\$(ls -1 "$CUSTOM_DIR"/*.jar 2>/dev/null | wc -l | tr -d ' ')
                echo "[custom-libs-java] Found \$jar_count JAR file(s)"
                
                if [ "\$jar_count" = "0" ]; then
                    echo "[custom-libs-java] No JAR files to install"
                    exit 0
                fi
                
                mkdir -p "\$LIB_DIR"
                echo "[custom-libs-java] Created lib directory: \$LIB_DIR"
                
                for jarfile in "$CUSTOM_DIR"/*.jar; do
                    if [ ! -f "\$jarfile" ]; then
                        continue
                    fi
                    filename=\$(basename "\$jarfile")
                    echo "[custom-libs-java] Copying: \$filename"
                    cp "\$jarfile" "\$LIB_DIR/"
                    echo "[custom-libs-java] ✓ Installed: \$filename"
                done
                
                echo "[custom-libs-java] Contents of lib/:"
                ls -la "\$LIB_DIR" 2>/dev/null
                
                echo "[custom-libs-java] ✓ Complete - JARs available via -cp '.:lib/*'"
                `;
            } else if (language === 'cpp') {
                logger.info('[project-execution] Installing C++ custom libraries');
                extractScript = `
                set -e
                CUSTOM_DIR="${customLibDir}"
                BASE_DIR="${baseDir}"
                LIB_DIR="$BASE_DIR/lib"
                INCLUDE_DIR="$BASE_DIR/include"
                
                echo "[custom-libs-cpp] Starting C++ library installation"
                
                if [ ! -d "$CUSTOM_DIR" ]; then
                    echo "[custom-libs-cpp] Custom libs directory does not exist"
                    exit 0
                fi
                
                mkdir -p "\$LIB_DIR" "\$INCLUDE_DIR"
                
                # Copy .so and .a files
                for lib in "$CUSTOM_DIR"/*.so "$CUSTOM_DIR"/*.so.* "$CUSTOM_DIR"/*.a; do
                    if [ -f "\$lib" ]; then
                        cp "\$lib" "\$LIB_DIR/"
                        echo "[custom-libs-cpp] ✓ Copied: \$(basename \$lib)"
                    fi
                done
                
                # Copy headers
                for hdr in "$CUSTOM_DIR"/*.h "$CUSTOM_DIR"/*.hpp; do
                    if [ -f "\$hdr" ]; then
                        cp "\$hdr" "\$INCLUDE_DIR/"
                        echo "[custom-libs-cpp] ✓ Copied header: \$(basename \$hdr)"
                    fi
                done
                
                # Extract archives
                for archive in "$CUSTOM_DIR"/*.tar.gz "$CUSTOM_DIR"/*.zip; do
                    if [ ! -f "\$archive" ]; then
                        continue
                    fi
                    filename=\$(basename "\$archive")
                    echo "[custom-libs-cpp] Extracting: \$filename"
                    
                    tmpdir="$CUSTOM_DIR/extract_\$\$"
                    mkdir -p "\$tmpdir"
                    
                    if echo "\$filename" | grep -qE '\\.tar\\.gz$'; then
                        tar -xzf "\$archive" -C "\$tmpdir" 2>&1
                    elif echo "\$filename" | grep -qE '\\.zip$'; then
                        unzip -q -o "\$archive" -d "\$tmpdir" 2>&1 || true
                    fi
                    
                    find "\$tmpdir" -name "*.so" -o -name "*.so.*" -o -name "*.a" | xargs -I{} cp {} "\$LIB_DIR/" 2>/dev/null || true
                    find "\$tmpdir" -name "*.h" -o -name "*.hpp" | xargs -I{} cp {} "\$INCLUDE_DIR/" 2>/dev/null || true
                    
                    rm -rf "\$tmpdir"
                    echo "[custom-libs-cpp] ✓ Extracted: \$filename"
                done
                
                echo "[custom-libs-cpp] ✓ Complete"
                `;
            }

            if (extractScript) {
                const extractExec = await container.exec({
                    Cmd: ['sh', '-c', extractScript],
                    AttachStdout: true,
                    AttachStderr: true
                });

                const extractStream = await extractExec.start({ hijack: true });

                await new Promise((resolve) => {
                    extractStream.on('data', (chunk: Buffer) => {
                        const output = chunk.toString();
                        output.split('\n').forEach(line => {
                            if (line.trim()) {
                                logger.info(`[custom-libs-${language}]:`, line.trim());
                            }
                        });
                    });
                    extractStream.on('end', () => {
                        logger.info(`[custom-libs-${language}] Extraction complete`);
                        resolve(undefined);
                    });
                    extractStream.on('error', (err: any) => {
                        logger.error(`[custom-libs-${language}] Error:`, err);
                        resolve(err);
                    });
                    setTimeout(() => {
                        logger.warn(`[custom-libs-${language}] Timeout after 60s`);
                        resolve(undefined);
                    }, 60000);
                });
            }
        }

        // Execute code
        const execCommand = getExecutionCommand(language, baseDir, files, mainFile);
        logger.info(`Executing: ${execCommand}`);

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

        activeStreams.set(sessionId, stream);

        // Handle client disconnect
        req.on('close', async () => {
            try {
                activeStreams.delete(sessionId);
                stream.end();
                setTimeout(async () => {
                    try {
                        await container.stop();
                        await container.remove({ force: true });
                    } catch (err: any) {
                        if (err.statusCode !== 404) {
                            logger.error(`Cleanup error: ${err}`);
                        }
                    }
                }, 1000);
            } catch (err) {
                logger.error(`Disconnect handler error: ${err}`);
            }
        });

        // Stream output
        stream.on('data', (chunk: Buffer) => {
            const output = chunk.toString('utf8').replace(/[\x00-\x08]/g, '');
            if (output.trim()) {
                res.write(`data: ${JSON.stringify({ type: 'stdout', data: output })}\n\n`);
            }
        });

        stream.on('end', async () => {
            res.write(`data: ${JSON.stringify({ type: 'end', data: '' })}\n\n`);
            res.end();
            activeStreams.delete(sessionId);
            setTimeout(async () => {
                try {
                    await container.stop();
                    await container.remove({ force: true });
                } catch (err: any) {
                    if (err.statusCode !== 404) {
                        logger.error(`Cleanup error: ${err}`);
                    }
                }
            }, 1000);
        });

        stream.on('error', async (error: Error) => {
            logger.error(`Stream error: ${error.message}`);
            res.write(`data: ${JSON.stringify({ type: 'stderr', data: error.message })}\n\n`);
            res.end();
            activeStreams.delete(sessionId);
            setTimeout(async () => {
                try {
                    await container.stop();
                    await container.remove({ force: true });
                } catch (err: any) {
                    if (err.statusCode !== 404) {
                        logger.error(`Cleanup error: ${err}`);
                    }
                }
            }, 1000);
        });

    } catch (error: any) {
        logger.error('Execution failed:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`);
        res.end();
    }
});

/**
/**
 * POST /api/projects/input
 * Send input to running container
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
                error: 'No active execution found',
            });
        }

        stream.write(input + '\n');
        logger.info(`Input sent to ${sessionId}: ${input}`);
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