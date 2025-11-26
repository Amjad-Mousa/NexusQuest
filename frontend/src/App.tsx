import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CodeEditor, CodeErrorMarker } from './components/CodeEditor';
import { Console } from './components/Console';
import { Button } from './components/ui/button';
import { Play, Square, Download, Upload, Sparkles, FolderTree, ChevronRight, ChevronLeft, User, LogIn, LogOut, X, FolderOpen, Trophy, Settings, Moon, Sun, Minus, Plus, FilePlus, FolderPlus, Trash2, ChevronDown, File } from 'lucide-react';
import * as aiService from './services/aiService';
import * as projectService from './services/projectService';
import type { Project, ProjectFile } from './services/projectService';

interface AppProps {
  user: { name: string; email: string } | null;
  onLogout: () => void;
}

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

const defaultCode = defaultPythonCode;

function App({ user, onLogout }: AppProps) {
  const navigate = useNavigate();
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
  const [language, setLanguage] = useState<'python' | 'java' | 'javascript' | 'cpp'>(() => {
    const saved = localStorage.getItem('nexusquest-language');
    return (saved as 'python' | 'java' | 'javascript' | 'cpp') || 'python';
  });
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [inputQueue, setInputQueue] = useState<string[]>([]);
  const [expectedInputCount, setExpectedInputCount] = useState(0);
  const [codeErrors, setCodeErrors] = useState<CodeErrorMarker[]>([]);
  const [isProjectPanelOpen, setIsProjectPanelOpen] = useState(true);
  const [activeBottomTab, setActiveBottomTab] = useState<'console' | 'terminal'>('console');
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [fontSize, setFontSize] = useState<number>(() => {
    const saved = localStorage.getItem('nexusquest-fontsize');
    return saved ? parseInt(saved) : 14;
  });

  // Project state
  const [projects, setProjects] = useState<Project[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentFile, setCurrentFile] = useState<ProjectFile | null>(null);
  const [showNewProjectInput, setShowNewProjectInput] = useState(false);
  const [showNewFileInput, setShowNewFileInput] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectLanguage, setNewProjectLanguage] = useState<'python' | 'java' | 'javascript' | 'cpp'>('python');
  const [newFileName, setNewFileName] = useState('');
  const [newFileLanguage, setNewFileLanguage] = useState<'python' | 'java' | 'javascript' | 'cpp'>('python');

  // Load projects when user is logged in
  const loadProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      return;
    }
    try {
      const data = await projectService.getProjects();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  }, [user]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Save theme to localStorage
  useEffect(() => {
    localStorage.setItem('nexusquest-theme', theme);
  }, [theme]);

  // Save font size to localStorage
  useEffect(() => {
    localStorage.setItem('nexusquest-fontsize', fontSize.toString());
  }, [fontSize]);

  // Save code to localStorage and sync with current file
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('nexusquest-code', code);
      // Auto-save to current file if one is selected
      if (currentProject && currentFile) {
        projectService.updateFile(currentProject._id, currentFile._id, { content: code })
          .catch(err => console.error('Failed to auto-save file:', err));
      }
    }, 1000); // Debounce 1 second
    return () => clearTimeout(timer);
  }, [code, currentProject, currentFile]);

  // Save language to localStorage
  useEffect(() => {
    localStorage.setItem('nexusquest-language', language);
  }, [language]);

  // Reset input state when language changes
  useEffect(() => {
    setWaitingForInput(false);
    setInputQueue([]);
    setExpectedInputCount(0);
    setCodeErrors([]);
  }, [language]);

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
    }
    // Clear previous error markers when switching language
    setCodeErrors([]);
  }, [language]);

  // Parse error text coming from backend to extract line numbers
  const parseErrorLocations = (errorText: string, lang: typeof language): CodeErrorMarker[] => {
    const markers: CodeErrorMarker[] = [];

    const addMarker = (line: number, message: string) => {
      if (!Number.isFinite(line) || line <= 0) return;
      markers.push({ line, message });
    };

    const lines = errorText.split('\n');

    if (lang === 'python') {
      for (const line of lines) {
        const m = line.match(/File\s+"<string>",\s+line\s+(\d+)/);
        if (m) {
          addMarker(parseInt(m[1], 10), errorText);
        }
      }
    } else if (lang === 'java') {
      for (const line of lines) {
        let m = line.match(/\.java:(\d+):\s+error:/);
        if (m) {
          addMarker(parseInt(m[1], 10), line.trim());
        }
        m = line.match(/\((?:[A-Za-z0-9_$.]+\.java):(\d+)\)/);
        if (m) {
          addMarker(parseInt(m[1], 10), line.trim());
        }
      }
    } else if (lang === 'javascript') {
      for (const line of lines) {
        let m = line.match(/<anonymous>:(\d+):\d+/);
        if (m) {
          addMarker(parseInt(m[1], 10), line.trim());
        }
        if (/^\w*Error:/.test(line)) {
          addMarker(1, line.trim());
        }
      }
    } else if (lang === 'cpp') {
      for (const line of lines) {
        const m = line.match(/main\.cpp:(\d+):\d*:\s+error:/);
        if (m) {
          addMarker(parseInt(m[1], 10), line.trim());
        }
      }
    }

    // Fallback: if nothing parsed but we have an error, attach it to first line
    if (markers.length === 0 && errorText.trim()) {
      addMarker(1, errorText.trim());
    }

    return markers;
  };

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
                       (language === 'javascript' && /readline|stdin/.test(code));
    
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
      let result;

      // If we're in a project, use multi-file execution
      if (currentProject && currentFile) {
        addToConsole(`📁 Running project: ${currentProject.name} (main: ${currentFile.name})`, 'info');

        // Get all project files with current editor content for the active file
        const projectFiles = currentProject.files.map(f => ({
          name: f.name,
          content: f._id === currentFile._id ? code.trim() : f.content,
          language: f.language
        }));

        result = await projectService.runProject(
          projectFiles,
          currentFile.name,
          currentProject.language,
          inputs.join(',')
        );
      } else {
        // Single file execution
        const response = await fetch('http://localhost:3001/api/run', {
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

        result = await response.json();
      }

      if (result.error) {
        addToConsole(result.error, 'error');
        // Extract error locations for highlighting in editor
        const effectiveLanguage = (currentProject?.language || language) as 'python' | 'java' | 'javascript' | 'cpp';
        const markers = parseErrorLocations(result.error, effectiveLanguage);
        setCodeErrors(markers);

        // Get AI error suggestions
        try {
          const errorAnalysis = await aiService.getErrorSuggestions(result.error, code, effectiveLanguage);
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
        setCodeErrors([]);
      }

      // Clear input queue after successful execution
      setInputQueue([]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
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
          ? 'border-gray-800 bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950'
          : 'border-gray-200 bg-gradient-to-r from-gray-50 via-white to-gray-50'
      } backdrop-blur-sm`}>
        <div className="px-4 py-2">
          <div className="flex items-center justify-between gap-4">
            {/* Logo only */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center shadow-md flex-shrink-0">
                <span className="text-white font-bold text-lg">N</span>
              </div>
            </div>

            {/* Center toolbar with language chooser and run button */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {inputQueue.length > 0 && (
                <div className="px-2 py-1 bg-yellow-500/10 border border-yellow-500/40 rounded-md flex items-center gap-1">
                  <span className="text-yellow-400 text-[10px] font-semibold">📥 {inputQueue.length} input{inputQueue.length > 1 ? 's' : ''}</span>
                </div>
              )}
              {/* Only show language selector when not in a project */}
              {!currentProject ? (
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'python' | 'java' | 'javascript' | 'cpp')}
                  className={`h-8 text-[11px] px-2 py-1 rounded border transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    theme === 'dark'
                      ? 'bg-blue-500/10 text-blue-300 border-blue-500/40 hover:bg-blue-500/20'
                      : 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
                  }`}
                >
                  <option value="python">Python 🐍</option>
                  <option value="javascript">JavaScript 📜</option>
                  <option value="java">Java ☕</option>
                  <option value="cpp">C++ ⚡</option>
                </select>
              ) : (
                <div className={`h-8 px-2 py-1 flex items-center gap-2 text-[11px] rounded border ${
                  theme === 'dark'
                    ? 'bg-gray-700/50 text-gray-300 border-gray-600'
                    : 'bg-gray-100 text-gray-600 border-gray-300'
                }`}>
                  <span>📁 {currentProject.name} {currentFile ? `/ ${currentFile.name}` : ''}</span>
                  <button
                    onClick={() => {
                      setCurrentProject(null);
                      setCurrentFile(null);
                      setCode(localStorage.getItem('nexusquest-code') || defaultCode);
                    }}
                    className={`p-0.5 rounded hover:bg-gray-500/30 ${
                      theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                    }`}
                    title="Close project"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <Button
                onClick={() => runCode()}
                disabled={isRunning}
                className={`h-8 px-3 flex items-center gap-1 text-xs ${
                  waitingForInput
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 shadow-yellow-500/30 animate-pulse'
                    : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-green-500/30'
                } text-white shadow-lg transition-all duration-200 hover:scale-105`}
              >
                <Play className="w-3 h-3" fill="currentColor" />
                {isRunning ? 'Running...' : waitingForInput ? 'Waiting for Input' : inputQueue.length > 0 ? `Run with ${inputQueue.length} input${inputQueue.length > 1 ? 's' : ''}` : 'Run Code'}
              </Button>
              <Button
                onClick={loadCodeFile}
                className="h-8 px-3 flex items-center gap-1 text-xs bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-md shadow-purple-500/30 transition-all duration-200 hover:scale-105"
              >
                <Upload className="w-3 h-3" />
                Open File
              </Button>
              <Button
                onClick={clearConsole}
                className="h-8 px-3 flex items-center gap-1 text-xs bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-md shadow-orange-500/30 transition-all duration-200 hover:scale-105"
              >
                <Square className="w-3 h-3" />
                Clear
              </Button>
              <Button
                onClick={explainSelectedCode}
                className="h-8 px-3 hidden sm:flex items-center gap-1 text-xs bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-md shadow-indigo-500/30 transition-all duration-200 hover:scale-105"
                title="Explain code with AI"
              >
                <Sparkles className="w-3 h-3" />
                Explain
              </Button>
              <Button
                onClick={downloadCode}
                className="h-8 px-3 hidden md:flex items-center gap-1 text-xs bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white shadow-md shadow-blue-500/30 transition-all duration-200 hover:scale-105"
              >
                <Download className="w-3 h-3" />
                Download
              </Button>
            </div>

            {/* User login section */}
            <div className="flex items-center gap-2 flex-shrink-0 relative">
              {user ? (
                <button
                  onClick={() => setShowSidePanel(true)}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                  }`}>
                    <User className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} />
                  </div>
                  <span className={`text-xs hidden sm:block ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {user.name}
                  </span>
                </button>
              ) : (
                <Button
                  onClick={() => navigate('/login')}
                  className={`h-8 px-3 flex items-center gap-1 text-xs ${
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700'
                      : 'bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400'
                  } text-white shadow-lg transition-all duration-200 hover:scale-105`}
                >
                  <LogIn className="w-3 h-3" />
                  Login
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout: editor + right project panel, console at bottom */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top area: editor + side panel */}
        <div className="flex-1 flex overflow-hidden px-4 pt-3 pb-2">
          {/* Code Editor */}
          <div className="flex-1 flex flex-col min-w-0 mr-2">
          <div className="mb-2 flex items-center justify-end">
            {codeErrors.length > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/40">
                {codeErrors.length} error{codeErrors.length > 1 ? 's' : ''}{' '}
                {`on line${codeErrors.length > 1 ? 's' : ''} `}
                {Array.from(new Set(codeErrors.map(e => e.line))).sort((a, b) => a - b).join(', ')}
              </span>
            )}
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
              errors={codeErrors}
              fontSize={fontSize}
            />
          </div>

        </div>

          {/* Right collapsible project panel */}
          <div
            className={`transition-all duration-200 flex flex-col border rounded-xl shadow-2xl overflow-hidden ${
              theme === 'dark'
                ? 'border-gray-700 bg-gray-900/70'
                : 'border-gray-200 bg-white/90'
            }`}
            style={{ width: isProjectPanelOpen ? 220 : 32 }}
          >
            <div
              className={`flex items-center justify-between px-2 py-1 border-b cursor-pointer ${
                theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
              }`}
              onClick={() => setIsProjectPanelOpen((prev) => !prev)}
            >
              {isProjectPanelOpen ? (
                <div className="flex items-center gap-1">
                  <FolderTree className="w-3 h-3 text-blue-400" />
                  <span className={`text-[11px] font-semibold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                    Project Explorer
                  </span>
                </div>
              ) : (
                <FolderTree className="w-3 h-3 mx-auto text-blue-400" />
              )}
              <button
                type="button"
                className={`p-0.5 rounded hover:bg-gray-700/40 ${!isProjectPanelOpen && 'hidden'}`}
              >
                {isProjectPanelOpen ? (
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                ) : (
                  <ChevronLeft className="w-3 h-3 text-gray-400" />
                )}
              </button>
            </div>
            {isProjectPanelOpen && (
              <div className="flex-1 overflow-auto text-[11px] py-1">
                {/* Header with New Project button */}
                <div className="px-2 pb-1 flex items-center justify-between">
                  <span className="font-semibold text-gray-400 uppercase tracking-wide text-[10px]">
                    Projects
                  </span>
                  {user && (
                    <button
                      onClick={() => setShowNewProjectInput(true)}
                      className="p-0.5 rounded hover:bg-gray-700/50 text-gray-400 hover:text-gray-200"
                      title="New Project"
                    >
                      <FolderPlus className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* New Project Input */}
                {showNewProjectInput && (
                  <div className="px-2 py-1">
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (newProjectName.trim()) {
                          try {
                            const result = await projectService.createProject(newProjectName.trim(), '', newProjectLanguage);
                            console.log('Project created:', result);
                            setNewProjectName('');
                            setNewProjectLanguage('python');
                            setShowNewProjectInput(false);
                            loadProjects();
                          } catch (err: unknown) {
                            const error = err as Error;
                            console.error('Failed to create project:', error);
                            alert('Failed to create project: ' + error.message);
                          }
                        }
                      }}
                      className="space-y-1"
                    >
                      <input
                        type="text"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="Project name..."
                        className={`w-full px-2 py-1 text-[11px] rounded border ${
                          theme === 'dark'
                            ? 'bg-gray-800 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setNewProjectName('');
                            setNewProjectLanguage('python');
                            setShowNewProjectInput(false);
                          }
                        }}
                      />
                      <select
                        value={newProjectLanguage}
                        onChange={(e) => setNewProjectLanguage(e.target.value as 'python' | 'java' | 'javascript' | 'cpp')}
                        className={`w-full px-2 py-1 text-[11px] rounded border ${
                          theme === 'dark'
                            ? 'bg-gray-800 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value="python">Python 🐍</option>
                        <option value="javascript">JavaScript 📜</option>
                        <option value="java">Java ☕</option>
                        <option value="cpp">C++ ⚡</option>
                      </select>
                      <button
                        type="submit"
                        className={`w-full px-2 py-1 text-[11px] rounded ${
                          theme === 'dark'
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                      >
                        Create Project
                      </button>
                    </form>
                  </div>
                )}

                {/* Projects List */}
                <div className="space-y-0.5 px-1">
                  {!user ? (
                    <div className={`px-2 py-4 text-center ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      <p>Login to see your projects</p>
                    </div>
                  ) : projects.length === 0 ? (
                    <div className={`px-2 py-4 text-center ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      <p>No projects yet</p>
                      <p className="text-[10px] mt-1">Click + to create one</p>
                    </div>
                  ) : (
                    projects.map((project) => (
                      <div key={project._id}>
                        {/* Project Header */}
                        <div
                          className={`flex items-center gap-1 px-1 py-0.5 rounded cursor-pointer group ${
                            currentProject?._id === project._id
                              ? theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'
                              : 'hover:bg-blue-500/10'
                          }`}
                        >
                          <button
                            onClick={() => {
                              setExpandedProjects(prev => {
                                const next = new Set(prev);
                                if (next.has(project._id)) {
                                  next.delete(project._id);
                                } else {
                                  next.add(project._id);
                                }
                                return next;
                              });
                            }}
                            className="p-0.5"
                          >
                            {expandedProjects.has(project._id) ? (
                              <ChevronDown className="w-3 h-3 text-gray-500" />
                            ) : (
                              <ChevronRight className="w-3 h-3 text-gray-500" />
                            )}
                          </button>
                          <FolderOpen className="w-3 h-3 text-yellow-500" />
                          <span
                            className={`flex-1 truncate ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
                            onClick={() => setCurrentProject(project)}
                          >
                            {project.name}
                          </span>
                          {/* Project Actions */}
                          <div className="hidden group-hover:flex items-center gap-0.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowNewFileInput(project._id);
                                setExpandedProjects(prev => new Set(prev).add(project._id));
                              }}
                              className="p-0.5 rounded hover:bg-gray-600/50 text-gray-400"
                              title="New File"
                            >
                              <FilePlus className="w-3 h-3" />
                            </button>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm(`Delete project "${project.name}"?`)) {
                                  try {
                                    await projectService.deleteProject(project._id);
                                    if (currentProject?._id === project._id) {
                                      setCurrentProject(null);
                                      setCurrentFile(null);
                                    }
                                    loadProjects();
                                  } catch (err) {
                                    console.error('Failed to delete project:', err);
                                  }
                                }
                              }}
                              className="p-0.5 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400"
                              title="Delete Project"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Files List (when expanded) */}
                        {expandedProjects.has(project._id) && (
                          <div className="ml-4 space-y-0.5">
                            {/* New File Input */}
                            {showNewFileInput === project._id && (
                              <div className="py-0.5">
                                <form
                                  onSubmit={async (e) => {
                                    e.preventDefault();
                                    if (newFileName.trim()) {
                                      try {
                                        await projectService.addFile(project._id, newFileName.trim(), '', newFileLanguage);
                                        setNewFileName('');
                                        setNewFileLanguage('python');
                                        setShowNewFileInput(null);
                                        loadProjects();
                                      } catch (err) {
                                        console.error('Failed to add file:', err);
                                        alert('Failed to add file');
                                      }
                                    }
                                  }}
                                  className="space-y-1"
                                >
                                  <input
                                    type="text"
                                    value={newFileName}
                                    onChange={(e) => setNewFileName(e.target.value)}
                                    placeholder="filename..."
                                    className={`w-full px-2 py-0.5 text-[11px] rounded border ${
                                      theme === 'dark'
                                        ? 'bg-gray-800 border-gray-600 text-white'
                                        : 'bg-white border-gray-300 text-gray-900'
                                    }`}
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Escape') {
                                        setNewFileName('');
                                        setNewFileLanguage('python');
                                        setShowNewFileInput(null);
                                      }
                                    }}
                                  />
                                  <select
                                    value={newFileLanguage}
                                    onChange={(e) => setNewFileLanguage(e.target.value as 'python' | 'java' | 'javascript' | 'cpp')}
                                    className={`w-full px-2 py-0.5 text-[11px] rounded border ${
                                      theme === 'dark'
                                        ? 'bg-gray-800 border-gray-600 text-white'
                                        : 'bg-white border-gray-300 text-gray-900'
                                    }`}
                                  >
                                    <option value="python">Python 🐍</option>
                                    <option value="javascript">JavaScript 📜</option>
                                    <option value="java">Java ☕</option>
                                    <option value="cpp">C++ ⚡</option>
                                  </select>
                                  <button
                                    type="submit"
                                    className={`w-full px-2 py-0.5 text-[11px] rounded ${
                                      theme === 'dark'
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                                    }`}
                                  >
                                    Add File
                                  </button>
                                </form>
                              </div>
                            )}

                            {/* File Items */}
                            {project.files.map((file) => (
                              <div
                                key={file._id}
                                className={`flex items-center gap-1 px-1 py-0.5 rounded cursor-pointer group ${
                                  currentFile?._id === file._id
                                    ? theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'
                                    : 'hover:bg-blue-500/10'
                                }`}
                                onClick={() => {
                                  setCurrentProject(project);
                                  setCurrentFile(file);
                                  setCode(file.content);
                                  // Set language based on file extension
                                  const ext = file.name.split('.').pop()?.toLowerCase();
                                  if (ext === 'py') setLanguage('python');
                                  else if (ext === 'js') setLanguage('javascript');
                                  else if (ext === 'java') setLanguage('java');
                                  else if (ext === 'cpp' || ext === 'cc') setLanguage('cpp');
                                }}
                              >
                                <File className="w-3 h-3 text-blue-400" />
                                <span className={`flex-1 truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {file.name}
                                </span>
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (confirm(`Delete file "${file.name}"?`)) {
                                      try {
                                        await projectService.deleteFile(project._id, file._id);
                                        if (currentFile?._id === file._id) {
                                          setCurrentFile(null);
                                        }
                                        loadProjects();
                                      } catch (err) {
                                        console.error('Failed to delete file:', err);
                                      }
                                    }
                                  }}
                                  className="hidden group-hover:block p-0.5 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400"
                                  title="Delete File"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ))}

                            {project.files.length === 0 && !showNewFileInput && (
                              <div className={`px-2 py-1 text-[10px] ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                No files
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom area: tabs (Console / Terminal) */}
        <div className="h-[30vh] min-h-[170px] px-4 pb-3">
          <div className="h-full flex flex-col">
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveBottomTab('console')}
                  className={`px-2 py-0.5 rounded-t-md border-b-2 ${
                    activeBottomTab === 'console'
                      ? 'border-emerald-400 text-emerald-300'
                      : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  Console
                </button>
                <button
                  type="button"
                  onClick={() => setActiveBottomTab('terminal')}
                  className={`px-2 py-0.5 rounded-t-md border-b-2 ${
                    activeBottomTab === 'terminal'
                      ? 'border-blue-400 text-blue-300'
                      : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  Terminal
                </button>
              </div>
              {activeBottomTab === 'console' && (
                <span className={`text-[10px] px-2 py-0.5 rounded border ${
                  theme === 'dark'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                }`}>{output.length} messages</span>
              )}
            </div>
            <div className={`flex-1 rounded-xl overflow-hidden border shadow-2xl ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-300'
            }`}>
              {activeBottomTab === 'console' ? (
                <Console 
                  output={output} 
                  height="100%" 
                  onInput={handleConsoleInput}
                  waitingForInput={waitingForInput}
                  theme={theme}
                />
              ) : (
                <div className={`h-full w-full font-mono text-xs flex flex-col ${
                  theme === 'dark'
                    ? 'bg-gradient-to-b from-gray-950 to-gray-900 text-gray-200'
                    : 'bg-gradient-to-b from-gray-100 to-white text-gray-800'
                }`}>
                  <div className={`px-3 py-2 border-b text-[11px] flex items-center justify-between ${
                    theme === 'dark' ? 'border-gray-800' : 'border-gray-300'
                  }`}>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                      Integrated Terminal (preview)
                    </span>
                    <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}>No shell attached</span>
                  </div>
                  <div className="flex-1 px-3 py-2 overflow-auto">
                    <div className={theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}>
                      Terminal support is not wired to a real shell yet.
                    </div>
                    <div className={theme === 'dark' ? 'text-gray-600 mt-2' : 'text-gray-700 mt-2'}>
                      Future features could include:
                    </div>
                    <ul className="mt-1 list-disc list-inside space-y-0.5 text-[11px]">
                      <li>Run build and test commands</li>
                      <li>Watch Docker status and logs</li>
                      <li>Interactive REPL for languages</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* User Side Panel */}
      {showSidePanel && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowSidePanel(false)}
          />
          {/* Panel */}
          <div className={`fixed top-0 right-0 h-full w-80 z-50 shadow-2xl transform transition-transform duration-300 ${
            theme === 'dark' ? 'bg-gray-900 border-l border-gray-800' : 'bg-white border-l border-gray-200'
          }`}>
            {/* Header */}
            <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                  }`}>
                    <User className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} />
                  </div>
                  <div>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {user?.name}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {user?.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSidePanel(false)}
                  className={`p-1 rounded-lg transition-colors ${
                    theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Menu Items */}
            <nav className="p-2">
              <button
                onClick={() => {
                  setShowSidePanel(false);
                  navigate('/profile');
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-gray-800 text-gray-300'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <User className="w-5 h-5" />
                <span>Profile</span>
              </button>

              <button
                onClick={() => {
                  setShowSidePanel(false);
                  navigate('/projects');
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-gray-800 text-gray-300'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <FolderOpen className="w-5 h-5" />
                <span>Projects</span>
              </button>

              <button
                onClick={() => {
                  setShowSidePanel(false);
                  navigate('/tournaments');
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-gray-800 text-gray-300'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <Trophy className="w-5 h-5" />
                <span>Tournaments</span>
              </button>

              {/* Settings Section */}
              <div className="mt-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'hover:bg-gray-800 text-gray-300'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5" />
                    <span>Settings</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform ${showSettings ? 'rotate-90' : ''}`} />
                </button>

                {showSettings && (
                  <div className={`mt-1 ml-4 mr-2 p-3 rounded-lg ${
                    theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-100'
                  }`}>
                    {/* Dark Mode Toggle */}
                    <div className="flex items-center justify-between py-2">
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Dark Mode
                      </span>
                      <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform flex items-center justify-center ${
                          theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                        }`}>
                          {theme === 'dark' ? (
                            <Moon className="w-2.5 h-2.5 text-blue-600" />
                          ) : (
                            <Sun className="w-2.5 h-2.5 text-yellow-500" />
                          )}
                        </div>
                      </button>
                    </div>

                    {/* Font Size Control */}
                    <div className="flex items-center justify-between py-2">
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Font Size
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setFontSize(Math.max(10, fontSize - 2))}
                          className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
                            theme === 'dark'
                              ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                          }`}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className={`w-8 text-center text-sm font-medium ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          {fontSize}
                        </span>
                        <button
                          onClick={() => setFontSize(Math.min(24, fontSize + 2))}
                          className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
                            theme === 'dark'
                              ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                          }`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </nav>

            {/* Logout at bottom */}
            <div className={`absolute bottom-0 left-0 right-0 p-4 border-t ${
              theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
            }`}>
              <button
                onClick={() => {
                  setShowSidePanel(false);
                  onLogout();
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-red-500/10 text-red-400'
                    : 'hover:bg-red-50 text-red-600'
                }`}
              >
                <LogOut className="w-5 h-5" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;