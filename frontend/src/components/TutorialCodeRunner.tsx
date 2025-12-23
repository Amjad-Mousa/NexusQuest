import { useState, useRef, useEffect } from 'react';
import { Play, Square, Copy, Check, Terminal, Code } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { getApiUrl } from '../utils/apiHelpers';

interface TerminalLine {
  type: 'output' | 'error';
  content: string;
}

interface TutorialCodeRunnerProps {
  code: string;
  language: string;
  theme?: 'dark' | 'light';
}

export default function TutorialCodeRunner({ code, language, theme = 'dark' }: TutorialCodeRunnerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [copied, setCopied] = useState(false);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLines]);

  // Map language names to backend format
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

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunCode = async () => {
    if (isRunning) return;

    const newSessionId = `tutorial-${Date.now()}`;
    setSessionId(newSessionId);
    setIsRunning(true);
    setShowTerminal(true);
    setTerminalLines([{ type: 'output', content: `▶️ Running ${language} code...\n` }]);

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
                setTerminalLines(prev => [...prev, { type: 'output', content: data.data || data.content }]);
              } else if (data.type === 'stderr' || data.type === 'error') {
                setTerminalLines(prev => [...prev, { type: 'error', content: data.data || data.content }]);
              } else if (data.type === 'end') {
                setTerminalLines(prev => [...prev, { type: 'output', content: '\n✓ Program finished\n' }]);
                setIsRunning(false);
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      // Process remaining buffer
      if (buffer.startsWith('data: ')) {
        try {
          const data = JSON.parse(buffer.substring(6));
          if (data.type === 'stdout' || data.type === 'output') {
            setTerminalLines(prev => [...prev, { type: 'output', content: data.data || data.content }]);
          } else if (data.type === 'stderr' || data.type === 'error') {
            setTerminalLines(prev => [...prev, { type: 'error', content: data.data || data.content }]);
          } else if (data.type === 'end') {
            setTerminalLines(prev => [...prev, { type: 'output', content: '\n✓ Program finished\n' }]);
          }
        } catch {
          // Ignore
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
    <div className="mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Code className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-lg">Code Example</h3>
        </div>
        <div className="flex items-center gap-2">
          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              theme === 'dark'
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>

          {/* Run/Stop Button */}
          {isRunning ? (
            <button
              onClick={handleStopCode}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-all"
            >
              <Square className="w-4 h-4" />
              Stop
            </button>
          ) : (
            <button
              onClick={handleRunCode}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg shadow-green-500/25 transition-all hover:scale-105"
            >
              <Play className="w-4 h-4" />
              Run Code
            </button>
          )}
        </div>
      </div>

      {/* Code Block */}
      <div className="relative rounded-xl overflow-hidden">
        <SyntaxHighlighter
          language={language}
          style={theme === 'dark' ? vscDarkPlus : vs}
          customStyle={{
            borderRadius: showTerminal ? '0.75rem 0.75rem 0 0' : '0.75rem',
            padding: '1.5rem',
            fontSize: '0.95rem',
            margin: 0,
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>

      {/* Terminal Output */}
      {showTerminal && (
        <div className={`rounded-b-xl border-t-0 overflow-hidden ${
          theme === 'dark' ? 'bg-gray-900 border border-gray-700' : 'bg-gray-100 border border-gray-300'
        }`}>
          {/* Terminal Header */}
          <div className={`px-4 py-2 flex items-center justify-between ${
            theme === 'dark' ? 'bg-gray-800 border-b border-gray-700' : 'bg-gray-200 border-b border-gray-300'
          }`}>
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
            {!isRunning && terminalLines.length > 1 && (
              <button
                onClick={() => setShowTerminal(false)}
                className={`text-xs px-2 py-1 rounded ${
                  theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-300 text-gray-600'
                }`}
              >
                Hide
              </button>
            )}
          </div>

          {/* Terminal Content */}
          <div className="max-h-64 overflow-y-auto p-4 font-mono text-sm">
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

          {/* Input Field (when running) */}
          {isRunning && (
            <form onSubmit={handleInputSubmit} className={`border-t p-2 ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-300'
            }`}>
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                >
                  Send
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
