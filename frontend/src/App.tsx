import { useState, useEffect } from 'react';
import { CodeEditor } from './components/CodeEditor';
import { Console } from './components/Console';
import { Button } from './components/ui/button';
import { Play, Square, Download, Upload } from 'lucide-react';

interface ConsoleOutput {
  type: 'output' | 'error' | 'info' | 'input';
  message: string;
  timestamp: Date;
}

const defaultPythonCode = `# Welcome to NexusQuest IDE!
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

const defaultJavaCode = `// Welcome to NexusQuest IDE!
// Write your Java code here and click Run
// TIP: Use the Input field above to provide values for Scanner

import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        
        // Example: Read input
        // Input field: 10, 20
        System.out.print("Enter first number: ");
        int num1 = scanner.nextInt();
        
        System.out.print("Enter second number: ");
        int num2 = scanner.nextInt();
        
        int sum = num1 + num2;
        System.out.println("The sum is: " + sum);
        
        scanner.close();
    }
}
`;

const defaultCode = defaultPythonCode;

// Code suggestions based on patterns
const getCodeSuggestions = (code: string): string[] => {
  const suggestions: string[] = [];
  const lines = code.split('\n');
  const lineCount = lines.length;
  
  // Performance suggestions
  if (code.includes('for ') && code.includes('range(len(')) {
    suggestions.push('⚡ Performance Tip: Use enumerate() instead of range(len()) - More pythonic and efficient');
  }
  
  if (code.match(/\blist\(\[.*\]\)/) || code.match(/\bdict\(\{.*\}\)/)) {
    suggestions.push('⚡ Optimization: Remove redundant list() or dict() wrappers around literals');
  }
  
  // Code quality suggestions
  if (!code.includes('def ') && lineCount > 10) {
    suggestions.push('💡 Best Practice: Break code into reusable functions for better organization');
  }
  
  if (!code.includes('#') && lineCount > 15) {
    suggestions.push('📝 Readability: Add docstrings and comments to explain your code logic');
  }
  
  if (code.includes('== True') || code.includes('== False')) {
    suggestions.push('⚡ Pythonic: Use "if condition:" instead of "if condition == True:"');
  }
  
  // String formatting suggestions
  if (code.match(/\"\s*\+\s*.*\s*\+\s*\"/)) {
    suggestions.push('✨ Modern Python: Replace string concatenation (+) with f-strings for clarity');
  }
  
  if (code.includes('%') && code.includes('(')) {
    suggestions.push('✨ Upgrade: Consider using f-strings instead of % formatting');
  }
  
  if (code.includes('.format(') && !code.includes('f"')) {
    suggestions.push('✨ Tip: f-strings are faster and more readable than .format()');
  }
  
  // Error handling suggestions
  if (code.includes('try:') && !code.includes('except')) {
    suggestions.push('⚠️ Safety: Add except clause to handle potential errors gracefully');
  }
  
  if (code.includes('except:') && !code.includes('except ')) {
    suggestions.push('⚠️ Best Practice: Catch specific exceptions instead of bare except');
  }
  
  // Code structure suggestions
  if (lineCount > 20 && !code.includes('\n\n')) {
    suggestions.push('📐 Structure: Add blank lines between logical sections per PEP 8');
  }
  
  if (code.includes('lambda') && code.split('lambda').length > 3) {
    suggestions.push('💡 Clarity: Consider using named functions instead of complex lambdas');
  }
  
  // Variable naming suggestions
  if (code.match(/\b[a-z]\b/g) && lineCount > 5) {
    suggestions.push('📝 Naming: Use descriptive variable names instead of single letters');
  }
  
  // List comprehension suggestions
  if (code.includes('for ') && code.includes('.append(')) {
    suggestions.push('✨ Pythonic: Consider using list comprehension instead of append in loop');
  }
  
  // Positive feedback
  if (code.includes('def ') && code.includes('return ')) {
    suggestions.push('✅ Excellent: Good use of functions with return statements!');
  }
  
  if (code.includes('#') || code.includes('"""')) {
    suggestions.push('✅ Great: Well-documented code is maintainable code!');
  }
  
  if (code.includes('f"') || code.includes("f'")) {
    suggestions.push('✅ Modern: Using f-strings - the best way to format strings in Python!');
  }
  
  if (code.includes('with ')) {
    suggestions.push('✅ Professional: Using context managers for resource management!');
  }
  
  if (code.includes('if __name__ == "__main__"')) {
    suggestions.push('✅ Best Practice: Proper main guard usage - excellent structure!');
  }
  
  // Learning suggestions for beginners
  if (code.length < 30 && lineCount < 5) {
    suggestions.push('💡 Try: Experiment with functions, loops, and list comprehensions!');
  }
  
  return suggestions.slice(0, 4); // Limit to 4 suggestions
};

function App() {
  const [code, setCode] = useState(defaultCode);
  const [output, setOutput] = useState<ConsoleOutput[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [language, setLanguage] = useState<'python' | 'java'>('python');
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [inputQueue, setInputQueue] = useState<string[]>([]);

  // Initialize suggestions on mount
  useEffect(() => {
    setSuggestions(getCodeSuggestions(defaultCode));
  }, []);

  // Change default code when language changes
  useEffect(() => {
    if (language === 'python') {
      setCode(defaultPythonCode);
    } else if (language === 'java') {
      setCode(defaultJavaCode);
    }
  }, [language]);

  const runCode = async () => {
    if (!code.trim()) {
      addToConsole('Please write some code first!', 'error');
      return;
    }

    // Check for interactive input (Scanner/input)
    if (language === 'java' && /Scanner.*next|BufferedReader/.test(code)) {
      addToConsole('💡 Scanner detected: Enter values when prompted in the console below', 'info');
    }
    
    if (language === 'python' && /input\s*\(/.test(code)) {
      addToConsole('💡 input() detected: Enter values when prompted in the console below', 'info');
    }

    setIsRunning(true);
    addToConsole('Running code...', 'info');
    console.log('Executing code with language:', language);

    try {
      const response = await fetch('http://localhost:9876/api/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          code: code.trim(),
          language: language,
          input: inputQueue.join(',')
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

  const loadCodeFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.py,.txt,.js,.ts,.jsx,.tsx,.java,.cpp,.c,.cs,.php,.rb,.go,.rs,.kt,.swift';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          setCode(content);
          addToConsole(`📂 Loaded file: ${file.name}`, 'info');
        };
        reader.onerror = () => {
          addToConsole(`❌ Error loading file: ${file.name}`, 'error');
        };
        reader.readAsText(file);
      }
    };
    
    input.click();
  };

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    // Update suggestions when code changes
    const newSuggestions = getCodeSuggestions(newCode);
    setSuggestions(newSuggestions);
  };

  const handleConsoleInput = (value: string) => {
    setInputQueue(prev => [...prev, value]);
    setWaitingForInput(false);
    addToConsole(`> ${value}`, 'input' as ConsoleOutput['type']);
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
                onClick={loadCodeFile} 
                className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg shadow-purple-500/30 transition-all duration-200 hover:scale-105"
              >
                <Upload className="w-4 h-4" />
                Open File
              </Button>
              <Button 
                onClick={clearConsole} 
                className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg shadow-orange-500/30 transition-all duration-200 hover:scale-105"
              >
                <Square className="w-4 h-4" />
                Clear
              </Button>
              <Button 
                onClick={downloadCode} 
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white shadow-lg shadow-blue-500/30 transition-all duration-200 hover:scale-105"
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
            <div className="flex gap-2 items-center">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'python' | 'java')}
                className="text-xs px-3 py-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="python">Python</option>
                <option value="java">Java</option>
              </select>
              <span className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">{code.split('\n').length} lines</span>
            </div>
          </div>
          <div className="flex-1 rounded-xl overflow-hidden border border-gray-700 shadow-2xl bg-gray-900/50 backdrop-blur-sm">
            <CodeEditor
              key={language}
              value={code}
              onChange={handleCodeChange}
              language={language}
              height="100%"
            />
          </div>

          {/* Code Suggestions */}
          {suggestions.length > 0 && (
            <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z"/>
                </svg>
                <span className="text-xs font-semibold text-blue-300">Code Suggestions</span>
              </div>
              <div className="space-y-1">
                {suggestions.map((suggestion, index) => (
                  <div key={index} className="text-xs text-gray-300 flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span>{suggestion}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
            <Console 
              output={output} 
              height="100%" 
              onInput={handleConsoleInput}
              waitingForInput={waitingForInput}
            />
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