import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { useCollaboration } from '../context/CollaborationContext';
import { useTheme } from '../context/ThemeContext';
import { getStoredUser } from '../services/authService';
import { Users, MessageSquare, Send, Play, Square, Terminal as TerminalIcon, Crown, Circle, ArrowLeft, Code2 } from 'lucide-react';
import { Button } from './ui/button';
import type { editor } from 'monaco-editor';

interface TerminalLine {
  type: 'output' | 'error';
  content: string;
}

interface CollaborativeEditorProps {
  sessionId: string;
  initialCode?: string;
  language?: string;
  onCodeChange?: (code: string) => void;
}

export default function CollaborativeEditor({
  sessionId,
  initialCode = '',
  language = 'javascript',
  onCodeChange,
}: CollaborativeEditorProps) {
  const { theme } = useTheme();
  const {
    currentSession,
    participants,
    messages,
    userColor,
    sendCodeChange,
    sendCursorMove,
    sendMessage,
    onCodeChange: onRemoteCodeChange,
    onCursorMove: onRemoteCursorMove,
    leaveSession,
  } = useCollaboration();

  const [code, setCode] = useState(initialCode);
  const [chatMessage, setChatMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(true);
  const [showTerminal, setShowTerminal] = useState(true);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const isRemoteChange = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Handle editor mount
  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;

    // Listen for cursor position changes
    editor.onDidChangeCursorPosition((e) => {
      if (!currentSession || isRemoteChange.current) return;

      const user = getStoredUser();
      if (!user) return;
      sendCursorMove({
        sessionId: currentSession.sessionId,
        userId: user.id,
        username: user.name,
        cursor: {
          line: e.position.lineNumber,
          column: e.position.column,
        },
        color: userColor,
      });
    });
  };

  // Handle local code changes
  const handleCodeChange = (value: string | undefined) => {
    if (!value || isRemoteChange.current) return;

    const newCode = value;
    setCode(newCode);
    onCodeChange?.(newCode);

    if (!currentSession) return;

    const user = getStoredUser();
    if (!user) return;
    sendCodeChange({
      sessionId: currentSession.sessionId,
      userId: user.id,
      username: user.name,
      changes: {
        from: { line: 0, ch: 0 },
        to: { line: 0, ch: 0 },
        text: newCode.split('\n'),
      },
      timestamp: Date.now(),
    });
  };

  // Handle remote code changes
  useEffect(() => {
    const unsubscribe = onRemoteCodeChange((change) => {
      isRemoteChange.current = true;
      setCode(change.changes.text.join('\n'));
      setTimeout(() => {
        isRemoteChange.current = false;
      }, 100);
    });

    return unsubscribe;
  }, [onRemoteCodeChange]);

  // Handle remote cursor movements
  useEffect(() => {
    const unsubscribe = onRemoteCursorMove((cursor) => {
      if (!editorRef.current) return;

      // Remove old decorations
      decorationsRef.current = editorRef.current.deltaDecorations(
        decorationsRef.current,
        []
      );

      // Add new cursor decorations for all participants
      const newDecorations = participants
        .filter((p) => p.cursor && p.userId !== getStoredUser()?.id)
        .map((p) => ({
          range: new (window as any).monaco.Range(
            p.cursor!.line,
            p.cursor!.column,
            p.cursor!.line,
            p.cursor!.column + 1
          ),
          options: {
            className: 'remote-cursor',
            glyphMarginClassName: 'remote-cursor-glyph',
            hoverMessage: { value: p.username },
            beforeContentClassName: 'remote-cursor-label',
            stickiness: 1,
            zIndex: 100,
            inlineClassName: `remote-cursor-inline`,
            inlineClassNameAffectsLetterSpacing: true,
          },
        }));

      decorationsRef.current = editorRef.current.deltaDecorations(
        [],
        newDecorations
      );
    });

    return unsubscribe;
  }, [onRemoteCursorMove, participants]);

  // Scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle send message
  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;
    sendMessage(chatMessage);
    setChatMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Scroll terminal to bottom
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLines]);

  // Map language to backend format
  const getBackendLanguage = (lang: string) => {
    const langMap: Record<string, string> = {
      javascript: 'javascript',
      typescript: 'javascript',
      python: 'python',
      java: 'java',
      cpp: 'cpp',
      'c++': 'cpp',
      c: 'cpp',
    };
    return langMap[lang.toLowerCase()] || 'javascript';
  };

  // Run code
  const handleRunCode = async () => {
    if (isRunning || !code.trim()) return;

    setIsRunning(true);
    setTerminalLines([{ type: 'output', content: `▶️ Running ${language} code...\n` }]);

    try {
      const response = await fetch('http://localhost:9876/api/playground/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language: getBackendLanguage(language),
          sessionId: `collab-${Date.now()}`
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
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      setTerminalLines(prev => [...prev, { 
        type: 'error', 
        content: `Error: ${error instanceof Error ? error.message : 'Failed to execute code'}\n` 
      }]);
    } finally {
      setIsRunning(false);
    }
  };

  // Stop code execution
  const handleStopCode = () => {
    setIsRunning(false);
    setTerminalLines(prev => [...prev, { type: 'error', content: '\n⏹ Execution stopped\n' }]);
  };

  const currentUser = getStoredUser();

  return (
    <div className={`flex h-full ${theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-white text-gray-900'}`}>
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div
          className={`flex items-center justify-between px-4 py-3 border-b ${
            theme === 'dark'
              ? 'bg-gray-900/80 border-gray-800 backdrop-blur-xl'
              : 'bg-white/80 border-gray-200 backdrop-blur-xl'
          }`}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={leaveSession}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark' ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Code2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold">{currentSession?.name}</h2>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {currentSession?.language}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-gray-500" />
                  <div className="flex items-center gap-1">
                    <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                    <span className={`text-xs ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                      {participants.length} online
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Run/Stop Button */}
            {isRunning ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleStopCode}
                className="shadow-lg shadow-red-500/20"
              >
                <Square className="w-4 h-4 mr-1" />
                Stop
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={handleRunCode}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-lg shadow-green-500/20"
              >
                <Play className="w-4 h-4 mr-1" />
                Run
              </Button>
            )}
            <div className={`h-6 w-px ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'}`} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTerminal(!showTerminal)}
              className={`${showTerminal ? (theme === 'dark' ? 'bg-gray-800 text-orange-400' : 'bg-gray-200 text-orange-600') : ''}`}
            >
              <TerminalIcon className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowParticipants(!showParticipants)}
              className={`${showParticipants ? (theme === 'dark' ? 'bg-gray-800 text-orange-400' : 'bg-gray-200 text-orange-600') : ''}`}
            >
              <Users className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowChat(!showChat)}
              className={`relative ${showChat ? (theme === 'dark' ? 'bg-gray-800 text-orange-400' : 'bg-gray-200 text-orange-600') : ''}`}
            >
              <MessageSquare className="w-4 h-4" />
              {messages.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {messages.length > 9 ? '9+' : messages.length}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Editor and Terminal Container */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor */}
          <div className={showTerminal ? 'h-[60%]' : 'flex-1'}>
            <Editor
              height="100%"
              language={language}
              value={code}
              onChange={handleCodeChange}
              onMount={handleEditorDidMount}
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
              }}
            />
          </div>

          {/* Terminal */}
          {showTerminal && (
            <div
              className={`h-[40%] border-t flex flex-col ${
                theme === 'dark'
                  ? 'bg-gray-900 border-gray-700'
                  : 'bg-gray-100 border-gray-300'
              }`}
            >
              <div
                className={`flex items-center justify-between px-3 py-1 border-b ${
                  theme === 'dark' ? 'border-gray-700' : 'border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <TerminalIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">Output</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTerminalLines([])}
                  className="h-6 px-2 text-xs"
                >
                  Clear
                </Button>
              </div>
              <div
                className={`flex-1 overflow-y-auto p-3 font-mono text-sm ${
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                }`}
              >
                {terminalLines.length === 0 ? (
                  <span className="text-gray-500">
                    Click "Run" to execute your code...
                  </span>
                ) : (
                  terminalLines.map((line, index) => (
                    <div
                      key={index}
                      className={`whitespace-pre-wrap ${
                        line.type === 'error' ? 'text-red-400' : ''
                      }`}
                    >
                      {line.content}
                    </div>
                  ))
                )}
                <div ref={terminalEndRef} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Participants & Chat */}
      {(showParticipants || showChat) && (
        <div
          className={`w-80 border-l flex flex-col ${
            theme === 'dark'
              ? 'bg-gray-900/80 border-gray-800 backdrop-blur-xl'
              : 'bg-white/80 border-gray-200 backdrop-blur-xl'
          }`}
        >
          {/* Participants Section */}
          {showParticipants && (
            <div className={`${showChat ? 'border-b' : ''} ${
              theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
            }`}>
              <div className={`px-4 py-3 border-b ${
                theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <Users className="w-4 h-4 text-white" />
                    </div>
                    <span>Participants</span>
                  </h3>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    theme === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                  }`}>
                    {participants.length} online
                  </span>
                </div>
              </div>
              <div className={`p-3 space-y-1 ${showChat ? 'max-h-48 overflow-y-auto' : 'flex-1 overflow-y-auto'}`}>
                {participants.map((participant) => {
                  const isCurrentUser = participant.userId === currentUser?.id;
                  const isOwner = participant.role === 'owner';
                  
                  return (
                    <div
                      key={participant.userId}
                      className={`flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 ${
                        isCurrentUser
                          ? theme === 'dark'
                            ? 'bg-orange-500/10 border border-orange-500/30'
                            : 'bg-orange-50 border border-orange-200'
                          : theme === 'dark'
                          ? 'hover:bg-gray-800/50'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg"
                          style={{ backgroundColor: participant.color || '#6366f1' }}
                        >
                          {participant.username?.charAt(0).toUpperCase()}
                        </div>
                        {/* Online indicator */}
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-gray-900" />
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-semibold text-sm truncate ${
                            isCurrentUser ? (theme === 'dark' ? 'text-orange-400' : 'text-orange-600') : ''
                          }`}>
                            {participant.username}
                          </span>
                          {isCurrentUser && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              theme === 'dark' ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'
                            }`}>
                              You
                            </span>
                          )}
                          {isOwner && (
                            <Crown className="w-3.5 h-3.5 text-yellow-500" />
                          )}
                        </div>
                        <span className={`text-xs ${
                          theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                        }`}>
                          {isOwner ? 'Session Owner' : 'Editor'}
                        </span>
                      </div>
                      
                      {/* Cursor color indicator */}
                      <div
                        className="w-2 h-8 rounded-full"
                        style={{ backgroundColor: participant.color || '#6366f1' }}
                        title="Cursor color"
                      />
                    </div>
                  );
                })}
                
                {participants.length === 0 && (
                  <div className={`text-center py-8 ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No participants yet</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Chat Section */}
          {showChat && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className={`px-4 py-3 border-b ${
                theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
              }`}>
                <h3 className="font-bold flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-white" />
                  </div>
                  <span>Chat</span>
                  {messages.length > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {messages.length}
                    </span>
                  )}
                </h3>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className={`text-center py-8 ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No messages yet</p>
                    <p className="text-xs mt-1">Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwnMessage = msg.userId === currentUser?.id;
                    const participantColor = participants.find((p) => p.userId === msg.userId)?.color || '#6366f1';
                    
                    return (
                      <div
                        key={msg._id}
                        className={`${
                          msg.type === 'system'
                            ? 'text-center'
                            : ''
                        }`}
                      >
                        {msg.type === 'system' ? (
                          <span className={`inline-block px-3 py-1 rounded-full text-xs ${
                            theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {msg.message}
                          </span>
                        ) : (
                          <div className={`flex gap-2.5 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                            {/* Avatar */}
                            <div
                              className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-md"
                              style={{ backgroundColor: participantColor }}
                            >
                              {msg.username?.charAt(0).toUpperCase()}
                            </div>
                            
                            {/* Message bubble */}
                            <div className={`flex-1 max-w-[80%] ${isOwnMessage ? 'text-right' : ''}`}>
                              <div className={`flex items-baseline gap-2 mb-1 ${isOwnMessage ? 'justify-end' : ''}`}>
                                <span className={`font-semibold text-xs ${
                                  isOwnMessage
                                    ? theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
                                    : theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                                }`}>
                                  {isOwnMessage ? 'You' : msg.username}
                                </span>
                                <span className={`text-[10px] ${
                                  theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
                                }`}>
                                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div
                                className={`inline-block px-3.5 py-2 rounded-2xl text-sm ${
                                  isOwnMessage
                                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-br-md'
                                    : theme === 'dark'
                                    ? 'bg-gray-800 text-gray-200 rounded-bl-md'
                                    : 'bg-gray-100 text-gray-800 rounded-bl-md'
                                }`}
                              >
                                {msg.message}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className={`p-3 border-t ${
                theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
              }`}>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className={`flex-1 px-4 py-2.5 rounded-xl border-2 transition-all duration-200 focus:outline-none ${
                      theme === 'dark'
                        ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-orange-500'
                        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-orange-500'
                    }`}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!chatMessage.trim()}
                    className="px-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Custom CSS for cursors */}
      <style>{`
        .remote-cursor {
          border-left: 2px solid var(--cursor-color, #ff6b6b);
          animation: blink 1s infinite;
        }
        
        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
