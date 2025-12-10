import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { useCollaboration } from '../context/CollaborationContext';
import { useTheme } from '../context/ThemeContext';
import { Users, MessageSquare, Settings, X, Send, UserX } from 'lucide-react';
import { Button } from './ui/button';
import type { editor } from 'monaco-editor';

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
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const isRemoteChange = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handle editor mount
  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;

    // Listen for cursor position changes
    editor.onDidChangeCursorPosition((e) => {
      if (!currentSession || isRemoteChange.current) return;

      const user = JSON.parse(localStorage.getItem('user') || '{}');
      sendCursorMove({
        sessionId: currentSession.sessionId,
        userId: user.id,
        username: user.username,
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

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    sendCodeChange({
      sessionId: currentSession.sessionId,
      userId: user.id,
      username: user.username,
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
        .filter((p) => p.cursor && p.userId !== JSON.parse(localStorage.getItem('user') || '{}').id)
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

  return (
    <div className="flex h-full">
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div
          className={`flex items-center justify-between px-4 py-2 border-b ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">{currentSession?.name}</h2>
            <span
              className={`px-2 py-1 rounded text-xs ${
                theme === 'dark'
                  ? 'bg-green-900 text-green-300'
                  : 'bg-green-100 text-green-800'
              }`}
            >
              {participants.length} Online
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowParticipants(!showParticipants)}
            >
              <Users className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowChat(!showChat)}
            >
              <MessageSquare className="w-4 h-4" />
              {messages.length > 0 && (
                <span className="ml-1 text-xs">({messages.length})</span>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={leaveSession}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1">
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
      </div>

      {/* Participants Sidebar */}
      {showParticipants && (
        <div
          className={`w-64 border-l ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}
        >
          <div className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Participants ({participants.length})
            </h3>
            <div className="space-y-2">
              {participants.map((participant) => (
                <div
                  key={participant.userId}
                  className={`flex items-center gap-2 p-2 rounded ${
                    theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: participant.color }}
                  />
                  <span className="flex-1 text-sm">{participant.username}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      theme === 'dark'
                        ? 'bg-gray-700 text-gray-300'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {participant.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Chat Sidebar */}
      {showChat && (
        <div
          className={`w-80 border-l flex flex-col ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}
        >
          <div className="p-4 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Chat
            </h3>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg._id}
                className={`${
                  msg.type === 'system'
                    ? 'text-center text-sm text-gray-500 italic'
                    : ''
                }`}
              >
                {msg.type !== 'system' && (
                  <div className="flex items-start gap-2">
                    <div
                      className="w-2 h-2 rounded-full mt-1.5"
                      style={{
                        backgroundColor:
                          participants.find((p) => p.userId === msg.userId)?.color ||
                          '#888',
                      }}
                    />
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-sm">{msg.username}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{msg.message}</p>
                    </div>
                  </div>
                )}
                {msg.type === 'system' && <p>{msg.message}</p>}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className={`flex-1 px-3 py-2 rounded border ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300'
                }`}
              />
              <Button onClick={handleSendMessage} size="sm">
                <Send className="w-4 h-4" />
              </Button>
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
