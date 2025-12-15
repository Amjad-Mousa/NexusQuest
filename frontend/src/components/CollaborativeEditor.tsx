import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { useCollaboration } from '../context/CollaborationContext';
import { useTheme } from '../context/ThemeContext';
import { getStoredUser } from '../services/authService';
import { collaborationService } from '../services/collaborationService';
import { Users, MessageSquare, Send, Play, Square, Terminal as TerminalIcon, Crown, ArrowLeft, Code2, UserPlus, X, Search, Loader2, Circle, Check } from 'lucide-react';
import { Button } from './ui/button';
import type { editor } from 'monaco-editor';

interface AvailableUser {
  id: string;
  name: string;
  email: string;
  avatarImage?: string;
  level: number;
}

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
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sendingInvites, setSendingInvites] = useState(false);
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
    <div className={`flex h-full w-full ${theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-white text-gray-900'}`}>
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
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
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                setShowInviteDialog(true);
                setLoadingUsers(true);
                try {
                  const users = await collaborationService.getAvailableUsers(currentSession?.sessionId || '');
                  setAvailableUsers(users);
                } catch (error) {
                  console.error('Failed to load users:', error);
                } finally {
                  setLoadingUsers(false);
                }
              }}
              className="text-blue-500 hover:text-blue-400"
              title="Invite to session"
            >
              <UserPlus className="w-4 h-4" />
            </Button>
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
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Editor */}
          <div className={showTerminal ? 'flex-1 min-h-[200px]' : 'flex-1'}>
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

      {/* Right Sidebar - Participants */}
      {showParticipants && (
        <div
          className={`w-72 border-l flex flex-col flex-shrink-0 ${
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
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">Participants</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              theme === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
            }`}>
              {participants.length} online
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {participants.map((participant) => {
              const isCurrentUser = participant.userId === currentUser?.id;
              const isOwner = participant.role === 'owner';
              return (
                <div
                  key={participant.userId}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-all duration-200 ${
                    isCurrentUser
                      ? theme === 'dark'
                        ? 'bg-orange-500/10 border border-orange-500/30'
                        : 'bg-orange-50 border border-orange-200'
                      : theme === 'dark'
                      ? 'hover:bg-gray-800/50'
                      : 'hover:bg-gray-200'
                  }`}
                >
                  <div className="relative">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: participant.color || '#6366f1' }}
                    >
                      {participant.username?.charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-gray-900" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-medium text-sm truncate ${
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
                      {isOwner && <Crown className="w-3.5 h-3.5 text-yellow-500" />}
                    </div>
                    <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      {isOwner ? 'Session Owner' : 'Editor'}
                    </span>
                  </div>
                  <div
                    className="w-2 h-6 rounded-full"
                    style={{ backgroundColor: participant.color || '#6366f1' }}
                  />
                </div>
              );
            })}
            {participants.length === 0 && (
              <div className={`text-center py-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                <Users className="w-6 h-6 mx-auto mb-1 opacity-50" />
                <p className="text-sm">No participants yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Right Sidebar - Chat */}
      {showChat && (
        <div
          className={`w-80 border-l flex flex-col flex-shrink-0 ${
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
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm font-medium">Chat</span>
            </div>
            {messages.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-600'
              }`}>
                {messages.length}
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 ? (
              <div className={`text-center py-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                <MessageSquare className="w-6 h-6 mx-auto mb-1 opacity-50" />
                <p className="text-sm">No messages yet</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwnMessage = msg.userId === currentUser?.id;
                const participantColor = participants.find((p) => p.userId === msg.userId)?.color || '#6366f1';
                return (
                  <div key={msg._id} className={msg.type === 'system' ? 'text-center' : ''}>
                    {msg.type === 'system' ? (
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                        theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {msg.message}
                      </span>
                    ) : (
                      <div className={`flex gap-2 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                        <div
                          className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: participantColor }}
                        >
                          {msg.username?.charAt(0).toUpperCase()}
                        </div>
                        <div className={`flex-1 max-w-[80%] ${isOwnMessage ? 'text-right' : ''}`}>
                          <div className={`flex items-baseline gap-1.5 mb-0.5 ${isOwnMessage ? 'justify-end' : ''}`}>
                            <span className={`font-medium text-xs ${
                              isOwnMessage
                                ? theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
                                : theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              {isOwnMessage ? 'You' : msg.username}
                            </span>
                            <span className={`text-[10px] ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div
                            className={`inline-block px-3 py-1.5 rounded-xl text-sm ${
                              isOwnMessage
                                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                                : theme === 'dark'
                                ? 'bg-gray-800 text-gray-200'
                                : 'bg-gray-200 text-gray-800'
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
          <div className={`p-2 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
            <div className="flex gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className={`flex-1 px-3 py-1.5 rounded-lg border transition-all duration-200 focus:outline-none text-sm ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-orange-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-orange-500'
                }`}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!chatMessage.trim()}
                size="sm"
                className="px-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Dialog */}
      {showInviteDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${
              theme === 'dark' ? 'bg-gray-900' : 'bg-white'
            }`}
          >
            <div className={`px-6 py-4 border-b ${
              theme === 'dark' ? 'border-gray-800' : 'border-gray-100'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <UserPlus className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Invite Users</h2>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      Select users to invite to this session
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowInviteDialog(false);
                    setSelectedUsers([]);
                    setSearchQuery('');
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Search */}
            <div className={`px-6 py-3 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-100'}`}>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
              }`}>
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`flex-1 bg-transparent outline-none text-sm ${
                    theme === 'dark' ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'
                  }`}
                />
              </div>
            </div>

            {/* User List */}
            <div className="max-h-80 overflow-y-auto p-4">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : availableUsers.length === 0 ? (
                <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No users available to invite</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableUsers
                    .filter(user => 
                      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      user.email.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((user) => (
                      <div
                        key={user.id}
                        onClick={() => {
                          setSelectedUsers(prev => 
                            prev.includes(user.id)
                              ? prev.filter(id => id !== user.id)
                              : [...prev, user.id]
                          );
                        }}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                          selectedUsers.includes(user.id)
                            ? theme === 'dark'
                              ? 'bg-blue-500/20 border border-blue-500/50'
                              : 'bg-blue-50 border border-blue-200'
                            : theme === 'dark'
                            ? 'hover:bg-gray-800 border border-transparent'
                            : 'hover:bg-gray-100 border border-transparent'
                        }`}
                      >
                        <div className="relative">
                          {user.avatarImage ? (
                            <img
                              src={user.avatarImage}
                              alt={user.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className={`absolute -bottom-0.5 -right-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                            theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {user.level}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{user.name}</p>
                          <p className={`text-xs truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {user.email}
                          </p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          selectedUsers.includes(user.id)
                            ? 'bg-blue-500 border-blue-500'
                            : theme === 'dark' ? 'border-gray-600' : 'border-gray-300'
                        }`}>
                          {selectedUsers.includes(user.id) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`px-6 py-4 border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-100'}`}>
              <div className="flex items-center justify-between">
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
                </p>
                <Button
                  onClick={async () => {
                    if (selectedUsers.length === 0) return;
                    setSendingInvites(true);
                    try {
                      await collaborationService.sendInvitations(currentSession?.sessionId || '', selectedUsers);
                      setShowInviteDialog(false);
                      setSelectedUsers([]);
                      setSearchQuery('');
                      // Refresh available users
                      const users = await collaborationService.getAvailableUsers(currentSession?.sessionId || '');
                      setAvailableUsers(users);
                    } catch (error) {
                      console.error('Failed to send invitations:', error);
                      alert('Failed to send invitations');
                    } finally {
                      setSendingInvites(false);
                    }
                  }}
                  disabled={selectedUsers.length === 0 || sendingInvites}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 disabled:opacity-50"
                >
                  {sendingInvites ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send Invites
                </Button>
              </div>
            </div>
          </div>
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
