import { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Copy, Check, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { getApiUrl } from '../utils/apiHelpers';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface AiAgentProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'dark' | 'light';
  currentCode?: string;
  language?: string;
}

export function AiAgent({ isOpen, onClose, theme, currentCode = '', language = 'python' }: AiAgentProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '👋 Hi! I\'m your AI coding assistant. I can help you with:\n\n• Explaining code\n• Fixing errors\n• Writing new code\n• Suggesting improvements\n• Answering questions\n\nWhat can I help you with today?',
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${getApiUrl()}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          currentCode,
          language,
          history: messages.slice(-4) // Last 4 messages for context
        })
      });

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || 'Sorry, I couldn\'t process that request.',
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I\'m having trouble connecting. Please try again.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const quickActions = [
    { label: 'Explain this code', prompt: `Explain this ${language} code:\n\n${currentCode}` },
    { label: 'Find bugs', prompt: `Review this ${language} code for potential bugs:\n\n${currentCode}` },
    { label: 'Optimize code', prompt: `Suggest optimizations for this ${language} code:\n\n${currentCode}` },
    { label: 'Add comments', prompt: `Add helpful comments to this ${language} code:\n\n${currentCode}` }
  ];

  if (!isOpen) return null;

  return (
    <div className={`fixed right-0 top-0 h-full w-96 shadow-2xl border-l flex flex-col z-50 ${
      theme === 'dark' 
        ? 'bg-gray-900 border-gray-700 text-gray-100' 
        : 'bg-white border-gray-200 text-gray-900'
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${
        theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
      }`}>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">AI Assistant</h2>
            <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Powered by AI
            </p>
          </div>
        </div>
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Quick Actions */}
      {currentCode && messages.length === 1 && (
        <div className={`p-3 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <p className={`text-xs font-medium mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Quick Actions
          </p>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  setInput(action.prompt);
                }}
                className={`text-xs px-2 py-2 rounded-lg text-left transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
              <div
                className={`rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                    : theme === 'dark'
                    ? 'bg-gray-800 text-gray-100'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
              </div>
              <div className="flex items-center gap-2 mt-1 px-1">
                <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {message.role === 'assistant' && (
                  <button
                    onClick={() => handleCopy(message.content, index)}
                    className={`text-xs flex items-center gap-1 transition-colors ${
                      theme === 'dark' 
                        ? 'text-gray-500 hover:text-gray-300' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {copiedIndex === index ? (
                      <>
                        <Check className="w-3 h-3" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className={`rounded-lg px-4 py-2 ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
            }`}>
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={`p-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask me anything..."
            className={`flex-1 px-3 py-2 rounded-lg text-sm resize-none ${
              theme === 'dark'
                ? 'bg-gray-800 text-white placeholder-gray-500 border-gray-700'
                : 'bg-white text-gray-900 placeholder-gray-400 border-gray-300'
            } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
            rows={2}
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="h-auto px-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
