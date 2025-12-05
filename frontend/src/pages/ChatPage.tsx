import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import type { Socket } from 'socket.io-client';
import {
  connectChat,
  getChatSocket,
  disconnectChat,
  fetchConversation,
  sendDirectMessage,
  type ChatMessage,
} from '../services/chatService';
import { getStoredUser } from '../services/authService';

export function ChatPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
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

    s.on('dm:received', handleReceived as any);
    s.on('dm:sent', handleSent as any);

    return () => {
      const existing = getChatSocket();
      if (existing) {
        existing.off('dm:received', handleReceived as any);
        existing.off('dm:sent', handleSent as any);
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
              className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-lg ${{
                true: 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white',
                false: 'bg-gray-800/90 text-gray-50 border border-gray-700/50',
              }[String(isMine) as 'true' | 'false']}`}
            >
              <div className="text-sm leading-relaxed break-words">{m.content}</div>
              <div className={`text-[10px] mt-1.5 ${isMine ? 'text-emerald-100/70' : 'text-gray-400'}`}>
                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        );
      }),
    [messages, currentUserId]
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 px-6 py-4 border-b border-gray-800/50 flex items-center justify-between bg-gray-900/95 backdrop-blur-xl shadow-lg">
        <button
          type="button"
          className="text-sm text-gray-400 hover:text-white transition-colors font-medium"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-base font-semibold">{otherUserName}</h1>
          <span className="text-xs text-gray-500">Online</span>
        </div>
        <div className="w-16" />
      </header>

      {/* Messages Area */}
      <main className="flex-1 flex flex-col w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex-1 overflow-y-auto py-6">
          {renderedMessages}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-sm text-gray-400">No messages yet</p>
              <p className="text-xs text-gray-600 mt-1">Start the conversation!</p>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <div className="sticky bottom-0 py-4 bg-gradient-to-t from-gray-950 via-gray-950 to-transparent">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <input
                className="w-full px-5 py-3.5 rounded-3xl bg-gray-900/90 border border-gray-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all placeholder:text-gray-500 shadow-lg"
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
            </div>
            <button
              type="button"
              className="px-6 py-3.5 rounded-3xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-sm font-semibold shadow-lg shadow-emerald-600/30 transition-all hover:shadow-emerald-600/40 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              onClick={handleSend}
              disabled={!input.trim()}
            >
              Send
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ChatPage;