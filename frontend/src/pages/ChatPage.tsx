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
            className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-md border ${{
                true: 'bg-emerald-600 text-white border-emerald-500',
                false: 'bg-gray-800 text-gray-100 border-gray-700',
              }[String(isMine) as 'true' | 'false']}`}
            >
              <div className="text-[10px] opacity-70 mb-1 text-right">
                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div>{m.content}</div>
            </div>
          </div>
        );
      }),
    [messages, currentUserId]
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
      <header className="px-4 py-3 border-b border-gray-800 flex items-center justify-between bg-gray-950/80 backdrop-blur">
        <button
          type="button"
          className="text-sm text-gray-300 hover:text-white"
          onClick={() => navigate(-1)}
        >
          Back
        </button>
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-500">Chat with</span>
          <h1 className="text-lg font-semibold">{otherUserName}</h1>
        </div>
        <div className="w-10" />
      </header>

      <main className="flex-1 flex flex-col px-4 py-3 w-full max-w-4xl mx-auto">
        <div className="flex-1 overflow-y-auto space-y-2 mb-3 border border-gray-800 rounded-2xl p-3 bg-gradient-to-b from-gray-900/80 to-gray-950/90">
          {renderedMessages}
          {messages.length === 0 && (
            <div className="text-sm text-gray-500 text-center mt-4">
              No messages yet. Say hi!
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="flex gap-2 mt-1">
          <input
            className="flex-1 px-3 py-2 rounded-2xl bg-gray-900 border border-gray-700 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            type="button"
            className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-sm font-medium shadow-lg shadow-emerald-600/30"
            onClick={handleSend}
          >
            Send
          </button>
        </div>
      </main>
    </div>
  );
}

export default ChatPage;

