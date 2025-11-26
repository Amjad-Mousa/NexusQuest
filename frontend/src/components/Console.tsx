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
}

export function Console({ output, height = '200px', onInput, waitingForInput = false }: ConsoleProps) {
  const [inputValue, setInputValue] = React.useState('');
  
  const getTypeClass = (type: ConsoleOutput['type']) => {
    switch (type) {
      case 'error':
        return 'text-red-400';
      case 'info':
        return 'text-blue-400';
      case 'input':
        return 'text-yellow-400';
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
    <div 
      className="bg-gradient-to-b from-gray-900 to-black text-white font-mono text-sm p-4 overflow-y-auto relative"
      style={{ height }}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)'
      }}></div>
      
      <div className="relative z-10">
        {output.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-4 animate-pulse">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-gray-500 text-sm">Ready to execute code...</div>
            <div className="text-gray-600 text-xs mt-2">Click "Run Code" to see output here</div>
          </div>
        ) : (
          <div className="space-y-2">
            {output.map((item, index) => (
              <div key={index} className="group hover:bg-gray-800/30 p-2 rounded transition-colors duration-150">
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
                    <div className="text-xs text-gray-500 mb-1">
                      {formatTimestamp(item.timestamp)}
                    </div>
                    <div className={`${getTypeClass(item.type)} whitespace-pre-wrap break-words`}>
                      {item.message}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Input field when waiting for input */}
            {waitingForInput && (
              <div className="mt-4 flex items-center gap-2 p-2 bg-gray-800/50 rounded border border-yellow-500/30">
                <span className="text-yellow-400">›</span>
                <form onSubmit={handleInputSubmit} className="flex-1">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Enter input and press Enter..."
                    className="w-full bg-transparent text-white outline-none placeholder-gray-500"
                    autoFocus
                  />
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}