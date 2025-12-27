import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';

/**
 * Saves dependencies to the project's package manager file
 * - For JavaScript: creates/updates package.json
 * - For Python: creates/updates requirements.txt
 */
export async function saveDependenciesToProject(
  projectPath: string,
  language: string,
  dependencies: Record<string, string>
): Promise<{ success: boolean; filePath: string; error?: string }> {
  try {
    if (!dependencies || Object.keys(dependencies).length === 0) {
      logger.info('[dependencyService] No dependencies to save');
      return {
        success: true,
        filePath: '',
        error: 'No dependencies provided'
      };
    }

    // Ensure project directory exists
    await fs.mkdir(projectPath, { recursive: true });

    if (language.toLowerCase() === 'javascript') {
      return await saveJavaScriptDependencies(projectPath, dependencies);
    } else if (language.toLowerCase() === 'python') {
      return await savePythonDependencies(projectPath, dependencies);
    } else if (language.toLowerCase() === 'java') {
      return await saveJavaDependencies(projectPath, dependencies);
    } else if (language.toLowerCase() === 'cpp' || language.toLowerCase() === 'c++') {
      return await saveCppDependencies(projectPath, dependencies);
    } else {
      return {
        success: false,
        filePath: '',
        error: `Unsupported language for dependency persistence: ${language}`
      };
    }
  } catch (error: any) {
    logger.error('[dependencyService] Error saving dependencies:', error);
    return {
      success: false,
      filePath: '',
      error: error.message || 'Failed to save dependencies'
    };
  }
}

/**
 * Saves JavaScript dependencies to package.json
 */
async function saveJavaScriptDependencies(
  projectPath: string,
  dependencies: Record<string, string>
): Promise<{ success: boolean; filePath: string; error?: string }> {
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    let packageJson: any = {
      name: 'nexusquest-project',
      version: '1.0.0',
      description: 'NexusQuest Project',
      main: 'index.js',
      scripts: {
        start: 'node index.js'
      },
      dependencies: {}
    };

    // If package.json exists, read and update it
    try {
      const existing = await fs.readFile(packageJsonPath, 'utf-8');
      packageJson = JSON.parse(existing);
    } catch (err) {
      logger.info('[dependencyService] Creating new package.json');
    }

    // Merge dependencies
    packageJson.dependencies = {
      ...packageJson.dependencies,
      ...dependencies
    };

    // Write package.json
    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    logger.info(`[dependencyService] Saved dependencies to package.json in ${projectPath}`);

    return {
      success: true,
      filePath: packageJsonPath
    };
  } catch (error: any) {
    logger.error('[dependencyService] Error saving JavaScript dependencies:', error);
    return {
      success: false,
      filePath: '',
      error: error.message || 'Failed to save package.json'
    };
  }
}

/**
 * Saves Python dependencies to requirements.txt
 */
async function savePythonDependencies(
  projectPath: string,
  dependencies: Record<string, string>
): Promise<{ success: boolean; filePath: string; error?: string }> {
  try {
    const requirementsPath = path.join(projectPath, 'requirements.txt');
    let existingDeps: Record<string, string> = {};

    // If requirements.txt exists, read existing dependencies
    try {
      const existing = await fs.readFile(requirementsPath, 'utf-8');
      existing.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [pkg, version] = trimmed.split('==');
          if (pkg) {
            existingDeps[pkg] = version || '*';
          }
        }
      });
    } catch (err) {
      logger.info('[dependencyService] Creating new requirements.txt');
    }

    // Merge dependencies
    const allDeps = { ...existingDeps, ...dependencies };

    // Format requirements.txt
    const requirementsContent = Object.entries(allDeps)
      .map(([pkg, version]) => {
        if (version === '*' || !version) {
          return pkg;
        }
        return `${pkg}==${version}`;
      })
      .sort()
      .join('\n');

    // Write requirements.txt
    await fs.writeFile(requirementsPath, requirementsContent + '\n');
    logger.info(`[dependencyService] Saved dependencies to requirements.txt in ${projectPath}`);

    return {
      success: true,
      filePath: requirementsPath
    };
  } catch (error: any) {
    logger.error('[dependencyService] Error saving Python dependencies:', error);
    return {
      success: false,
      filePath: '',
      error: error.message || 'Failed to save requirements.txt'
    };
  }
}

