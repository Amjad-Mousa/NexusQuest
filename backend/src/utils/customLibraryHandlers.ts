import Docker from 'dockerode';
import * as tar from 'tar-stream';
import { logger } from './logger.js';
import { Project } from '../models/Project.js';

export interface CustomLibrary {
    _id?: string;
    fileName: string;
    originalName: string;
    fileType: string;
}

/**
 * Get extraction script for JavaScript custom libraries
 */
function getJavaScriptExtractionScript(customLibDir: string, baseDir: string): string {
    return `
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
}

/**
 * Get extraction script for Python custom libraries
 */
function getPythonExtractionScript(customLibDir: string): string {
    return `
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
        
        for pkg in "$CUSTOM_DIR"/*.whl; do
            if [ ! -f "\$pkg" ]; then
                continue
            fi
            filename=\$(basename "\$pkg")
            echo "[custom-libs-py] Installing wheel: \$filename"
            pip install --user --no-deps --no-index --quiet "\$pkg" 2>&1 || echo "[custom-libs-py] Warning: pip install failed for \$filename"
            echo "[custom-libs-py] ✓ Installed: \$filename"
        done
        
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
}

/**
 * Get extraction script for Java custom libraries
 */
function getJavaExtractionScript(customLibDir: string, baseDir: string): string {
    return `
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
}

/**
 * Get extraction script for C++ custom libraries
 */
function getCppExtractionScript(customLibDir: string, baseDir: string): string {
    return `
        set -e
        CUSTOM_DIR="${customLibDir}"
        BASE_DIR="${baseDir}"
        LIB_DIR="$BASE_DIR/lib"
        INCLUDE_DIR="$BASE_DIR/include"
        
        echo "[custom-libs-cpp] Starting C++ library installation"
        echo "[custom-libs-cpp] Looking in: \$CUSTOM_DIR"
        
        if [ ! -d "$CUSTOM_DIR" ]; then
            echo "[custom-libs-cpp] Custom libs directory does not exist"
            exit 0
        fi
        
        echo "[custom-libs-cpp] Contents of custom libs dir:"
        ls -la "$CUSTOM_DIR" 2>/dev/null || echo "(empty)"
        
        mkdir -p "\$LIB_DIR" "\$INCLUDE_DIR"
        echo "[custom-libs-cpp] Created lib and include directories"
        
        for lib in "$CUSTOM_DIR"/*.so "$CUSTOM_DIR"/*.so.* "$CUSTOM_DIR"/*.a; do
            if [ -f "\$lib" ]; then
                cp "\$lib" "\$LIB_DIR/"
                echo "[custom-libs-cpp] ✓ Copied: \$(basename \$lib)"
            fi
        done
        
        for hdr in "$CUSTOM_DIR"/*.h "$CUSTOM_DIR"/*.hpp "$CUSTOM_DIR"/*.hxx; do
            if [ -f "\$hdr" ]; then
                cp "\$hdr" "\$INCLUDE_DIR/"
                echo "[custom-libs-cpp] ✓ Copied header: \$(basename \$hdr)"
            fi
        done
        
        for archive in "$CUSTOM_DIR"/*.tar.gz "$CUSTOM_DIR"/*.zip; do
            if [ ! -f "\$archive" ]; then
                continue
            fi
            filename=\$(basename "\$archive")
            echo "[custom-libs-cpp] Extracting: \$filename"
            
            tmpdir="/tmp/cpp_extract_\$\$"
            mkdir -p "\$tmpdir"
            
            if echo "\$filename" | grep -qE '\\.tar\\.gz$'; then
                tar -xzf "\$archive" -C "\$tmpdir" 2>&1 || echo "[custom-libs-cpp] Warning: tar extraction had issues"
            elif echo "\$filename" | grep -qE '\\.zip$'; then
                unzip -q -o "\$archive" -d "\$tmpdir" 2>&1 || echo "[custom-libs-cpp] Warning: unzip had issues"
            fi
            
            find "\$tmpdir" \\( -name "*.so" -o -name "*.so.*" -o -name "*.a" \\) -exec cp {} "\$LIB_DIR/" \\; 2>/dev/null || true
            find "\$tmpdir" \\( -name "*.h" -o -name "*.hpp" -o -name "*.hxx" \\) -exec cp {} "\$INCLUDE_DIR/" \\; 2>/dev/null || true
            
            for inc_dir in \$(find "\$tmpdir" -type d -name "include" 2>/dev/null); do
                echo "[custom-libs-cpp] Found include directory: \$inc_dir"
                cp -r "\$inc_dir"/* "\$INCLUDE_DIR/" 2>/dev/null || true
            done
            
            rm -rf "\$tmpdir"
            echo "[custom-libs-cpp] ✓ Extracted: \$filename"
        done
        
        echo "[custom-libs-cpp] Contents of lib/:"
        ls -la "\$LIB_DIR" 2>/dev/null || echo "(empty)"
        
        echo "[custom-libs-cpp] Contents of include/:"
        ls -la "\$INCLUDE_DIR" 2>/dev/null | head -20 || echo "(empty)"
        
        header_count=\$(find "\$INCLUDE_DIR" -type f 2>/dev/null | wc -l | tr -d ' ')
        echo "[custom-libs-cpp] Total headers installed: \$header_count"
        
        echo "[custom-libs-cpp] ✓ Complete - Use -I include/ -L lib/ to compile"
    `;
}

/**
 * Get extraction script for a specific language
 */
export function getExtractionScript(language: string, customLibDir: string, baseDir: string): string {
    switch (language) {
        case 'javascript':
            return getJavaScriptExtractionScript(customLibDir, baseDir);
        case 'python':
            return getPythonExtractionScript(customLibDir);
        case 'java':
            return getJavaExtractionScript(customLibDir, baseDir);
        case 'cpp':
            return getCppExtractionScript(customLibDir, baseDir);
        default:
            return '';
    }
}

/**
 * Auto-load custom libraries from project if none provided
 */
export async function autoLoadProjectLibraries(
    projectId: string,
    language: string,
    customLibraries?: CustomLibrary[]
): Promise<CustomLibrary[]> {
    if (customLibraries && customLibraries.length > 0) {
        return customLibraries;
    }

    try {
        const project = await Project.findById(projectId).lean();
        const libs = (project?.customLibraries || []) as any[];
        if (libs.length > 0) {
            const loadedLibs = libs.map((lib: any) => ({
                _id: lib._id,
                fileName: lib.fileName,
                originalName: lib.originalName,
                fileType: lib.fileType
            }));
            logger.info(`[project-execution] Auto-including ${loadedLibs.length} custom libraries for ${language} from project ${projectId}`);
            return loadedLibs;
        }
    } catch (e: any) {
        logger.warn(`[project-execution] Failed to load project libraries for ${projectId}: ${e?.message || e}`);
    }

    return [];
}

/**
 * Create custom libraries directory in container
 */
export async function createCustomLibsDirectory(
    container: Docker.Container,
    customLibDir: string
): Promise<boolean> {
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
            logger.error('[project-execution] Failed to create custom libs directory');
            return false;
        }
        logger.info('[project-execution] ✓ Custom libs directory created');
        return true;
    } catch (e: any) {
        logger.error(`[project-execution] Failed to create directory: ${e?.message || e}`);
        return false;
    }
}

