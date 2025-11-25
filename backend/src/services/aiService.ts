import OpenAI from 'openai';

// Initialize OpenAI client (will use API key from environment variable)
let openai: OpenAI | null = null;

try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
} catch (error) {
  console.warn('⚠️ OpenAI API not configured. AI completions will use fallback suggestions.');
}

interface CompletionRequest {
  code: string;
  cursorPosition: { line: number; column: number };
  language: string;
}

interface CompletionResponse {
  suggestions: string[];
  isAiGenerated: boolean;
}

/**
 * Get AI-powered code completions
 */
export async function getAiCompletions(request: CompletionRequest): Promise<CompletionResponse> {
  // If OpenAI is not configured, return smart fallback suggestions
  if (!openai) {
    return getFallbackCompletions(request);
  }

  try {
    const { code, cursorPosition, language } = request;
    
    // Extract context around cursor
    const lines = code.split('\n');
    const currentLine = lines[cursorPosition.line] || '';
    const beforeCursor = lines.slice(Math.max(0, cursorPosition.line - 5), cursorPosition.line + 1).join('\n');
    
    // Create language-specific prompt
    const languageName = language === 'java' ? 'Java' : 'Python';
    const prompt = `You are an AI code completion assistant. Given the ${languageName} code context, suggest the next line(s) of code.
Only return the code suggestion, no explanations.

Context:
${beforeCursor}

Suggest the next line of code that would logically follow. Keep it concise (1-3 lines max).`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: `You are a helpful ${languageName} code completion assistant. Only respond with code, no explanations.` },
        { role: 'user', content: prompt }
      ],
      max_tokens: 100,
      temperature: 0.3,
      n: 3, // Get 3 suggestions
    });

    const suggestions = completion.choices
      .map(choice => choice.message.content?.trim() || '')
      .filter(s => s.length > 0);

    return {
      suggestions,
      isAiGenerated: true,
    };
  } catch (error) {
    console.error('AI completion error:', error);
    return getFallbackCompletions(request);
  }
}

/**
 * Java-specific fallback completions
 */
function getJavaFallbackCompletions(code: string, currentLine: string): CompletionResponse {
  const suggestions: string[] = [];

  // After main method declaration
  if (currentLine.includes('public static void main')) {
    suggestions.push(
      '        System.out.println("Hello, World!");',
      '        // Your code here',
      '        Scanner scanner = new Scanner(System.in);'
    );
  }
  
  // After class declaration
  else if (currentLine.includes('class ') && currentLine.endsWith('{')) {
    suggestions.push(
      '    public static void main(String[] args) {\n        \n    }',
      '    private int value;\n    \n    public void setValue(int value) {\n        this.value = value;\n    }',
      '    // Add your methods here'
    );
  }
  
  // After for loop
  else if (currentLine.includes('for ') && currentLine.endsWith('{')) {
    suggestions.push(
      '            System.out.println(i);',
      '            // Process item',
      '            result.add(i);'
    );
  }
  
  // After if statement
  else if (currentLine.includes('if ') && currentLine.endsWith('{')) {
    suggestions.push(
      '            return true;',
      '            System.out.println("Condition met");',
      '            // Handle condition'
    );
  }
  
  // Method declaration
  else if (currentLine.includes('public ') && currentLine.endsWith('{')) {
    suggestions.push(
      '        // TODO: Implement method',
      '        return null;',
      '        throw new UnsupportedOperationException("Not implemented");'
    );
  }
  
  // Try-catch
  else if (currentLine.trim() === 'try {') {
    suggestions.push(
      '            // Your code here\n        } catch (Exception e) {\n            e.printStackTrace();\n        }',
      '            // Code that might throw exception\n        } catch (IOException e) {\n            System.err.println("IO Error: " + e.getMessage());\n        }'
    );
  }
  
  // System.out
  else if (currentLine.includes('System.out.println')) {
    suggestions.push(
      'System.out.println("Value: " + value);',
      'System.out.println("Hello, World!");',
      'System.out.println(result);'
    );
  }
  
  // Default suggestions
  else {
    if (!code.includes('System.out.println')) {
      suggestions.push('System.out.println("Hello, World!");');
    }
    if (!code.includes('Scanner')) {
      suggestions.push('Scanner scanner = new Scanner(System.in);');
    }
    if (!code.includes('ArrayList')) {
      suggestions.push('ArrayList<String> list = new ArrayList<>();');
    }
  }

  return {
    suggestions: suggestions.slice(0, 3),
    isAiGenerated: false,
  };
}

