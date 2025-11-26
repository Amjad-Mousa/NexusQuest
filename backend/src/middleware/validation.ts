import { Request, Response, NextFunction } from 'express';

export function validateCode(req: Request, res: Response, next: NextFunction) {
  const { code, language } = req.body;

  // Check if code is provided
  if (!code || typeof code !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Code is required and must be a string',
      output: ''
    });
  }

  // Check code length (prevent very large payloads)
  if (code.length > 50000) { // 50KB limit
    return res.status(400).json({
      success: false,
      error: 'Code is too long (maximum 50KB allowed)',
      output: ''
    });
  }

  // Check for extremely dangerous operations only
  // Note: Docker isolation provides the main security layer
  const dangerousPatterns = [
    /import\s+subprocess/i,
    /import\s+socket/i,
    /exec\s*\(/i,
    /eval\s*\(/i,
    /__import__/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(code)) {
      return res.status(400).json({
        success: false,
        error: 'Code contains potentially dangerous operations that are not allowed',
        output: ''
      });
    }
  }

  // Validate language
  const supportedLanguages = ['python', 'java', 'javascript', 'js', 'cpp', 'c++', 'go', 'golang'];
  if (language && !supportedLanguages.includes(language.toLowerCase())) {
    return res.status(400).json({
      success: false,
      error: `Language '${language}' is not supported. Supported languages: ${supportedLanguages.join(', ')}`,
      output: ''
    });
  }

  // Check for interactive input (Scanner, input()) - warn user
  if (language === 'java' && /Scanner.*nextInt|nextDouble|nextLine|next\(\)/.test(code)) {
    // Just a warning, don't block execution
    console.warn('⚠️ Code uses Scanner for input. This may cause issues in non-interactive environment.');
  }
  
  if (language === 'python' && /input\s*\(/.test(code)) {
    console.warn('⚠️ Code uses input() function. This may cause issues in non-interactive environment.');
  }

  next();
}