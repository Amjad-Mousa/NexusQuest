import { Router } from 'express';
import { executeCode, executeProject, ProjectFile } from '../services/dockerService.js';
import { logger } from '../utils/logger.js';
import { validateCode } from '../middleware/validation.js';

export const codeExecutionRouter = Router();

// Execute single file code endpoint
codeExecutionRouter.post('/run', validateCode, async (req, res) => {
  const { code, language = 'python', input } = req.body;

  try {
    logger.info(`Executing ${language} code${input ? ' with input' : ''}`);

    const result = await executeCode(code, language, input);

    res.json({
      success: true,
      output: result.output,
      error: result.error,
      executionTime: result.executionTime
    });
  } catch (error) {
    logger.error('Code execution failed:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error during code execution',
      output: ''
    });
  }
});

// Execute multi-file project endpoint
codeExecutionRouter.post('/run-project', async (req, res) => {
  const { files, mainFile, language, input, dependencies } = req.body as {
    files: ProjectFile[];
    mainFile: string;
    language: string;
    input?: string;
    dependencies?: Record<string, string>;
  };

  // Validate request
  if (!files || !Array.isArray(files) || files.length === 0) {
    res.status(400).json({
      success: false,
      error: 'No files provided',
      output: ''
    });
    return;
  }

  if (!mainFile) {
    res.status(400).json({
      success: false,
      error: 'No main file specified',
      output: ''
    });
    return;
  }

  if (!language) {
    res.status(400).json({
      success: false,
      error: 'No language specified',
      output: ''
    });
    return;
  }

  // Check if main file exists in files array
  const mainFileExists = files.some(f => f.name === mainFile);
  if (!mainFileExists) {
    res.status(400).json({
      success: false,
      error: `Main file "${mainFile}" not found in project files`,
      output: ''
    });
    return;
  }

  try {
    logger.info(`Executing ${language} project with ${files.length} files, main: ${mainFile}`);

    const result = await executeProject({
      files,
      mainFile,
      language,
      input,
      dependencies
    });

    res.json({
      success: true,
      output: result.output,
      error: result.error,
      executionTime: result.executionTime
    });
  } catch (error) {
    logger.error('Project execution failed:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error during project execution',
      output: ''
    });
  }
});

// Get supported languages
codeExecutionRouter.get('/languages', (req, res) => {
  res.json({
    languages: [
      {
        name: 'python',
        version: '3.10',
        extensions: ['.py'],
        frameworks: ['Flask', 'NumPy', 'Pandas', 'Requests'],
        supported: true
      },
      {
        name: 'javascript',
        version: '20',
        extensions: ['.js'],
        frameworks: ['Express', 'Axios', 'Lodash', 'Moment'],
        supported: true
      },
      {
        name: 'java',
        version: '17',
        extensions: ['.java'],
        frameworks: ['Maven'],
        supported: true
      },
      {
        name: 'cpp',
        version: 'C++20',
        extensions: ['.cpp'],
        frameworks: ['STL', 'CMake'],
        supported: true
      }
    ]
  });
});

// Check Docker status
codeExecutionRouter.get('/docker/status', async (req, res) => {
  try {
    const { checkDockerStatus } = await import('../services/dockerService.js');
    const status = await checkDockerStatus();
    res.json(status);
  } catch (error) {
    res.json({
      available: false,
      error: 'Docker check failed'
    });
  }
});