/**
 * Fallback completions when AI is not available
 * Smart pattern-based suggestions
 */
function getFallbackCompletions(request: CompletionRequest): CompletionResponse {
  const { code, cursorPosition, language } = request;
  const lines = code.split('\n');
  const currentLine = (lines[cursorPosition.line] || '').trim();
  const suggestions: string[] = [];

  // Java-specific patterns
  if (language === 'java') {
    return getJavaFallbackCompletions(code, currentLine);
  }

  // Python pattern-based intelligent suggestions
  
  // After for loop, suggest body
  if (currentLine.startsWith('for ') && currentLine.endsWith(':')) {
    suggestions.push('    print(item)', '    result.append(item)', '    process(item)');
  }
  
  // After function definition, suggest docstring and body
  else if (currentLine.startsWith('def ') && currentLine.endsWith(':')) {
    const funcName = currentLine.match(/def\s+(\w+)/)?.[1] || 'function';
    suggestions.push(
      `    """${funcName} description"""\n    pass`,
      `    """TODO: Implement ${funcName}"""\n    return None`,
      '    pass'
    );
  }
  
  // After if statement, suggest common patterns
  else if (currentLine.startsWith('if ') && currentLine.endsWith(':')) {
    suggestions.push('    return True', '    pass', '    result = True');
  }
  
  // After class definition, suggest __init__
  else if (currentLine.startsWith('class ') && currentLine.endsWith(':')) {
    suggestions.push(
      '    def __init__(self):\n        pass',
      '    def __init__(self, name):\n        self.name = name',
      '    pass'
    );
  }
  
  // After try, suggest except
  else if (currentLine === 'try:') {
    suggestions.push('    # Your code here\n    pass\nexcept Exception as e:\n    print(f"Error: {e}")');
  }
  
  // List/dict operations
  else if (currentLine.includes('[') && !currentLine.includes(']')) {
    suggestions.push('1, 2, 3, 4, 5]', '"item1", "item2", "item3"]', ']');
  }
  
  // Print statements
  else if (currentLine.startsWith('print(')) {
    suggestions.push('f"Value: {value}")', '"Hello, World!")', 'result)');
  }
  
  // Variable assignments - suggest common next steps
  else if (currentLine.includes('=') && !currentLine.includes('==')) {
    const varName = currentLine.split('=')[0].trim();
    suggestions.push(
      `print(${varName})`,
      `if ${varName}:`,
      `return ${varName}`
    );
  }
  
  // Default suggestions based on common patterns
  else {
    // Analyze what's in the code to make smart suggestions
    if (!code.includes('print(')) {
      suggestions.push('print("Hello, World!")');
    }
    if (!code.includes('def ') && code.split('\n').length > 5) {
      suggestions.push('def main():\n    pass');
    }
    if (!code.includes('if __name__')) {
      suggestions.push('if __name__ == "__main__":\n    main()');
    }
  }

  return {
    suggestions: suggestions.slice(0, 3), // Limit to 3 suggestions
    isAiGenerated: false,
  };
}

/**
 * Get inline AI suggestion for the current context
 * This provides a single, most likely completion
 */
export async function getInlineSuggestion(code: string, cursorLine: number, language: string = 'python'): Promise<string> {
  const completions = await getAiCompletions({
    code,
    cursorPosition: { line: cursorLine, column: 0 },
    language: language,
  });

  return completions.suggestions[0] || '';
}
