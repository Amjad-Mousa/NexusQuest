import React from 'react';

interface ConsoleOutput {
  type: 'output' | 'error' | 'info' | 'input';
  message: string;
  timestamp: Date;
}

interface ConsoleProps {
  output: ConsoleOutput[];
  height?: string;
  onInput?: (value: string) => void;
  waitingForInput?: boolean;
  theme?: 'dark' | 'light';
}

export function Console({ output, onInput, waitingForInput = false, theme = 'dark' }: ConsoleProps) {
  const [inputValue, setInputValue] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when output changes
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  // Auto-focus input when waiting for input
  React.useEffect(() => {
    if (waitingForInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [waitingForInput]);
  
  const getTypeClass = (type: ConsoleOutput['type']) => {
    switch (type) {
      case 'error':
        return 'text-red-400';
      case 'info':
        return 'text-blue-400';
      case 'input':
        return 'text-cyan-400';
      default:
        return 'text-green-400';
    }
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && onInput) {
      onInput(inputValue);
      setInputValue('');
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString();
  };

  return (
    <div className={`flex flex-col h-full font-mono text-sm relative ${
      theme === 'dark'
        ? 'bg-gradient-to-b from-gray-900 to-black text-white'
        : 'bg-gradient-to-b from-gray-50 to-white text-gray-900'
    }`}>
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, ${theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'} 2px, ${theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'} 4px)`
      }}></div>
      
      {/* Output area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 relative z-10"
      >
        {output.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 animate-pulse ${
              theme === 'dark'
                ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20'
                : 'bg-gradient-to-br from-blue-200/50 to-purple-200/50'
            }`}>
              <svg className={`w-8 h-8 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>Ready to execute code...</div>
            <div className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-500'}`}>Click "Run Code" to see output here</div>
          </div>
        ) : (
          <div className="space-y-2">
            {output.map((item, index) => (
              <div key={index} className={`group p-2 rounded transition-colors duration-150 ${
                theme === 'dark' ? 'hover:bg-gray-800/30' : 'hover:bg-gray-100/50'
              }`}>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {item.type === 'error' && (
                      <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center">
                        <span className="text-red-500 text-xs">✕</span>
                      </div>
                    )}
                    {item.type === 'info' && (
                      <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <span className="text-blue-500 text-xs">ℹ</span>
                      </div>
                    )}
                    {item.type === 'output' && (
                      <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                        <span className="text-green-500 text-xs">✓</span>
                      </div>
                    )}
                    {item.type === 'input' && (
                      <div className="w-5 h-5 rounded-full bg-yellow-500/20 flex items-center justify-center">
                        <span className="text-yellow-500 text-xs">›</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs mb-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                      {formatTimestamp(item.timestamp)}
                    </div>
                    <div className={`${getTypeClass(item.type)} whitespace-pre-wrap break-words`}>
                      {item.message}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Fixed input area at bottom - always visible like GDBOnline */}
      <div className={`border-t p-3 backdrop-blur-sm relative z-10 ${
        theme === 'dark'
          ? 'border-gray-800 bg-gray-900/80'
          : 'border-gray-300 bg-gray-50/80'
      }`}>
        <form onSubmit={handleInputSubmit} className="flex items-center gap-2">
          <span className={`flex-shrink-0 ${
            waitingForInput
              ? 'text-yellow-400 animate-pulse'
              : theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
          }`}>
            {waitingForInput ? '⚡' : '›'}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={waitingForInput ? "Program is waiting for input..." : "Type input here (for programs using Scanner/input)"}
            disabled={!waitingForInput && output.length === 0}
            className={`flex-1 bg-transparent outline-none ${
              theme === 'dark'
                ? `placeholder-gray-600 ${waitingForInput ? 'text-white' : 'text-gray-500'}`
                : `placeholder-gray-500 ${waitingForInput ? 'text-gray-900' : 'text-gray-600'}`
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          />
          {waitingForInput && (
            <span className="text-xs text-yellow-400/60">Press Enter to submit</span>
          )}
        </form>
      </div>
    </div>
  );
}