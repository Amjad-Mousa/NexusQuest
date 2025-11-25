import { useState } from 'react';
import { CodeEditor } from './components/CodeEditor';
import { Console } from './components/Console';
import { Button } from './components/ui/button';
import { Play, Square, Download } from 'lucide-react';

interface ConsoleOutput {
  type: 'output' | 'error' | 'info';
  message: string;
  timestamp: Date;
}

const defaultCode = `# Welcome to NexusQuest IDE!
# Write your Python code here and click Run

def greet(name):
    return f"Hello, {name}! Welcome to the IDE."

print(greet("Developer"))

# Example: Basic calculations
x = 10
y = 20
result = x + y
print(f"The sum of {x} and {y} is {result}")
`;

function App() {
  const [code, setCode] = useState(defaultCode);
  const [output, setOutput] = useState<ConsoleOutput[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runCode = async () => {
    if (!code.trim()) {
      addToConsole('Please write some code first!', 'error');
      return;
    }

    setIsRunning(true);
    addToConsole('Running code...', 'info');

    try {
      const response = await fetch('http://localhost:9876/api/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          code: code.trim(),
          language: 'python'
        }),
      });

      const result = await response.json();

      if (result.error) {
        addToConsole(result.error, 'error');
      } else {
        addToConsole(result.output || 'Code executed successfully', 'output');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        addToConsole('❌ Cannot connect to backend server!\n\nMake sure the backend is running:\n  cd backend\n  npm run dev', 'error');
      } else {
        addToConsole(`Connection error: ${errorMessage}`, 'error');
      }
    } finally {
      setIsRunning(false);
    }
  };

  const clearConsole = () => {
    setOutput([]);
  };

  const addToConsole = (message: string, type: ConsoleOutput['type'] = 'output') => {
    setOutput(prev => [...prev, {
      type,
      message,
      timestamp: new Date()
    }]);
  };

  const downloadCode = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'code.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-700 bg-gradient-to-r from-blue-900/50 via-purple-900/50 to-blue-900/50 backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">N</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  NexusQuest IDE
                </h1>
                <p className="text-xs text-gray-400">Python Development Environment</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={runCode} 
                disabled={isRunning}
                className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/30 transition-all duration-200 hover:scale-105"
              >
                <Play className="w-4 h-4" fill="currentColor" />
                {isRunning ? 'Running...' : 'Run Code'}
              </Button>
              <Button 
                onClick={clearConsole} 
                variant="outline"
                className="flex items-center gap-2 border-gray-600 hover:bg-gray-800 hover:border-gray-500 text-gray-300"
              >
                <Square className="w-4 h-4" />
                Clear
              </Button>
              <Button 
                onClick={downloadCode} 
                variant="outline"
                className="flex items-center gap-2 border-gray-600 hover:bg-gray-800 hover:border-gray-500 text-gray-300"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Code Editor */}
        <div className="flex-1 p-4 flex flex-col">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Code Editor</h2>
            </div>
            <div className="flex gap-2">
              <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">Python</span>
              <span className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">{code.split('\n').length} lines</span>
            </div>
          </div>
          <div className="flex-1 rounded-xl overflow-hidden border border-gray-700 shadow-2xl bg-gray-900/50 backdrop-blur-sm">
            <CodeEditor
              value={code}
              onChange={(value) => setCode(value || '')}
              language="python"
              height="100%"
            />
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="w-1 bg-gradient-to-b from-transparent via-gray-700 to-transparent my-4"></div>

        {/* Console */}
        <div className="w-96 p-4 flex flex-col">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Console Output</h2>
            </div>
            <span className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">{output.length} messages</span>
          </div>
          <div className="flex-1 rounded-xl overflow-hidden border border-gray-700 shadow-2xl">
            <Console output={output} height="100%" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-700 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 backdrop-blur-sm">
        <div className="px-6 py-3 flex justify-between items-center text-xs">
          <div className="flex items-center gap-4 text-gray-400">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Ready to execute
            </span>
            <span>|</span>
            <span>Python 3.10</span>
            <span>|</span>
            <span>Docker Isolated</span>
          </div>
          <div className="flex items-center gap-4 text-gray-400">
            <span>Memory: 128MB</span>
            <span>|</span>
            <span>Timeout: 10s</span>
            <span>|</span>
            <span className="text-blue-400">Secure Mode ✓</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;