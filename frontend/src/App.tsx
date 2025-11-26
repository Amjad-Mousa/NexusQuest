import { useState, useEffect } from 'react';
import { CodeEditor } from './components/CodeEditor';
import { Console } from './components/Console';
import { Button } from './components/ui/button';
import { Play, Square, Download, Upload, Moon, Sun, Lightbulb, Sparkles } from 'lucide-react';
import * as aiService from './services/aiService';

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

const defaultJavaScriptCode = `// Welcome to NexusQuest IDE!
// Write your JavaScript code here and click Run
// Popular frameworks: express, axios, lodash available

console.log("Hello from JavaScript!");

// Example: Using lodash
const _ = require('lodash');
const numbers = [1, 2, 3, 4, 5];
const doubled = _.map(numbers, n => n * 2);
console.log("Doubled:", doubled);

// Example: Date formatting with moment
const moment = require('moment');
console.log("Current time:", moment().format('MMMM Do YYYY, h:mm:ss a'));
`;

const defaultCppCode = `// Welcome to NexusQuest IDE!
// Write your C++ code here and click Run
// Available: STL, Boost, C++20 features

#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    cout << "Hello from C++!" << endl;
    
    // Example: Vector and algorithms
    vector<int> numbers = {5, 2, 8, 1, 9};
    sort(numbers.begin(), numbers.end());
    
    cout << "Sorted numbers: ";
    for(int num : numbers) {
        cout << num << " ";
    }
    cout << endl;
    
    return 0;
}
`;