/**
 * Saves Java dependencies to pom.xml or build.gradle
 */
async function saveJavaDependencies(
  projectPath: string,
  dependencies: Record<string, string>
): Promise<{ success: boolean; filePath: string; error?: string }> {
  try {
    const pomPath = path.join(projectPath, 'pom.xml');

    // Check if pom.xml exists
    try {
      await fs.access(pomPath);
      // For now, we'll just log that Maven is detected
      logger.info('[dependencyService] Maven project detected (pom.xml exists)');
      logger.info('[dependencyService] Java dependencies should be added manually to pom.xml');
      return {
        success: true,
        filePath: pomPath,
        error: 'Java dependency management requires manual pom.xml updates'
      };
    } catch (err) {
      // No pom.xml, create a simple build configuration file
      const depsComment = `// Dependencies to add manually or via your build tool:\n${Object.entries(dependencies)
        .map(([pkg, version]) => `// ${pkg}:${version}`)
        .join('\n')}`;

      const buildPropsPath = path.join(projectPath, 'DEPENDENCIES.txt');
      await fs.writeFile(buildPropsPath, depsComment);

      logger.info(`[dependencyService] Saved Java dependencies reference to DEPENDENCIES.txt`);
      return {
        success: true,
        filePath: buildPropsPath,
        error: 'Java projects require manual dependency configuration'
      };
    }
  } catch (error: any) {
    logger.error('[dependencyService] Error saving Java dependencies:', error);
    return {
      success: false,
      filePath: '',
      error: error.message || 'Failed to save Java dependencies'
    };
  }
}

/**
 * Saves C++ dependencies information
 */
async function saveCppDependencies(
  projectPath: string,
  dependencies: Record<string, string>
): Promise<{ success: boolean; filePath: string; error?: string }> {
  try {
    const cmakelists = path.join(projectPath, 'CMakeLists.txt');
    const depsPath = path.join(projectPath, 'DEPENDENCIES.txt');

    // Create a documentation file with dependencies
    const depsContent = `# C++ Dependencies\n\nThe following dependencies should be installed:\n\n${Object.entries(dependencies)
      .map(([pkg, version]) => `- ${pkg} (${version || 'latest'})`)
      .join('\n')}`;

    await fs.writeFile(depsPath, depsContent);
    logger.info(`[dependencyService] Saved C++ dependencies reference to DEPENDENCIES.txt`);

    return {
      success: true,
      filePath: depsPath,
      error: 'C++ dependency management requires system package manager'
    };
  } catch (error: any) {
    logger.error('[dependencyService] Error saving C++ dependencies:', error);
    return {
      success: false,
      filePath: '',
      error: error.message || 'Failed to save C++ dependencies'
    };
  }
}

/**
 * Gets the current dependencies from a project's package manager file
 */
export async function getDependenciesFromProject(
  projectPath: string,
  language: string
): Promise<Record<string, string>> {
  try {
    if (language.toLowerCase() === 'javascript') {
      const packageJsonPath = path.join(projectPath, 'package.json');
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content);
      return packageJson.dependencies || {};
    } else if (language.toLowerCase() === 'python') {
      const requirementsPath = path.join(projectPath, 'requirements.txt');
      const content = await fs.readFile(requirementsPath, 'utf-8');
      const deps: Record<string, string> = {};
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [pkg, version] = trimmed.split('==');
          if (pkg) {
            deps[pkg] = version || '*';
          }
        }
      });
      return deps;
    }
    return {};
  } catch (error) {
    logger.warn('[dependencyService] Error reading dependencies:', error);
    return {};
  }
}

