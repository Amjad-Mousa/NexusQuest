export function validateCode(req, res, next) {
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
    // Check for potentially dangerous operations
    const dangerousPatterns = [
        /import\s+os/i,
        /import\s+subprocess/i,
        /import\s+sys/i,
        /import\s+socket/i,
        /import\s+urllib/i,
        /import\s+requests/i,
        /exec\s*\(/i,
        /eval\s*\(/i,
        /open\s*\(/i,
        /__import__/i,
        /\bfile\b/i,
        /\bdir\b/i,
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
    const supportedLanguages = ['python'];
    if (language && !supportedLanguages.includes(language.toLowerCase())) {
        return res.status(400).json({
            success: false,
            error: `Language '${language}' is not supported. Supported languages: ${supportedLanguages.join(', ')}`,
            output: ''
        });
    }
    next();
}
//# sourceMappingURL=validation.js.map