const defaultGoCode = `// Welcome to NexusQuest IDE!
// Write your Go code here and click Run
// Available frameworks: Gin, GORM, Chi

package main

import (
	"fmt"
)

func main() {
	fmt.Println("Hello from Go!")
	
	// Example: Slices and range
	numbers := []int{5, 2, 8, 1, 9}
	
	fmt.Print("Numbers: ")
	for _, num := range numbers {
		fmt.Printf("%d ", num)
	}
	fmt.Println()
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
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('nexusquest-theme');
    return (saved as 'dark' | 'light') || 'dark';
  });
  const [code, setCode] = useState(() => {
    const saved = localStorage.getItem('nexusquest-code');
    return saved || defaultCode;
  });
  const [output, setOutput] = useState<ConsoleOutput[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [language, setLanguage] = useState<'python' | 'java' | 'javascript' | 'cpp' | 'go'>(() => {
    const saved = localStorage.getItem('nexusquest-language');
    return (saved as 'python' | 'java' | 'javascript' | 'cpp' | 'go') || 'python';
  });
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [inputQueue, setInputQueue] = useState<string[]>([]);
  const [expectedInputCount, setExpectedInputCount] = useState(0);

  // Save theme to localStorage
  useEffect(() => {
    localStorage.setItem('nexusquest-theme', theme);
  }, [theme]);

  // Save code to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('nexusquest-code', code);
    }, 1000); // Debounce 1 second
    return () => clearTimeout(timer);
  }, [code]);

  // Save language to localStorage
  useEffect(() => {
    localStorage.setItem('nexusquest-language', language);
  }, [language]);

  // Reset input state when language changes
  useEffect(() => {
    setWaitingForInput(false);
    setInputQueue([]);
    setExpectedInputCount(0);
  }, [language]);

  // Initialize suggestions on mount
  useEffect(() => {
    setSuggestions(getCodeSuggestions(code));
  }, []);

  // Change default code when language changes
  useEffect(() => {
    if (language === 'python') {
      setCode(defaultPythonCode);
    } else if (language === 'java') {
      setCode(defaultJavaCode);
    } else if (language === 'javascript') {
      setCode(defaultJavaScriptCode);
    } else if (language === 'cpp') {
      setCode(defaultCppCode);
    } else if (language === 'go') {
      setCode(defaultGoCode);
    }
  }, [language]);

  const runCode = async (providedInputs?: string[]) => {
    if (!code.trim()) {
      addToConsole('Please write some code first!', 'error');
      return;
    }

    // Use provided inputs or current queue
    const inputs = providedInputs || inputQueue;

    // Check for interactive input (Scanner/input/cin/stdin) and show instructions if no inputs provided
    const needsInput = (language === 'java' && (/Scanner/.test(code) && (/nextInt|nextLine|next\(|nextDouble|nextFloat/.test(code) || /BufferedReader/.test(code)))) ||
                       (language === 'python' && /input\s*\(/.test(code)) ||
                       (language === 'cpp' && /cin\s*>>/.test(code)) ||
                       (language === 'javascript' && /readline|stdin/.test(code)) ||
                       (language === 'go' && /fmt\.Scan|bufio\.NewScanner/.test(code));
    
    if (needsInput && inputs.length === 0) {
      // Extract input prompts from the code to show user what inputs are expected
      const prompts: string[] = [];
      
      if (language === 'python') {
        // Match input("prompt") patterns
        const inputMatches = code.matchAll(/input\s*\(\s*['"](.*?)['"]\s*\)/g);
        for (const match of inputMatches) {
          prompts.push(match[1] || 'Enter value');
        }
      } else if (language === 'java') {
        // Match System.out.print patterns before Scanner calls
        const lines = code.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('System.out.print') && lines[i].includes('"')) {
            const promptMatch = lines[i].match(/["'](.*?)["']/);
            if (promptMatch && i + 1 < lines.length && /next(Int|Line|Double|Float|\()/.test(lines[i + 1])) {
              prompts.push(promptMatch[1]);
            }
          }
        }
      } else if (language === 'cpp') {
        // Match cout << "prompt" patterns before cin
        const lines = code.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('cout') && lines[i].includes('"') && i + 1 < lines.length && lines[i + 1].includes('cin >>')) {
            const promptMatch = lines[i].match(/["'](.*?)["']/);
            if (promptMatch) {
              prompts.push(promptMatch[1]);
            }
          }
        }
      } else if (language === 'javascript') {
        // Match console.log("prompt") patterns before readline
        const lines = code.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('console.log') && lines[i].includes('"') && i + 1 < lines.length && /readline|stdin/.test(lines[i + 1])) {
            const promptMatch = lines[i].match(/["'](.*?)["']/);
            if (promptMatch) {
              prompts.push(promptMatch[1]);
            }
          }
        }
      } else if (language === 'go') {
        // Match fmt.Print patterns before Scan
        const lines = code.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('fmt.Print') && lines[i].includes('"') && i + 1 < lines.length && /Scan/.test(lines[i + 1])) {
            const promptMatch = lines[i].match(/["'](.*?)["']/);
            if (promptMatch) {
              prompts.push(promptMatch[1]);
            }
          }
        }
      }
      
      setExpectedInputCount(prompts.length || 1);
      addToConsole('⚠️ Your code requires input!', 'error');
      addToConsole('', 'output');
      
      if (prompts.length > 0) {
        addToConsole(`📝 Your code expects these inputs:`, 'info');
        prompts.forEach((prompt, i) => {
          addToConsole(`   ${i + 1}. ${prompt}`, 'output');
        });
      } else {
        addToConsole(`📝 Your code requires input values`, 'info');
      }
      
      addToConsole('', 'output');
      addToConsole('💡 Type each value below and press Enter', 'info');
      addToConsole(`   After ${prompts.length || 'all'} input${prompts.length !== 1 ? 's' : ''}, code will run automatically`, 'output');
      setWaitingForInput(true);
      return;
    }

    setIsRunning(true);
    setWaitingForInput(false);
    
    if (inputs.length > 0) {
      addToConsole(`📥 Using inputs: ${inputs.join(', ')}`, 'info');
    }
    addToConsole('⏳ Running code...', 'info');

    try {
      const response = await fetch('http://localhost:9876/api/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          code: code.trim(),
          language: language,
          input: inputs.join(',')
        }),
      });

      const result = await response.json();

      if (result.error) {
        addToConsole(result.error, 'error');
        
        // Get AI error suggestions
        try {
          const errorAnalysis = await aiService.getErrorSuggestions(result.error, code, language);
          if (errorAnalysis.explanation) {
            addToConsole('', 'output');
            addToConsole('🤖 AI Error Analysis:', 'info');
            addToConsole(errorAnalysis.explanation, 'info');
            
            if (errorAnalysis.suggestions.length > 0) {
              addToConsole('', 'output');
              addToConsole('💡 Suggested Fixes:', 'info');
              errorAnalysis.suggestions.forEach((suggestion, idx) => {
                addToConsole(`   ${idx + 1}. ${suggestion}`, 'output');
              });
            }
          }
        } catch (aiError) {
          console.error('Failed to get AI error suggestions:', aiError);
        }
      } else {
        addToConsole(result.output || '✅ Code executed successfully', 'output');
      }
      
      // Clear input queue after successful execution
      setInputQueue([]);
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
    setInputQueue([]);
    setWaitingForInput(false);
    setExpectedInputCount(0);
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

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const explainSelectedCode = async () => {
    if (!code.trim()) {
      addToConsole('No code to explain!', 'error');
      return;
    }

    addToConsole('🤖 Analyzing code...', 'info');
    
    try {
      const explanation = await aiService.explainCode(code, language);
      addToConsole('', 'output');
      addToConsole('💡 Code Explanation:', 'info');
      addToConsole(explanation, 'output');
    } catch (error) {
      addToConsole('Failed to explain code', 'error');
    }
  };

  const handleConsoleInput = (value: string) => {
    if (!value.trim()) return;
    
    const newQueue = [...inputQueue, value];
    setInputQueue(newQueue);
    addToConsole(`✅ Input #${newQueue.length} added: ${value}`, 'input' as ConsoleOutput['type']);
    
    // Check if we have all required inputs
    if (expectedInputCount > 0 && newQueue.length >= expectedInputCount) {
      addToConsole(`🎯 All ${expectedInputCount} inputs received! Auto-running code...`, 'info');
      // Auto-run after a short delay to show the message
      setTimeout(() => {
        runCode(newQueue);
      }, 500);
    } else if (expectedInputCount > 0) {
      const remaining = expectedInputCount - newQueue.length;
      addToConsole(`💬 Input ${newQueue.length}/${expectedInputCount} received. ${remaining} more needed...`, 'info');
    } else {
      // Fallback if count detection failed
      if (newQueue.length === 1) {
        addToConsole(`💬 Input queue: [${newQueue.join(', ')}]. Need more? Type again. Ready? Click "Run Code".`, 'info');
      } else {
        addToConsole(`💬 Input queue: [${newQueue.join(', ')}]. Add more or click "Run Code" to execute.`, 'info');
      }
    }
  };

  return (
    <div className={`h-screen flex flex-col ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'
    }`}>
      {/* Header */}
      <header className={`border-b ${
        theme === 'dark'
          ? 'border-gray-700 bg-gradient-to-r from-blue-900/50 via-purple-900/50 to-blue-900/50'
          : 'border-gray-300 bg-gradient-to-r from-blue-100/50 via-purple-100/50 to-blue-100/50'
      } backdrop-blur-sm`}>
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
              {inputQueue.length > 0 && (
                <div className="px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/50 rounded-lg flex items-center gap-2">
                  <span className="text-yellow-400 text-xs font-semibold">📥 {inputQueue.length} input{inputQueue.length > 1 ? 's' : ''} ready</span>
                </div>
              )}
              <Button 
                onClick={() => runCode()} 
                disabled={isRunning}
                className={`flex items-center gap-2 ${
                  waitingForInput 
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 shadow-yellow-500/30 animate-pulse' 
                    : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-green-500/30'
                } text-white shadow-lg transition-all duration-200 hover:scale-105`}
              >
                <Play className="w-4 h-4" fill="currentColor" />
                {isRunning ? 'Running...' : waitingForInput ? 'Waiting for Input' : inputQueue.length > 0 ? `Run with ${inputQueue.length} input${inputQueue.length > 1 ? 's' : ''}` : 'Run Code'}
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
                onClick={explainSelectedCode}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/30 transition-all duration-200 hover:scale-105"
                title="Explain code with AI"
              >
                <Sparkles className="w-4 h-4" />
                Explain
              </Button>
              <Button 
                onClick={downloadCode} 
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white shadow-lg shadow-blue-500/30 transition-all duration-200 hover:scale-105"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
              <Button 
                onClick={toggleTheme}
                className={`flex items-center gap-2 ${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700'
                    : 'bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400'
                } text-white shadow-lg transition-all duration-200 hover:scale-105`}
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
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
              <h2 className={`text-sm font-semibold uppercase tracking-wide ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>Code Editor</h2>
            </div>
            <div className="flex gap-2 items-center">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'python' | 'java' | 'javascript' | 'cpp' | 'go')}
                className={`text-xs px-3 py-1 rounded border transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  theme === 'dark'
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30'
                    : 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200'
                }`}
              >
                <option value="python">Python 🐍</option>
                <option value="javascript">JavaScript 📜</option>
                <option value="java">Java ☕</option>
                <option value="cpp">C++ ⚡</option>
                <option value="go">Go 🚀</option>
              </select>
              <span className={`text-xs px-2 py-1 rounded border ${
                theme === 'dark'
                  ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                  : 'bg-purple-100 text-purple-700 border-purple-300'
              }`}>{code.split('\n').length} lines</span>
            </div>
          </div>
          <div className={`flex-1 rounded-xl overflow-hidden border shadow-2xl backdrop-blur-sm ${
            theme === 'dark'
              ? 'border-gray-700 bg-gray-900/50'
              : 'border-gray-300 bg-white/90'
          }`}>
            <CodeEditor
              key={language}
              value={code}
              onChange={handleCodeChange}
              language={language}
              height="100%"
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
            />
          </div>

          {/* Code Suggestions */}
          {suggestions.length > 0 && (
            <div className={`mt-3 p-3 rounded-lg border backdrop-blur-sm ${
              theme === 'dark'
                ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30'
                : 'bg-gradient-to-r from-blue-100 to-purple-100 border-blue-300'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <svg className={`w-4 h-4 ${
                  theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                }`} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z"/>
                </svg>
                <span className={`text-xs font-semibold ${
                  theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                }`}>Code Suggestions</span>
              </div>
              <div className="space-y-1">
                {suggestions.map((suggestion, index) => (
                  <div key={index} className={`text-xs flex items-start gap-2 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    <span className={theme === 'dark' ? 'text-blue-400 mt-0.5' : 'text-blue-600 mt-0.5'}>•</span>
                    <span>{suggestion}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Vertical Divider */}
        <div className={`w-1 bg-gradient-to-b from-transparent to-transparent my-4 ${
          theme === 'dark' ? 'via-gray-700' : 'via-gray-300'
        }`}></div>

        {/* Console */}
        <div className="w-96 p-4 flex flex-col">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <h2 className={`text-sm font-semibold uppercase tracking-wide ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>Console Output</h2>
            </div>
            <span className={`text-xs px-2 py-1 rounded border ${
              theme === 'dark'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-emerald-100 text-emerald-700 border-emerald-300'
            }`}>{output.length} messages</span>
          </div>
          <div className={`flex-1 rounded-xl overflow-hidden border shadow-2xl ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-300'
          }`}>
            <Console 
              output={output} 
              height="100%" 
              onInput={handleConsoleInput}
              waitingForInput={waitingForInput}
              theme={theme}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className={`border-t backdrop-blur-sm ${
        theme === 'dark'
          ? 'border-gray-700 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900'
          : 'border-gray-300 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100'
      }`}>
        <div className="px-6 py-3 flex justify-between items-center text-xs">
          <div className={`flex items-center gap-4 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Ready to execute
            </span>
            <span>|</span>
            <span>{language === 'python' ? 'Python 3.10' : 'Java 17'}</span>
            <span>|</span>
            <span>Docker Isolated</span>
          </div>
          <div className={`flex items-center gap-4 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <span>Memory: {language === 'python' ? '128MB' : '256MB'}</span>
            <span>|</span>
            <span>Timeout: {language === 'python' ? '10s' : '15s'}</span>
            <span>|</span>
            <span className={theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}>Secure Mode ✓</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;