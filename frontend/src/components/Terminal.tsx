import { useState, useEffect, useRef } from 'react';

interface ProjectFileForExecution {
  name: string;
  content: string;
}

interface TerminalProps {
  height?: string;
  theme?: 'dark' | 'light';
  language: 'python' | 'java' | 'javascript' | 'cpp' | 'go';
  codeToExecute?: { code: string; timestamp: number; files?: ProjectFileForExecution[]; mainFile?: string } | null;
}

interface TerminalLine {
  type: 'command' | 'output' | 'error';
  content: string;
  timestamp: Date;
}

export function Terminal({ height = '400px', theme = 'dark', language, codeToExecute }: TerminalProps) {
  const getWelcomeMessage = () => {
    switch (language) {
      case 'python':
        return 'Type Python expressions or statements. Example: print("Hello World")';
      case 'javascript':
        return 'Type JavaScript expressions. Example: console.log("Hello World")';
      case 'java':
        return 'Type shell commands. Example: javac --version';
      case 'cpp':
        return 'Type shell commands. Example: g++ --version';
      case 'go':
        return 'Type shell commands. Example: go version';
      default:
        return 'Type commands to execute in the container...';
    }
  };

  const [lines, setLines] = useState<TerminalLine[]>([
    { type: 'output', content: `NexusQuest Terminal - ${language.toUpperCase()} Environment`, timestamp: new Date() },
    { type: 'output', content: getWelcomeMessage(), timestamp: new Date() },
  ]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isExecutingCode, setIsExecutingCode] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  // Execute code when codeToExecute changes
  useEffect(() => {
    if (codeToExecute && codeToExecute.code) {
      executeCodeInteractive(codeToExecute.code, codeToExecute.files, codeToExecute.mainFile);
    }
  }, [codeToExecute]);

  const executeCodeInteractive = async (code: string, files?: ProjectFileForExecution[], mainFile?: string) => {
    // Close any existing EventSource connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const sessionId = `session-${Date.now()}`;
    setCurrentSessionId(sessionId);
    setIsExecutingCode(true);

    const isMultiFile = files && files.length > 1;
    setLines(prev => [...prev, {
      type: 'output',
      content: `\n▶️ Running ${language} ${isMultiFile ? 'project' : 'program'} (interactive mode)...`,
      timestamp: new Date()
    }]);

    try {
      // Start execution - send files if available for multi-file projects
      const requestBody: Record<string, unknown> = { language, sessionId };
      if (files && files.length > 0) {
        requestBody.files = files;
        requestBody.mainFile = mainFile;
      } else {
        requestBody.code = code;
      }

      const startRes = await fetch('http://localhost:9876/api/stream/stream-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!startRes.ok) throw new Error('Failed to start execution');

      // Listen to output stream
      const eventSource = new EventSource(`http://localhost:9876/api/stream/stream-output/${sessionId}`);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'end') {
          setLines(prev => [...prev, { 
            type: 'output', 
            content: '\n✓ Program finished', 
            timestamp: new Date() 
          }]);
          setIsExecutingCode(false);
          setCurrentSessionId(null);
          eventSource.close();
        } else {
          const content = data.data;
          if (content) {
            setLines(prev => [...prev, { 
              type: data.type === 'stderr' ? 'error' : 'output', 
              content: content.trimEnd(), 
              timestamp: new Date() 
            }]);
          }
        }
      };

      eventSource.onerror = () => {
        setLines(prev => [...prev, { 
          type: 'error', 
          content: 'Connection error', 
          timestamp: new Date() 
        }]);
        setIsExecutingCode(false);
        setCurrentSessionId(null);
        eventSource.close();
      };

    } catch (error) {
      setLines(prev => [...prev, { 
        type: 'error', 
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        timestamp: new Date() 
      }]);
      setIsExecutingCode(false);
      setCurrentSessionId(null);
    }
  };

  const sendInput = async (input: string) => {
    if (!currentSessionId) return;

    try {
      await fetch('http://localhost:9876/api/stream/stream-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSessionId, input })
      });
    } catch (error) {
      setLines(prev => [...prev, { 
        type: 'error', 
        content: `Failed to send input: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        timestamp: new Date() 
      }]);
    }
  };

  // Update welcome message when language changes
  useEffect(() => {
    setLines([
      { type: 'output', content: `NexusQuest Terminal - ${language.toUpperCase()} Environment`, timestamp: new Date() },
      { type: 'output', content: getWelcomeMessage(), timestamp: new Date() },
    ]);
    setCommandHistory([]);
    setHistoryIndex(-1);
  }, [language]);

  const executeCommand = async (command: string) => {
    if (!command.trim()) return;

    // Add command to history
    setCommandHistory(prev => [...prev, command]);
    setHistoryIndex(-1);

    // Add command to terminal
    setLines(prev => [...prev, { type: 'command', content: command, timestamp: new Date() }]);

    try {
      const response = await fetch('http://localhost:9876/api/terminal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: command.trim(),
          language,
        }),
      });

      const result = await response.json();

      if (result.error) {
        setLines(prev => [...prev, { type: 'error', content: result.error, timestamp: new Date() }]);
      } else {
        const output = result.output || '';
        if (output) {
          setLines(prev => [...prev, { type: 'output', content: output, timestamp: new Date() }]);
        }
      }
    } catch (error) {
      setLines(prev => [...prev, {
        type: 'error',
        content: `Failed to execute command: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      }]);
    }

    setCurrentCommand('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // If executing code interactively, send as input
      if (isExecutingCode && currentSessionId) {
        // Echo input as plain output (no prompt prefix)
        setLines(prev => [...prev, { type: 'output', content: currentCommand, timestamp: new Date() }]);
        sendInput(currentCommand);
        setCurrentCommand('');
      } else {
        // Otherwise execute as shell command
        executeCommand(currentCommand);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCurrentCommand('');
        } else {
          setHistoryIndex(newIndex);
          setCurrentCommand(commandHistory[newIndex]);
        }
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setLines([
        { type: 'output', content: `NexusQuest Terminal - ${language.toUpperCase()} Environment`, timestamp: new Date() },
        { type: 'output', content: 'Type commands to execute in the container...', timestamp: new Date() },
      ]);
    }
  };

  const getPrompt = () => {
    switch (language) {
      case 'python': return 'python>';
      case 'java': return 'java>';
      case 'javascript': return 'node>';
      case 'cpp': return 'cpp>';
      case 'go': return 'go>';
      default: return '>';
    }
  };

  return (
    <div
      className={`font-mono text-sm overflow-auto ${
        theme === 'dark'
          ? 'bg-gray-900 text-green-400'
          : 'bg-gray-50 text-gray-900'
      }`}
      style={{ height }}
      onClick={() => inputRef.current?.focus()}
    >
      <div className="p-4">
        {lines.map((line, index) => (
          <div key={index} className="mb-1">
            {line.type === 'command' && (
              <div className={theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}>
                <span className={theme === 'dark' ? 'text-green-500' : 'text-green-700'}>{getPrompt()}</span>{' '}
                {line.content}
              </div>
            )}
            {line.type === 'output' && (
              <div className="whitespace-pre-wrap">{line.content}</div>
            )}
            {line.type === 'error' && (
              <div className={theme === 'dark' ? 'text-red-400' : 'text-red-600'}>
                {line.content}
              </div>
            )}
          </div>
        ))}
        <div className="flex items-center">
          <span className={theme === 'dark' ? 'text-green-500' : 'text-green-700'}>{getPrompt()}</span>
          <input
            ref={inputRef}
            type="text"
            value={currentCommand}
            onChange={(e) => setCurrentCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`flex-1 ml-2 bg-transparent outline-none ${
              theme === 'dark' ? 'text-green-400' : 'text-gray-900'
            }`}
            autoFocus
            spellCheck={false}
          />
        </div>
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
}
