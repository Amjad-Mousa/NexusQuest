import { useState, useRef, useEffect } from 'react';
import { CheckCircle, XCircle, Play, Square, Trophy, Lightbulb, Terminal, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { CodeEditor } from './CodeEditor';
import { getApiUrl } from '../utils/apiHelpers';

interface PracticeQuestion {
  question: string;
  starterCode: string;
  expectedOutput: string;
  hint?: string;
  points?: number;
}

interface TerminalLine {
  type: 'output' | 'error';
  content: string;
}

interface PracticeExerciseProps {
  question: PracticeQuestion;
  language: string;
  theme?: 'dark' | 'light';
  onCorrectAnswer: (points: number) => void;
  onWrongAnswer: () => void;
  isAnswered?: boolean;
  wasCorrect?: boolean;
}

export default function PracticeExercise({ 
  question, 
  language,
  theme = 'dark', 
  onCorrectAnswer, 
  onWrongAnswer,
  isAnswered = false,
  wasCorrect = false
}: PracticeExerciseProps) {
  const [code, setCode] = useState(question.starterCode.replace(/\\n/g, '\n'));
  const [isRunning, setIsRunning] = useState(false);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [showTerminal, setShowTerminal] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(isAnswered);
  const [isCorrect, setIsCorrect] = useState(wasCorrect);
  const [showHint, setShowHint] = useState(false);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const points = question.points || 10;

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLines]);

  const getBackendLanguage = (lang: string): string => {
    const map: Record<string, string> = {
      'javascript': 'javascript',
      'python': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c++': 'cpp',
    };
    return map[lang.toLowerCase()] || 'python';
  };

  const handleRunCode = async () => {
    if (isRunning || hasAnswered) return;

    const newSessionId = `practice-${Date.now()}`;
    setSessionId(newSessionId);
    setIsRunning(true);
    setShowTerminal(true);
    setTerminalLines([{ type: 'output', content: `▶️ Running your code...\n` }]);

    let fullOutput = '';

    try {
      const response = await fetch(`${getApiUrl()}/api/playground/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language: getBackendLanguage(language),
          sessionId: newSessionId
        })
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts[parts.length - 1];

        for (let i = 0; i < parts.length - 1; i++) {
          const message = parts[i];
          if (message.startsWith('data: ')) {
            try {
              const data = JSON.parse(message.substring(6));
              
              if (data.type === 'stdout' || data.type === 'output') {
                const content = data.data || data.content;
                fullOutput += content;
                setTerminalLines(prev => [...prev, { type: 'output', content }]);
              } else if (data.type === 'stderr' || data.type === 'error') {
                const content = data.data || data.content;
                setTerminalLines(prev => [...prev, { type: 'error', content }]);
              } else if (data.type === 'end') {
                // Check if output matches expected
                const trimmedOutput = fullOutput.trim();
                const trimmedExpected = question.expectedOutput.trim();
                const correct = trimmedOutput === trimmedExpected;
                
                setIsCorrect(correct);
                setHasAnswered(true);
                
                if (correct) {
                  setTerminalLines(prev => [...prev, { type: 'output', content: `\n✅ Correct! +${points} points\n` }]);
                  onCorrectAnswer(points);
                } else {
                  setTerminalLines(prev => [...prev, { 
                    type: 'error', 
                    content: `\n❌ Incorrect. Expected output: "${trimmedExpected}"\nYour output: "${trimmedOutput}"\n` 
                  }]);
                  onWrongAnswer();
                }
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      setIsRunning(false);
    } catch (error) {
      setTerminalLines(prev => [...prev, { 
        type: 'error', 
        content: `Error: ${error instanceof Error ? error.message : 'Failed to execute code'}\n` 
      }]);
      setIsRunning(false);
    }
  };

  const handleStopCode = () => {
    setIsRunning(false);
    setTerminalLines(prev => [...prev, { type: 'error', content: '\n⏹ Execution stopped\n' }]);
  };

  const handleRetry = () => {
    setHasAnswered(false);
    setIsCorrect(false);
    setShowTerminal(false);
    setTerminalLines([]);
  };

  const handleInputSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !sessionId) return;

    setTerminalLines(prev => [...prev, { type: 'output', content: input + '\n' }]);

    try {
      await fetch(`${getApiUrl()}/api/playground/input`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          input: input
        })
      });
      setInput('');
    } catch (error) {
      setTerminalLines(prev => [...prev, { 
        type: 'error', 
        content: `Failed to send input: ${error instanceof Error ? error.message : 'Unknown error'}\n` 
      }]);
    }
  };

  return (
    <div className={`rounded-xl overflow-hidden ${
      theme === 'dark' ? 'bg-gray-800/50 border border-gray-700' : 'bg-gray-50 border border-gray-200'
    }`}>
      {/* Header */}
      <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-100'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              hasAnswered
                ? isCorrect
                  ? 'bg-green-500/20'
                  : 'bg-red-500/20'
                : 'bg-purple-500/20'
            }`}>
              {hasAnswered ? (
                isCorrect ? (
                  <Trophy className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )
              ) : (
                <Terminal className="w-5 h-5 text-purple-500" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-lg">Practice Challenge</h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Write code to earn {points} points
              </p>
            </div>
          </div>
          
          {/* Hint Button */}
          {question.hint && !showHint && !hasAnswered && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHint(true)}
              className="flex items-center gap-2"
            >
              <Lightbulb className="w-4 h-4" />
              Show Hint
            </Button>
          )}
        </div>

        {/* Question */}
        <div className={`mt-4 p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-900/50' : 'bg-white'}`}>
          <p className={`font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
            📝 {question.question}
          </p>
        </div>

        {/* Hint */}
        {showHint && question.hint && (
          <div className={`mt-3 p-3 rounded-lg ${theme === 'dark' ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-yellow-50 border border-yellow-200'}`}>
            <p className={`text-sm flex items-center gap-2 ${theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700'}`}>
              <Lightbulb className="w-4 h-4" />
              <span><strong>Hint:</strong> {question.hint}</span>
            </p>
          </div>
        )}
      </div>

      {/* Code Editor */}
      <div className="h-64">
        <CodeEditor
          value={code}
          language={language}
          onChange={(value) => setCode(value || '')}
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
          height="100%"
        />
      </div>

      {/* Action Buttons */}
      <div className={`p-3 border-t flex items-center justify-between ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-100'}`}>
        <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Expected output: <code className={`px-2 py-1 rounded ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>{question.expectedOutput}</code>
        </div>
        
        <div className="flex gap-2">
          {hasAnswered && !isCorrect && (
            <Button
              variant="outline"
              onClick={handleRetry}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          )}
          
          {isRunning ? (
            <Button
              onClick={handleStopCode}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Square className="w-4 h-4 mr-2" />
              Stop
            </Button>
          ) : (
            <Button
              onClick={handleRunCode}
              disabled={hasAnswered && isCorrect}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white disabled:opacity-50"
            >
              <Play className="w-4 h-4 mr-2" />
              Run Code
            </Button>
          )}
        </div>
      </div>

      {/* Terminal Output */}
      {showTerminal && (
        <div className={`border-t ${theme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
          <div className={`px-4 py-2 flex items-center justify-between ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">Output</span>
            </div>
            {isRunning && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-500">Running...</span>
              </div>
            )}
          </div>

          <div className="max-h-48 overflow-y-auto p-4 font-mono text-sm">
            {terminalLines.map((line, index) => (
              <div
                key={index}
                className={`whitespace-pre-wrap ${
                  line.type === 'error' ? 'text-red-400' : theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                {line.content}
              </div>
            ))}
            <div ref={terminalEndRef} />
          </div>

          {/* Input Field */}
          {isRunning && (
            <form onSubmit={handleInputSubmit} className={`border-t p-2 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter input..."
                  className={`flex-1 px-3 py-2 rounded font-mono text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    theme === 'dark'
                      ? 'bg-gray-800 text-white placeholder-gray-500 border-gray-700'
                      : 'bg-white text-gray-900 placeholder-gray-400 border-gray-300'
                  }`}
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium"
                >
                  Send
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Success Message */}
      {hasAnswered && isCorrect && (
        <div className={`p-4 border-t ${theme === 'dark' ? 'border-gray-700 bg-green-500/10' : 'border-gray-200 bg-green-50'}`}>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="font-bold text-green-500">🎉 Great job! You earned {points} points!</span>
          </div>
        </div>
      )}
    </div>
  );
}