/**
 * Copy a single library file to the container
 */
export async function copyLibraryToContainer(
    container: Docker.Container,
    customLibDir: string,
    libContent: Buffer,
    targetName: string
): Promise<boolean> {
    try {
        const pack = tar.pack();
        pack.entry({ name: targetName }, libContent);
        pack.finalize();

        const chunks: Buffer[] = [];
        for await (const chunk of pack) {
            chunks.push(chunk);
        }
        const tarBuffer = Buffer.concat(chunks);

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
            return false;
        }

        logger.info(`[project-execution] ✓ Successfully copied: ${targetName} (${libContent.length} bytes)`);
        return true;
    } catch (copyError: any) {
        logger.error(`[project-execution] putArchive failed for ${targetName}: ${copyError?.message || copyError}`);
        return false;
    }
}

/**
 * Copy all custom libraries from database to container
 */
export async function copyCustomLibrariesToContainer(
    container: Docker.Container,
    projectId: string,
    customLibraries: CustomLibrary[],
    language: string
): Promise<void> {
    if (!customLibraries || customLibraries.length === 0 || !projectId) {
        return;
    }

    logger.info(`[project-execution] Processing ${customLibraries.length} custom libraries for ${language} from DATABASE`);

    const customLibDir = `/custom-libs/${projectId}`;

    // Create directory
    const dirCreated = await createCustomLibsDirectory(container, customLibDir);
    if (!dirCreated) {
        return;
    }

    // Load project from database
    const project = await Project.findById(projectId).lean();
    if (!project) {
        logger.error(`[project-execution] Project ${projectId} not found in database`);
        return;
    }

    logger.info(`[project-execution] Found project with ${(project.customLibraries as any[] || []).length} libraries in database`);

    // Process each library
    for (const lib of customLibraries) {
        try {
            const libAny: any = lib;

            logger.info(`[project-execution] Looking for library: originalName="${lib.originalName}", fileName="${lib.fileName}", _id="${libAny?._id}"`);

            // Find library in project's customLibraries array
            const dbLib = (project.customLibraries as any[] || []).find((d: any) => {
                if (libAny?._id && d?._id) {
                    const libId = libAny._id.toString();
                    const dbId = d._id.toString();
                    if (libId === dbId) {
                        logger.info(`[project-execution] Matched library by _id: ${libId}`);
                        return true;
                    }
                }
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

            await copyLibraryToContainer(container, customLibDir, libContent, dbLib.originalName);
        } catch (error: any) {
            logger.error(`[project-execution] Error copying library ${lib.originalName}:`, error);
        }
    }
}

/**
 * Run the extraction script for custom libraries
 */
export async function extractCustomLibraries(
    container: Docker.Container,
    projectId: string,
    language: string,
    baseDir: string
): Promise<void> {
    const customLibDir = `/custom-libs/${projectId}`;
    const extractScript = getExtractionScript(language, customLibDir, baseDir);

    if (!extractScript) {
        return;
    }

    const logPrefix = language === 'javascript' ? 'js' : language;
    logger.info(`[project-execution] Extracting ${language} custom libraries`);

    const extractExec = await container.exec({
        Cmd: ['sh', '-c', extractScript],
        AttachStdout: true,
        AttachStderr: true
    });

    const extractStream = await extractExec.start({ hijack: true });

    await new Promise((resolve) => {
        extractStream.on('data', (chunk: Buffer) => {
            const output = chunk.toString();
            output.split('\n').forEach((line: string) => {
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

