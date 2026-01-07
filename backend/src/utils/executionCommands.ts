export const languageImages: Record<string, string> = {
    python: 'nexusquest-python',
    java: 'nexusquest-java',
    javascript: 'nexusquest-javascript',
    cpp: 'nexusquest-cpp',
};

/**
 * Get the execution command for a specific language
 */
export function getExecutionCommand(
    language: string,
    baseDir: string,
    files: Array<{ name: string; content: string }>,
    mainFile: string
): string {
    switch (language) {
        case 'python':
            return `cd ${baseDir} && python ${mainFile}`;

        case 'java': {
            const javaFiles = files.filter(f => f.name.endsWith('.java')).map(f => f.name).join(' ');
            return `cd ${baseDir} && javac -cp ".:lib/*" ${javaFiles} && java -cp ".:lib/*" ${mainFile.replace('.java', '')}`;
        }

        case 'javascript':
            return `cd ${baseDir} && node ${mainFile}`;

        case 'cpp': {
            const cppFiles = files.filter(f => f.name.endsWith('.cpp')).map(f => f.name).join(' ');
            return `cd ${baseDir} && g++ -std=c++20 -I. -Iinclude -Llib ${cppFiles} -o a.out 2>&1 && LD_LIBRARY_PATH="./lib:$LD_LIBRARY_PATH" ./a.out`;
        }

        default:
            throw new Error(`Unsupported language: ${language}`);
    }
}

/**
 * Check if a project needs network access for dependencies
 */
export function needsNetworkAccess(
    language: string,
    dependencies: Record<string, string> | undefined,
    files: Array<{ name: string; content: string }>
): boolean {
    if (dependencies && Object.keys(dependencies).length > 0) {
        return true;
    }

    if (!files) return false;

    switch (language) {
        case 'javascript':
            return files.some(f => f.name === 'package.json');
        case 'python':
            return files.some(f => f.name === 'requirements.txt');
        case 'cpp':
            return files.some(f =>
                f.name === 'conanfile.txt' ||
                f.name === 'conanfile.py' ||
                (f.name === 'CMakeLists.txt' && /find_package\s*\(\s*(\w+)/.test(f.content))
            );
        case 'java':
            return files.some(f => f.name === 'pom.xml');
        default:
            return false;
    }
}

