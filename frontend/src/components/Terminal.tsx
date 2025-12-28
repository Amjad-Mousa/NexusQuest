import { useState, useEffect, useRef } from 'react';
import { getApiUrl } from '../utils/apiHelpers';

interface ProjectFileForExecution {
  name: string;
  content: string;
}

interface TerminalProps {
  height?: string;
  theme?: 'dark' | 'light';
  language: 'python' | 'java' | 'javascript' | 'cpp' | 'go';
  codeToExecute?: { code: string; timestamp: number; files?: ProjectFileForExecution[]; mainFile?: string; dependencies?: Record<string, string>; projectId?: string; customLibraries?: Array<{ fileName: string; originalName: string; fileType: string }> } | null;
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
  const lastExecutedTimestampRef = useRef<number | null>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  // Execute code when codeToExecute changes (prevent double execution in StrictMode)
  useEffect(() => {
    if (codeToExecute && codeToExecute.code && codeToExecute.timestamp !== lastExecutedTimestampRef.current) {
      lastExecutedTimestampRef.current = codeToExecute.timestamp;
      executeCodeInteractive(codeToExecute.code, codeToExecute.files, codeToExecute.mainFile);
    }
  }, [codeToExecute]);

  const executeCodeInteractive = async (code: string, files?: ProjectFileForExecution[], mainFile?: string) => {
    // Close any existing connections (cleanup from previous implementation)
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const sessionId = `session-${Date.now()}`;
    setCurrentSessionId(sessionId);
    setIsExecutingCode(true);

    const isMultiFile = files && files.length > 1;
    const { dependencies } = codeToExecute || {};
    
    console.log('[Terminal] Execute code:', { 
      files: files?.length, 
      mainFile, 
      dependencies,
      hasFiles: !!files,
      dependenciesCount: dependencies ? Object.keys(dependencies).length : 0 
    });
    
    setLines(prev => [...prev, {
      type: 'output',
      content: `\n▶️ Running ${language} ${isMultiFile ? 'project' : 'program'} (interactive mode)...`,
      timestamp: new Date()
    }]);

    try {
      // Determine which endpoint to use based on execution type
      let endpoint: string;
      let requestBody: Record<string, unknown> = { language, sessionId };

      // If we have files (project execution), use the streaming projects endpoint
      if (files && files.length > 0) {
        console.log('[Terminal] Using streaming container endpoint');
        endpoint = `${getApiUrl()}/api/projects/execute`;
        requestBody.files = files;
        requestBody.mainFile = mainFile || files[0].name;
        if (codeToExecute?.projectId) {
          requestBody.projectId = codeToExecute.projectId;
        }
        // Pass dependencies if they exist
        if (dependencies && Object.keys(dependencies).length > 0) {
          requestBody.dependencies = dependencies;
          console.log('[Terminal] Including dependencies:', dependencies);
        }
        // Pass custom libraries if they exist
        if (codeToExecute?.customLibraries && codeToExecute.customLibraries.length > 0) {
          requestBody.customLibraries = codeToExecute.customLibraries;
          console.log('[Terminal] Including custom libraries:', codeToExecute.customLibraries);
        }
      }

      console.log('[Terminal] Request endpoint:', endpoint);
      console.log('[Terminal] Request body:', requestBody);

      console.log('[Terminal] Sending request to:', endpoint);
      console.log('[Terminal] Request body keys:', Object.keys(requestBody));
      
      // Create abort controller with timeout (120 seconds for npm install)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn('[Terminal] Request timeout after 120 seconds');
        controller.abort();
      }, 120000);
      
      try {
        const startRes = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log('[Terminal] Response received:', startRes.status, startRes.statusText);

        if (!startRes.ok) {
          console.error('[Terminal] Fetch failed:', startRes.status, startRes.statusText);
          const errorText = await startRes.text();
          console.error('[Terminal] Error response:', errorText);
          throw new Error(`Failed to start execution: ${startRes.status} ${startRes.statusText}`);
        }

        // Check content-type to determine if it's streaming or JSON
        const contentType = startRes.headers.get('content-type') || '';
        const isStreaming = contentType.includes('text/event-stream');

        if (isStreaming) {
          // Handle streaming response (SSE)
          if (!startRes.body) throw new Error('No response body');

          const reader = startRes.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split('\n\n');
            
            // Keep the last part in buffer as it might be incomplete
            buffer = parts[parts.length - 1];

            // Process all complete messages
            for (let i = 0; i < parts.length - 1; i++) {
              const message = parts[i];
              if (message.startsWith('data: ')) {
                try {
                  const data = JSON.parse(message.substring(6));
                  
                  if (data.type === 'end') {
                    setLines(prev => [...prev, { 
                      type: 'output', 
                      content: '\n✓ Program finished', 
                      timestamp: new Date() 
                    }]);
                    setIsExecutingCode(false);
                    setCurrentSessionId(null);
                  } else if (data.type === 'stdout' || data.type === 'output') {
                    const content = data.data || data.content;
                    if (content) {
                      setLines(prev => [...prev, { 
                        type: 'output', 
                        content: content.trimEnd(), 
                        timestamp: new Date() 
                      }]);
                    }
                  } else if (data.type === 'stderr' || data.type === 'error') {
                    const content = data.data || data.content;
                    if (content) {
                      setLines(prev => [...prev, { 
                        type: 'error', 
                        content: content.trimEnd(), 
                        timestamp: new Date() 
                      }]);
                    }
                  }
                } catch (e) {
                  // Ignore parse errors
                }
              }
            }
          }

          // Process any remaining buffer content
          if (buffer.startsWith('data: ')) {
            try {
              const data = JSON.parse(buffer.substring(6));
              if (data.type === 'end') {
                setLines(prev => [...prev, { 
                  type: 'output', 
                  content: '\n✓ Program finished', 
                  timestamp: new Date() 
                }]);
                setIsExecutingCode(false);
                setCurrentSessionId(null);
              } else if (data.type === 'stdout' || data.type === 'output') {
                const content = data.data || data.content;
                if (content) {
                  setLines(prev => [...prev, { 
                    type: 'output', 
                    content: content.trimEnd(), 
                    timestamp: new Date() 
                  }]);
                }
              } else if (data.type === 'stderr' || data.type === 'error') {
                const content = data.data || data.content;
                if (content) {
                  setLines(prev => [...prev, { 
                    type: 'error', 
                    content: content.trimEnd(), 
                    timestamp: new Date() 
                  }]);
                }
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        } else {
          // Handle non-streaming JSON response (from /execution/run-project)
          const result = await startRes.json();
          
          console.log('[Terminal] Execution result:', result);
          
          if (result.output) {
            setLines(prev => [...prev, { 
              type: 'output', 
              content: result.output.trimEnd(), 
              timestamp: new Date() 
            }]);
          }
          
          if (result.error) {
            setLines(prev => [...prev, { 
              type: 'error', 
              content: result.error.trimEnd(), 
              timestamp: new Date() 
            }]);
          }
          
          setLines(prev => [...prev, { 
            type: 'output', 
            content: '\n✓ Program finished', 
            timestamp: new Date() 
          }]);
          setIsExecutingCode(false);
          setCurrentSessionId(null);
        }
      } catch (err) {
        // Abort controller timeout or other fetch error
        clearTimeout(timeoutId);
        throw err;
      }

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
      await fetch(`${getApiUrl()}/api/stream/stream-input`, {
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
      const response = await fetch(`${getApiUrl()}/api/terminal`, {
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
