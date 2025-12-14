import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import type { Socket } from 'socket.io-client';
import {
  connectChat,
  getChatSocket,
  disconnectChat,
  fetchConversation,
  sendDirectMessage,
  emitTyping,
  emitStopTyping,
  type ChatMessage,
} from '../services/chatService';
import { getStoredUser } from '../services/authService';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, Send, MessageCircle } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';

export function ChatPage() {
  usePageTitle('Chat');
  const { theme } = useTheme();
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navState = (location.state as { userName?: string; userEmail?: string } | null) || null;
  const [otherUserName] = useState<string>(navState?.userName || 'Direct Messages');

  useEffect(() => {
    const currentUser = getStoredUser();
    if (!currentUser) {
      navigate('/login');
      return;
    }

    setCurrentUserId(currentUser.id);

    if (!userId) {
      navigate('/dashboard');
      return;
    }

    fetchConversation(userId).then((initialMessages) => {
      setMessages(initialMessages);
    });

    const s = connectChat();
    if (!s) {
      navigate('/login');
      return;
    }

    setSocket(s);

    const handleReceived = (message: ChatMessage) => {
      if (message.senderId !== userId && message.recipientId !== userId) {
        return;
      }
      setMessages((prev) => [...prev, message]);
    };

    const handleSent = (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
    };

    const handleTyping = (data: { fromUserId: string }) => {
      if (data.fromUserId === userId) {
        setIsOtherUserTyping(true);
      }
    };

    const handleStopTyping = (data: { fromUserId: string }) => {
      if (data.fromUserId === userId) {
        setIsOtherUserTyping(false);
      }
    };

    s.on('dm:received', handleReceived as any);
    s.on('dm:sent', handleSent as any);
    s.on('user-typing', handleTyping as any);
    s.on('user-stop-typing', handleStopTyping as any);

    return () => {
      const existing = getChatSocket();
      if (existing) {
        existing.off('dm:received', handleReceived as any);
        existing.off('dm:sent', handleSent as any);
        existing.off('user-typing', handleTyping as any);
        existing.off('user-stop-typing', handleStopTyping as any);
      }
      disconnectChat();
    };
  }, [userId, navigate]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = () => {
    if (!socket || !userId || !input.trim()) return;
    sendDirectMessage(userId, input.trim());
    setInput('');
  };

  const renderedMessages = useMemo(
    () =>
      messages.map((m) => {
        const isMine = currentUserId === m.senderId;
        return (
          <div
            key={m.id + m.createdAt}
            className={`flex w-full mb-3 ${isMine ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-lg ${
                isMine
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
                  : theme === 'dark'
                    ? 'bg-gray-800/90 text-gray-50 border border-gray-700/50'
                    : 'bg-white text-gray-900 border border-gray-200 shadow-md'
              }`}
            >
              <div className="text-sm leading-relaxed break-words">{m.content}</div>
              <div className={`text-[10px] mt-1.5 ${
                isMine
                  ? 'text-emerald-100/70'
                  : theme === 'dark'
                    ? 'text-gray-400'
                    : 'text-gray-500'
              }`}>
                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        );
      }),
    [messages, currentUserId, theme]
  );

  return (
    <div className={`min-h-screen flex flex-col relative ${
      theme === 'dark'
        ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white'
        : 'bg-gradient-to-br from-gray-50 via-white to-gray-50 text-gray-900'
    }`}>
      {/* Subtle Background */}
      {theme === 'dark' && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
        </div>
      )}
      
      {/* Header */}
      <header className={`sticky top-0 z-10 px-6 py-4 border-b flex items-center justify-between backdrop-blur-xl shadow-sm ${
        theme === 'dark'
          ? 'border-gray-800/50 bg-gray-950/80'
          : 'border-gray-200 bg-white/80'
      }`}>
        <button
          type="button"
          className={`flex items-center gap-2 text-sm font-medium transition-colors ${
            theme === 'dark'
              ? 'text-gray-400 hover:text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex flex-col items-center">
          <h1 className={`text-base font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {otherUserName}
          </h1>
          <span className={`text-xs flex items-center gap-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            Online
          </span>
        </div>
        <div className="w-16" />
      </header>

      {/* Messages Area */}
      <main className="flex-1 flex flex-col w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex-1 overflow-y-auto py-6">
          {renderedMessages}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 py-20">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-4 ${
                theme === 'dark'
                  ? 'bg-emerald-500/10 border border-emerald-500/20'
                  : 'bg-emerald-50 border border-emerald-200'
              }`}>
                <MessageCircle className={`w-10 h-10 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
              </div>
              <p className={`text-lg font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                No messages yet
              </p>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                Start the conversation!
              </p>
            </div>
          )}
          {isOtherUserTyping && (
            <div className="flex w-full mb-3 justify-start">
              <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                theme === 'dark'
                  ? 'bg-gray-800/90 border border-gray-700/50'
                  : 'bg-white border border-gray-200 shadow-sm'
              }`}>
                <div className="flex gap-1">
                  <span className={`w-2 h-2 rounded-full animate-bounce ${theme === 'dark' ? 'bg-gray-400' : 'bg-gray-500'}`} style={{ animationDelay: '0ms' }}></span>
                  <span className={`w-2 h-2 rounded-full animate-bounce ${theme === 'dark' ? 'bg-gray-400' : 'bg-gray-500'}`} style={{ animationDelay: '150ms' }}></span>
                  <span className={`w-2 h-2 rounded-full animate-bounce ${theme === 'dark' ? 'bg-gray-400' : 'bg-gray-500'}`} style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <div className={`sticky bottom-0 py-4 ${
          theme === 'dark'
            ? 'bg-gradient-to-t from-gray-950 via-gray-950/95 to-transparent'
            : 'bg-gradient-to-t from-gray-50 via-gray-50/95 to-transparent'
        }`}>
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <input
                className={`w-full px-5 py-3.5 rounded-2xl text-sm outline-none transition-all shadow-lg ${
                  theme === 'dark'
                    ? 'bg-gray-900/90 border border-gray-800 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500'
                    : 'bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 shadow-md'
                }`}
                placeholder="Type your message..."
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (userId) {
                    emitTyping(userId);
                    if (typingTimeoutRef.current) {
                      clearTimeout(typingTimeoutRef.current);
                    }
                    typingTimeoutRef.current = setTimeout(() => {
                      emitStopTyping(userId);
                    }, 1000);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                    if (userId) emitStopTyping(userId);
                  }
                }}
              />
            </div>
            <button
              type="button"
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-sm font-semibold shadow-lg shadow-emerald-600/30 transition-all duration-300 hover:shadow-emerald-600/40 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
              onClick={handleSend}
              disabled={!input.trim()}
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ChatPage;