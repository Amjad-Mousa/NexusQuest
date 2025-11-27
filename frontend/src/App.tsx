import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CodeEditor } from './components/CodeEditor';
import { Console } from './components/Console';
import { Terminal } from './components/Terminal';
import { Button } from './components/ui/button';
import { Play, Square, Download, Upload, Sparkles, FolderTree, ChevronRight, ChevronLeft, User, LogIn, LogOut, X, FolderOpen, Trophy, Settings, Moon, Sun, Minus, Plus, FilePlus, FolderPlus, Trash2, ChevronDown, File, Save, Folder } from 'lucide-react';
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
// Popular frameworks: express, axios, lodash, moment available
// NOTE: Browser functions (prompt, alert, document) are not available
// This runs in Node.js environment

console.log("Hello from JavaScript!");

// Example: Using lodash
const _ = require('lodash');
const numbers = [1, 2, 3, 4, 5];
const doubled = _.map(numbers, n => n * 2);
console.log("Doubled:", doubled);

// Example: Calculate sum
function calculateSum(arr) {
    return arr.reduce((sum, num) => sum + num, 0);
}
console.log("Sum of numbers:", calculateSum([10, 20, 30]));

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
  const { projectId: urlProjectId } = useParams<{ projectId?: string }>();
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
  const [isProjectPanelOpen, setIsProjectPanelOpen] = useState(true);
  const [activeBottomTab, setActiveBottomTab] = useState<'console' | 'terminal'>('console');
  const [codeToExecute, setCodeToExecute] = useState<{ code: string; timestamp: number } | null>(null);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [fontSize, setFontSize] = useState<number>(() => {
    const saved = localStorage.getItem('nexusquest-fontsize');
    return saved ? parseInt(saved) : 14;
  });
  const [avatarImage, setAvatarImage] = useState<string | null>(null);

  // Load user avatar
  useEffect(() => {
    const loadUserAvatar = async () => {
      try {
        const token = localStorage.getItem('nexusquest-token');
        const response = await fetch('http://localhost:9876/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (data.success && data.user) {
          setAvatarImage(data.user.avatarImage || null);
        }
      } catch (error) {
        console.error('Failed to load user avatar:', error);
      }
    };
    loadUserAvatar();
  }, []);

  // Project state
  const [projects, setProjects] = useState<Project[]>([]); // Used for session restoration
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentFile, setCurrentFile] = useState<ProjectFile | null>(null);
  const [showNewFileInput, setShowNewFileInput] = useState<string | null>(null); // null, project._id, or "folder:path"
  const [newFileName, setNewFileName] = useState('');
  const [newFileLanguage, setNewFileLanguage] = useState<'python' | 'java' | 'javascript' | 'cpp'>('python');
  const [isSaving, setIsSaving] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedCode, setLastSavedCode] = useState<string>('');

  // Load projects when user is logged in
  const loadProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      return;
    }
    try {
      const data = await projectService.getProjects();
      setProjects(data);
      return data;
    } catch (error) {
      console.error('Failed to load projects:', error);
      return [];
    }
  }, [user]);

  // Load projects and restore last session (or load project from URL)
  useEffect(() => {
    const initSession = async () => {
      const projectsData = await loadProjects();

      // If user is logged in, try to restore session
      if (user && projectsData && projectsData.length > 0) {
        // Priority: URL project ID > localStorage last project
        const targetProjectId = urlProjectId || localStorage.getItem('nexusquest-last-project');
        const lastFileId = localStorage.getItem('nexusquest-last-file');

        if (targetProjectId) {
          const project = projectsData.find((p: Project) => p._id === targetProjectId);
          if (project) {
            setCurrentProject(project);

            // Find the last file or default to first file
            if (lastFileId && !urlProjectId) {
              // Only use last file if not coming from URL (URL should show first file)
              const file = project.files.find((f: ProjectFile) => f._id === lastFileId);
              if (file) {
                setCurrentFile(file);
                setCode(file.content);
                setLanguage(file.language as 'python' | 'java' | 'javascript' | 'cpp');
                return;
              }
            }
            // If no file found but project has files, open the first one
            if (project.files.length > 0) {
              const firstFile = project.files[0];
              setCurrentFile(firstFile);
              setCode(firstFile.content);
              setLanguage(firstFile.language as 'python' | 'java' | 'javascript' | 'cpp');
            }
          } else if (urlProjectId) {
            // Project from URL not found - redirect to home
            navigate('/');
          }
        }
      } else if (urlProjectId && !user) {
        // Not logged in but trying to access a project - redirect to login
        navigate('/login');
      }
    };

    initSession();
  }, [user, urlProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save current project/file to localStorage when they change
  useEffect(() => {
    if (currentProject) {
      localStorage.setItem('nexusquest-last-project', currentProject._id);
    } else {
      localStorage.removeItem('nexusquest-last-project');
    }
  }, [currentProject]);

  useEffect(() => {
    if (currentFile) {
      localStorage.setItem('nexusquest-last-file', currentFile._id);
    } else {
      localStorage.removeItem('nexusquest-last-file');
    }
  }, [currentFile]);

  // Clear project state and show default code when user logs out
  useEffect(() => {
    if (!user) {
      setCurrentProject(null);
      setCurrentFile(null);
      setProjects([]);
      setCode(defaultPythonCode);
      setLanguage('python');
    }
  }, [user]);

  // Save theme to localStorage
  useEffect(() => {
    localStorage.setItem('nexusquest-theme', theme);
  }, [theme]);

  // Save font size to localStorage
  useEffect(() => {
    localStorage.setItem('nexusquest-fontsize', fontSize.toString());
  }, [fontSize]);

  // Track unsaved changes
  useEffect(() => {
    if (currentFile) {
      setHasUnsavedChanges(code !== lastSavedCode);
    }
  }, [code, lastSavedCode, currentFile]);

  // Update lastSavedCode when file changes
  useEffect(() => {
    if (currentFile) {
      setLastSavedCode(currentFile.content);
    }
  }, [currentFile]);

  // Manual save function
  const saveFile = useCallback(async () => {
    if (!currentProject || !currentFile) {
      // Just save to localStorage for standalone mode
      localStorage.setItem('nexusquest-code', code);
      addToConsole('💾 Code saved to local storage', 'info');
      return;
    }

    setIsSaving(true);
    try {
      await projectService.updateFile(currentProject._id, currentFile._id, { content: code });
      setLastSavedCode(code);
      setHasUnsavedChanges(false);
      addToConsole(`💾 Saved: ${currentFile.name}`, 'info');

      // Update the file in the projects list
      setProjects(prev => prev.map(p =>
        p._id === currentProject._id
          ? { ...p, files: p.files.map(f => f._id === currentFile._id ? { ...f, content: code } : f) }
          : p
      ));
      // Update currentProject as well
      setCurrentProject(prev => prev ? {
        ...prev,
        files: prev.files.map(f => f._id === currentFile._id ? { ...f, content: code } : f)
      } : null);
    } catch (err) {
      console.error('Failed to save file:', err);
      addToConsole(`❌ Failed to save: ${err}`, 'error');
    } finally {
      setIsSaving(false);
    }
  }, [currentProject, currentFile, code]);

  // Keyboard shortcut: Shift+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveFile();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveFile]);

  // Save code to localStorage (for standalone mode only, no auto-save for projects)
  useEffect(() => {
    if (!currentProject) {
      const timer = setTimeout(() => {
        localStorage.setItem('nexusquest-code', code);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [code, currentProject]);

  // Save language to localStorage
  useEffect(() => {
    localStorage.setItem('nexusquest-language', language);
  }, [language]);

  // Reset input state when language changes
  useEffect(() => {
    setWaitingForInput(false);
    setInputQueue([]);
  }, [language]);

  // Change default code when language changes (only when not logged in or not in a project)
  useEffect(() => {
    // Only show default code if user is NOT logged in (temporary coding mode)
    // If user is logged in, they should be working with projects
    if (!user && !currentProject) {
      if (language === 'python') {
        setCode(defaultPythonCode);
      } else if (language === 'java') {
        setCode(defaultJavaCode);
      } else if (language === 'javascript') {
        setCode(defaultJavaScriptCode);
      } else if (language === 'cpp') {
        setCode(defaultCppCode);
      }
    }
  }, [language, user, currentProject]);

  // Parse error text coming from backend to extract line numbers
  const runCode = async () => {
    if (!code.trim()) {
      addToConsole('Please write some code first!', 'error');
      return;
    }

    // Switch to Terminal for interactive execution
    setActiveBottomTab('terminal');
    
    // Send code to Terminal for interactive execution
    setCodeToExecute({ code: code.trim(), timestamp: Date.now() });
    
    addToConsole('⏳ Code sent to Terminal for interactive execution', 'info');
    addToConsole('💡 Switch to Terminal tab to see output and provide inputs in real-time', 'info');
  };

  const clearConsole = () => {
    setOutput([]);
    setInputQueue([]);
    setWaitingForInput(false);
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

  const handleConsoleInput = (_value: string) => {
    // Console input disabled - now using Terminal for interactive execution
    addToConsole('💡 Code execution moved to Terminal tab for real-time interaction', 'info');
    addToConsole('   Click the Terminal tab to see and interact with your running code', 'output');
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
                      navigate('/');
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
                onClick={saveFile}
                disabled={isSaving || (!currentProject && !hasUnsavedChanges)}
                className={`h-8 px-3 flex items-center gap-1 text-xs transition-all duration-200 hover:scale-105 ${
                  hasUnsavedChanges
                    ? 'bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white shadow-md shadow-yellow-500/30'
                    : 'bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white shadow-md shadow-slate-500/30'
                }`}
                title="Save file (Shift+S)"
              >
                <Save className="w-3 h-3" />
                {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save*' : 'Save'}
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
                {/* Header with All Projects button */}
                <div className="px-2 pb-1 flex items-center justify-between">
                  <span className="font-semibold text-gray-400 uppercase tracking-wide text-[10px]">
                    {currentProject ? 'Current Project' : 'Project'}
                  </span>
                  {user && (
                    <button
                      onClick={() => navigate('/projects')}
                      className="p-0.5 rounded hover:bg-gray-700/50 text-gray-400 hover:text-gray-200"
                      title="All Projects"
                    >
                      <FolderPlus className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Current Project Files */}
                <div className="space-y-0.5 px-1">
                  {!user ? (
                    <div className={`px-2 py-4 text-center ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      <p>Login to see your projects</p>
                    </div>
                  ) : !currentProject ? (
                    <div className={`px-2 py-4 text-center ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      <p>No project open</p>
                      <button
                        onClick={() => navigate('/projects')}
                        className={`mt-2 text-[11px] px-3 py-1 rounded ${
                          theme === 'dark'
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                      >
                        Open Project
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Current Project Header */}
                      <div
                        className={`flex items-center gap-1 px-1 py-0.5 rounded group cursor-pointer ${
                          theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'
                        }`}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({ x: e.clientX, y: e.clientY });
                        }}
                      >
                        <ChevronDown className="w-3 h-3 text-gray-500" />
                        <FolderOpen className="w-3 h-3 text-yellow-500" />
                        <span className={`flex-1 truncate font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                          {currentProject.name}
                        </span>
                        {/* Project Actions */}
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => {
                              setShowNewFileInput(currentProject._id);
                            }}
                            className="p-0.5 rounded hover:bg-gray-600/50 text-gray-400"
                            title="New File"
                          >
                            <FilePlus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => {
                              const folderName = prompt('Enter folder name:');
                              if (folderName && folderName.trim()) {
                                // Create folder by adding a placeholder file (folder/.gitkeep style)
                                // Actually, we'll just prompt for folder name and let user add files to it
                                setShowNewFileInput(`folder:${folderName.trim()}`);
                                setExpandedFolders(prev => new Set(prev).add(folderName.trim()));
                              }
                            }}
                            className="p-0.5 rounded hover:bg-gray-600/50 text-gray-400"
                            title="New Folder"
                          >
                            <FolderPlus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`Delete project "${currentProject.name}"?`)) {
                                try {
                                  await projectService.deleteProject(currentProject._id);
                                  setCurrentProject(null);
                                  setCurrentFile(null);
                                  navigate('/');
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

                      {/* Context Menu */}
                      {contextMenu && (
                        <>
                          {/* Backdrop to close menu */}
                          <div
                            className="fixed inset-0 z-50"
                            onClick={() => setContextMenu(null)}
                          />
                          {/* Menu */}
                          <div
                            className={`fixed z-50 py-1 rounded-md shadow-lg border min-w-[120px] ${
                              theme === 'dark'
                                ? 'bg-gray-800 border-gray-700'
                                : 'bg-white border-gray-200'
                            }`}
                            style={{ left: contextMenu.x, top: contextMenu.y }}
                          >
                            <button
                              onClick={() => {
                                setCurrentProject(null);
                                setCurrentFile(null);
                                setCode(defaultPythonCode);
                                setLanguage('python');
                                localStorage.removeItem('nexusquest-last-project');
                                localStorage.removeItem('nexusquest-last-file');
                                navigate('/');
                                setContextMenu(null);
                              }}
                              className={`w-full px-3 py-1.5 text-left text-[11px] flex items-center gap-2 ${
                                theme === 'dark'
                                  ? 'hover:bg-gray-700 text-gray-300'
                                  : 'hover:bg-gray-100 text-gray-700'
                              }`}
                            >
                              <X className="w-3 h-3" />
                              Close Project
                            </button>
                          </div>
                        </>
                      )}

                      {/* Files Tree */}
                      <div className="ml-4 space-y-0.5 mt-0.5">
                        {(() => {
                          // Build tree structure from flat file list
                          interface TreeNode {
                            name: string;
                            path: string;
                            isFolder: boolean;
                            file?: ProjectFile;
                            children: TreeNode[];
                          }

                          const buildTree = (files: ProjectFile[]): TreeNode[] => {
                            const root: TreeNode[] = [];
                            const folders = new Map<string, TreeNode>();

                            // Sort files: folders first, then by name
                            const sortedFiles = [...files].sort((a, b) => {
                              const aDepth = a.name.split('/').length;
                              const bDepth = b.name.split('/').length;
                              if (aDepth !== bDepth) return aDepth - bDepth;
                              return a.name.localeCompare(b.name);
                            });

                            sortedFiles.forEach(file => {
                              const parts = file.name.split('/');
                              if (parts.length === 1) {
                                // Root level file
                                root.push({ name: file.name, path: file.name, isFolder: false, file, children: [] });
                              } else {
                                // File in folder - create folder structure
                                let currentPath = '';
                                let currentLevel = root;
                                for (let i = 0; i < parts.length - 1; i++) {
                                  const folderName = parts[i];
                                  currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;

                                  let folder = folders.get(currentPath);
                                  if (!folder) {
                                    folder = { name: folderName, path: currentPath, isFolder: true, children: [] };
                                    folders.set(currentPath, folder);
                                    currentLevel.push(folder);
                                  }
                                  currentLevel = folder.children;
                                }
                                // Add file to deepest folder
                                currentLevel.push({ name: parts[parts.length - 1], path: file.name, isFolder: false, file, children: [] });
                              }
                            });

                            // Sort: folders first, then files alphabetically
                            const sortNodes = (nodes: TreeNode[]) => {
                              nodes.sort((a, b) => {
                                if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
                                return a.name.localeCompare(b.name);
                              });
                              nodes.forEach(n => sortNodes(n.children));
                            };
                            sortNodes(root);
                            return root;
                          };

                          const renderNode = (node: TreeNode, depth: number = 0): JSX.Element => {
                            if (node.isFolder) {
                              const isExpanded = expandedFolders.has(node.path);
                              return (
                                <div key={node.path}>
                                  <div
                                    className={`flex items-center gap-1 px-1 py-0.5 rounded cursor-pointer group hover:bg-blue-500/10`}
                                    style={{ paddingLeft: `${depth * 12}px` }}
                                    onClick={() => {
                                      setExpandedFolders(prev => {
                                        const next = new Set(prev);
                                        if (next.has(node.path)) next.delete(node.path);
                                        else next.add(node.path);
                                        return next;
                                      });
                                    }}
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      // Could add folder context menu here
                                    }}
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="w-3 h-3 text-gray-500" />
                                    ) : (
                                      <ChevronRight className="w-3 h-3 text-gray-500" />
                                    )}
                                    {isExpanded ? (
                                      <FolderOpen className="w-3 h-3 text-yellow-500" />
                                    ) : (
                                      <Folder className="w-3 h-3 text-yellow-500" />
                                    )}
                                    <span className={`flex-1 truncate ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                      {node.name}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowNewFileInput(`folder:${node.path}`);
                                        setExpandedFolders(prev => new Set(prev).add(node.path));
                                      }}
                                      className="hidden group-hover:block p-0.5 rounded hover:bg-gray-600/50 text-gray-400"
                                      title="New File in Folder"
                                    >
                                      <FilePlus className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                  {isExpanded && node.children.map(child => renderNode(child, depth + 1))}
                                </div>
                              );
                            } else {
                              const file = node.file!;
                              return (
                                <div
                                  key={file._id}
                                  className={`flex items-center gap-1 px-1 py-0.5 rounded cursor-pointer group ${
                                    currentFile?._id === file._id
                                      ? theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'
                                      : 'hover:bg-blue-500/10'
                                  }`}
                                  style={{ paddingLeft: `${depth * 12 + 16}px` }}
                                  onClick={() => {
                                    setCurrentFile(file);
                                    setCode(file.content);
                                    const ext = file.name.split('.').pop()?.toLowerCase();
                                    if (ext === 'py') setLanguage('python');
                                    else if (ext === 'js') setLanguage('javascript');
                                    else if (ext === 'java') setLanguage('java');
                                    else if (ext === 'cpp' || ext === 'cc' || ext === 'h' || ext === 'hpp') setLanguage('cpp');
                                  }}
                                >
                                  <File className="w-3 h-3 text-blue-400" />
                                  <span className={`flex-1 truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {node.name}
                                  </span>
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (confirm(`Delete file "${file.name}"?`)) {
                                        try {
                                          await projectService.deleteFile(currentProject._id, file._id);
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
                              );
                            }
                          };

                          const tree = buildTree(currentProject.files);
                          return tree.map(node => renderNode(node));
                        })()}

                        {/* New File Input - at root or in folder */}
                        {(showNewFileInput === currentProject._id || showNewFileInput?.startsWith('folder:')) && (
                          <div className="py-0.5" style={{ paddingLeft: showNewFileInput?.startsWith('folder:') ? '16px' : '0px' }}>
                            <form
                              onSubmit={async (e) => {
                                e.preventDefault();
                                if (newFileName.trim()) {
                                  try {
                                    const extensions: Record<string, string> = {
                                      python: '.py',
                                      javascript: '.js',
                                      java: '.java',
                                      cpp: '.cpp'
                                    };
                                    let fileName = newFileName.trim();
                                    const ext = extensions[newFileLanguage];
                                    const hasExtension = ['.py', '.js', '.java', '.cpp', '.h', '.hpp'].some(e => fileName.endsWith(e));
                                    if (!hasExtension && ext) {
                                      fileName += ext;
                                    }
                                    // If creating in a folder, prepend the folder path
                                    if (showNewFileInput?.startsWith('folder:')) {
                                      const folderPath = showNewFileInput.replace('folder:', '');
                                      fileName = `${folderPath}/${fileName}`;
                                    }
                                    await projectService.addFile(currentProject._id, fileName, '', newFileLanguage);
                                    setNewFileName('');
                                    setNewFileLanguage('python');
                                    setShowNewFileInput(null);
                                    // Refresh current project to show new file immediately
                                    const updatedProject = await projectService.getProject(currentProject._id);
                                    setCurrentProject(updatedProject);
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

                        {currentProject.files.length === 0 && !showNewFileInput && (
                          <div className={`px-2 py-1 text-[10px] ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                            No files yet
                          </div>
                        )}
                      </div>
                    </div>
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
                <Terminal 
                  height="100%" 
                  theme={theme}
                  language={language}
                  codeToExecute={codeToExecute}
                />
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
                  {avatarImage ? (
                    <img 
                      src={avatarImage} 
                      alt="Avatar" 
                      className="w-10 h-10 rounded-full object-cover" 
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {user?.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
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
                  navigate('/');
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