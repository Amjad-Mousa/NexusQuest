import { Router } from 'express';
import { executeCode } from '../services/dockerService.js';
import { logger } from '../utils/logger.js';
import { validateCode } from '../middleware/validation.js';

export const codeExecutionRouter = Router();

// Execute code endpoint
codeExecutionRouter.post('/run', validateCode, async (req, res) => {
  const { code, language = 'python' } = req.body;

  try {
    logger.info(`Executing ${language} code`);
    
    const result = await executeCode(code, language);
    
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

// Get supported languages
codeExecutionRouter.get('/languages', (req, res) => {
  res.json({
    languages: [
      {
        name: 'python',
        version: '3.10',
        extensions: ['.py'],
        supported: true
      },
      {
        name: 'java',
        version: '17',
        extensions: ['.java'],
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