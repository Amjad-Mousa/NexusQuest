const API_BASE_URL = 'http://localhost:9876';

export interface AiCompletionRequest {
  code: string;
  cursorPosition: { line: number; column: number };
  language?: string;
}

export interface AiCompletionResponse {
  success: boolean;
  suggestions: string[];
  isAiGenerated: boolean;
}

/**
 * Get AI-powered code completions from backend
 */
export async function getAiCompletions(request: AiCompletionRequest): Promise<string[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      console.warn('AI completion request failed:', response.statusText);
      return [];
    }

    const data: AiCompletionResponse = await response.json();
    return data.suggestions || [];
  } catch (error) {
    console.error('Error fetching AI completions:', error);
    return [];
  }
}

/**
 * Get inline AI suggestion
 */
export async function getInlineSuggestion(code: string, cursorLine: number, language: string = 'python'): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/inline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, cursorLine, language }),
    });

    if (!response.ok) {
      return '';
    }

    const data = await response.json();
    return data.suggestion || '';
  } catch (error) {
    console.error('Error fetching inline suggestion:', error);
    return '';
  }
}

/**
 * Get AI suggestions for fixing an error
 */
export async function getErrorSuggestions(error: string, code: string, language: string = 'python'): Promise<{ explanation: string; suggestions: string[] }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/error-suggestions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error, code, language }),
    });

    if (!response.ok) {
      return { explanation: '', suggestions: [] };
    }

    const data = await response.json();
    return {
      explanation: data.explanation || '',
      suggestions: data.suggestions || [],
    };
  } catch (err) {
    console.error('Error fetching error suggestions:', err);
    return { explanation: '', suggestions: [] };
  }
}

/**
 * Get AI explanation for selected code
 */
export async function explainCode(code: string, language: string = 'python'): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/explain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, language }),
    });

    if (!response.ok) {
      return 'Unable to explain code at this time.';
    }

    const data = await response.json();
    return data.explanation || 'No explanation available.';
  } catch (err) {
    console.error('Error explaining code:', err);
    return 'Unable to explain code at this time.';
  }
}
