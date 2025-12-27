import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CodeEditor } from './components/CodeEditor';
import { Console } from './components/Console';
import { Terminal } from './components/Terminal';
import { Header } from './components/Header';
import { UserSidePanel } from './components/UserSidePanel';
import { AiAgent } from './components/AiAgent';
import { ProjectExplorer } from './components/ProjectExplorer';
import { VersionControl } from './components/VersionControl';
import ProjectDependencies from './components/ProjectDependencies';
import { getApiUrl } from './utils/apiHelpers';
import * as projectService from './services/projectService';
import { 
  defaultCode, 
  defaultPythonCode, 
  defaultJavaCode, 
  defaultJavaScriptCode, 
  defaultCppCode 
} from './constants/defaultCode';
import type { 
  Language, 
  Theme, 
  ConsoleOutput, 
  AppProps, 
  Project, 
  ProjectFile 
} from './types';

function App({ user, onLogout }: AppProps) {
  const navigate = useNavigate();
  const { projectId: urlProjectId } = useParams<{ projectId: string }>();

  // Theme state
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('nexusquest-theme');
    return (saved as Theme) || 'dark';
  });

  // Code state
  const [code, setCode] = useState(() => {
    const saved = localStorage.getItem('nexusquest-code');
    return saved || defaultCode;
  });
  const [output, setOutput] = useState<ConsoleOutput[]>([]);
  const [isRunning] = useState(false);
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('nexusquest-language');
    return (saved as Language) || 'python';
  });

  // Input state
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [inputQueue, setInputQueue] = useState<string[]>([]);

  // UI state
  const [isProjectPanelOpen, setIsProjectPanelOpen] = useState(true);
  const [activeBottomTab, setActiveBottomTab] = useState<'console' | 'terminal' | 'versions' | 'dependencies'>('console');
  const [codeToExecute, setCodeToExecute] = useState<{ code: string; timestamp: number; files?: { name: string; content: string }[]; mainFile?: string; dependencies?: Record<string, string>; projectId?: string; customLibraries?: Array<{ fileName: string; originalName: string; fileType: string }> } | null>(null);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [isAiAgentOpen, setIsAiAgentOpen] = useState(false);
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
        const response = await fetch(`${getApiUrl()}/api/auth/me`, {
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

  const [, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentFile, setCurrentFile] = useState<ProjectFile | null>(null);
  const [showNewFileInput, setShowNewFileInput] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [newFileLanguage, setNewFileLanguage] = useState<'python' | 'java' | 'javascript' | 'cpp'>('python');
  const [isSaving, setIsSaving] = useState(false);
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
      if (!user) {
        if (urlProjectId) {
          // Not logged in but trying to access a project - redirect to login
          navigate('/login');
        }
        return;
      }

      const projectsData = await loadProjects();
      // Priority: URL project ID > localStorage last project
      const targetProjectId = urlProjectId || localStorage.getItem('nexusquest-last-project');
      const lastFileId = localStorage.getItem('nexusquest-last-file');

      if (targetProjectId && projectsData) {
        let project = projectsData.find((p: Project) => p._id === targetProjectId);
        
        // If project not found in list but we have a URL project ID, fetch it directly
        if (!project && urlProjectId) {
          try {
            project = await projectService.getProject(urlProjectId);
          } catch (error) {
            console.error('Failed to fetch project:', error);
            navigate('/');
            return;
          }
        }

        if (project) {
          setCurrentProject(project);

          // When navigating from URL (newly created project), always open the main file (first file)
          if (urlProjectId) {
            // For newly created projects, open the main file (first file)
            if (project.files.length > 0) {
              const mainFile = project.files[0]; // Main file is always the first file
              setCurrentFile(mainFile);
              setCode(mainFile.content);
              setLanguage(mainFile.language as 'python' | 'java' | 'javascript' | 'cpp');
            }
          } else {
            // For returning users, try to restore last file or default to first file
            if (lastFileId) {
              const file = project.files.find((f: ProjectFile) => f._id === lastFileId);
              if (file) {
                setCurrentFile(file);
                setCode(file.content);
                setLanguage(file.language as 'python' | 'java' | 'javascript' | 'cpp');
                return;
              }
            }
            // If no file found but project has files, open the first one (main file)
            if (project.files.length > 0) {
              const firstFile = project.files[0];
              setCurrentFile(firstFile);
              setCode(firstFile.content);
              setLanguage(firstFile.language as 'python' | 'java' | 'javascript' | 'cpp');
            }
          }
        } else if (urlProjectId) {
          // Project from URL not found even after direct fetch - redirect to home
          navigate('/');
        }
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

  // Helper function to parse requirements.txt format
  const parseRequirementsTxt = useCallback((content: string): Record<string, string> => {
    const dependencies: Record<string, string> = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      // Remove comments and whitespace
      const trimmed = line.split('#')[0].trim();
      if (!trimmed) continue;
      
      // Parse common formats: package==version, package>=version, package<=version, package~=version, package
      // Match package name and optional version specifier
      const match = trimmed.match(/^([a-zA-Z0-9_-]+[a-zA-Z0-9._-]*)(?:\s*(==|>=|<=|~=|>|<)\s*([0-9.]+[a-zA-Z0-9._-]*))?/);
      if (match) {
        const packageName = match[1];
        const version = match[3] || '*';
        dependencies[packageName] = version;
      }
    }
    
    return dependencies;
  }, []);

  // Parse dependencies from package.json when file is opened or content changes
  useEffect(() => {
    if (currentProject && currentFile) {
      // Handle JavaScript package.json
      if (currentFile.name === 'package.json' && currentProject.language === 'javascript') {
        try {
          const parsed = JSON.parse(code);
          if (parsed.dependencies) {
            const currentDepsStr = JSON.stringify(currentProject.dependencies || {});
            const newDepsStr = JSON.stringify(parsed.dependencies);
            if (currentDepsStr !== newDepsStr) {
              // Update dependencies in current project state
              const projectId = currentProject._id;
              setCurrentProject(prev => {
                if (!prev || prev._id !== projectId) return prev;
                return { ...prev, dependencies: parsed.dependencies };
              });
              
              // Save dependencies to the backend
              const token = localStorage.getItem('nexusquest-token');
              fetch(`${getApiUrl()}/api/projects/${projectId}/dependencies`, {
                method: 'PUT',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ dependencies: parsed.dependencies })
              }).catch(err => {
                console.error('Failed to save dependencies to backend:', err);
              });
            }
          }
        } catch (e) {
          // Silently fail if package.json is invalid JSON
        }
      }
      // Handle Python requirements.txt
      else if (currentFile.name === 'requirements.txt' && currentProject.language === 'python') {
        try {
          const parsedDeps = parseRequirementsTxt(code);
          if (Object.keys(parsedDeps).length > 0) {
            const currentDepsStr = JSON.stringify(currentProject.dependencies || {});
            const newDepsStr = JSON.stringify(parsedDeps);
            if (currentDepsStr !== newDepsStr) {
              // Update dependencies in current project state
              const projectId = currentProject._id;
              setCurrentProject(prev => {
                if (!prev || prev._id !== projectId) return prev;
                return { ...prev, dependencies: parsedDeps };
              });
              
              // Save dependencies to the backend
              const token = localStorage.getItem('nexusquest-token');
              fetch(`${getApiUrl()}/api/projects/${projectId}/dependencies`, {
                method: 'PUT',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ dependencies: parsedDeps })
              }).catch(err => {
                console.error('Failed to save dependencies to backend:', err);
              });
            }
          }
        } catch (e) {
          // Silently fail if requirements.txt parsing fails
          console.error('Failed to parse requirements.txt:', e);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFile, code, parseRequirementsTxt]); // Intentionally exclude currentProject to avoid update loops

  // Console helper - defined early so saveFile can use it
  const addToConsole = useCallback((message: string, type: ConsoleOutput['type'] = 'output') => {
    setOutput(prev => [...prev, {
      type,
      message,
      timestamp: new Date()
    }]);
  }, []);

  // Manual save function
  const saveFile = useCallback(async () => {
    if (!currentProject || !currentFile) {
      // Just save to localStorage for standalone mode
      localStorage.setItem('nexusquest-code', code);
      addToConsole(' Code saved to local storage', 'info');
      return;
    }

    setIsSaving(true);
    try {
      await projectService.updateFile(currentProject._id, currentFile._id, { content: code });
      setLastSavedCode(code);
      setHasUnsavedChanges(false);
      addToConsole(` Saved: ${currentFile.name}`, 'info');

      // Update the file in the projects list
      setProjects(prev => prev.map(p =>
        p._id === currentProject._id
          ? { ...p, files: p.files.map(f => f._id === currentFile._id ? { ...f, content: code } : f) }
          : p
      ));
      
      // Update currentProject as well
      let updatedProject = { ...currentProject };
      updatedProject.files = updatedProject.files.map(f => 
        f._id === currentFile._id ? { ...f, content: code } : f
      );
      
      // If this is package.json, parse and update dependencies
      if (currentFile.name === 'package.json' && currentProject.language === 'javascript') {
        try {
          const parsed = JSON.parse(code);
          if (parsed.dependencies) {
            updatedProject.dependencies = parsed.dependencies;
            
            // Also save dependencies to the backend
            try {
              const token = localStorage.getItem('nexusquest-token');
              await fetch(`${getApiUrl()}/api/projects/${currentProject._id}/dependencies`, {
                method: 'PUT',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ dependencies: parsed.dependencies })
              });
              addToConsole(` Saved dependencies from package.json`, 'info');
            } catch (saveErr) {
              console.error('Failed to save dependencies to backend:', saveErr);
              addToConsole(` Dependencies updated locally but failed to save to backend`, 'info');
            }
          }
        } catch (e) {
          // Silently fail if package.json is invalid
        }
      }
      // If this is requirements.txt, parse and update dependencies
      else if (currentFile.name === 'requirements.txt' && currentProject.language === 'python') {
        try {
          const parsedDeps = parseRequirementsTxt(code);
          if (Object.keys(parsedDeps).length > 0) {
            updatedProject.dependencies = parsedDeps;
            
            // Also save dependencies to the backend
            try {
              const token = localStorage.getItem('nexusquest-token');
              await fetch(`${getApiUrl()}/api/projects/${currentProject._id}/dependencies`, {
                method: 'PUT',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ dependencies: parsedDeps })
              });
              addToConsole(` Saved dependencies from requirements.txt`, 'info');
            } catch (saveErr) {
              console.error('Failed to save dependencies to backend:', saveErr);
              addToConsole(` Dependencies updated locally but failed to save to backend`, 'info');
            }
          }
        } catch (e) {
          // Silently fail if requirements.txt parsing fails
          console.error('Failed to parse requirements.txt:', e);
        }
      }
      
      setCurrentProject(updatedProject);
    } catch (err) {
      console.error('Failed to save file:', err);
      addToConsole(` Failed to save: ${err}`, 'error');
    } finally {
      setIsSaving(false);
    }
  }, [currentProject, currentFile, code, addToConsole, parseRequirementsTxt]);

  // Keyboard shortcut: Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
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

    // If we have a project with multiple files, send all files for proper imports
    if (currentProject && currentProject.files.length > 0) {
      // Update the current file's content with the latest code before sending
      const filesForExecution = currentProject.files.map(f => ({
        name: f.name,
        content: f._id === currentFile?._id ? code.trim() : f.content
      }));

      // Find the main file (first non-package.json file, or first file if all are package.json)
      const mainFile = currentProject.files.find(f => f.name !== 'package.json') || currentProject.files[0];
      const mainFileName = mainFile.name;

      setCodeToExecute({
        code: code.trim(),
        timestamp: Date.now(),
        files: filesForExecution,
        mainFile: mainFileName,
        dependencies: currentProject.dependencies || {},
        projectId: currentProject._id,
        customLibraries: currentProject.customLibraries || []
      });

      addToConsole(` Running project with ${filesForExecution.length} file(s)...`, 'info');
    } else {
      // Single file mode (no project)
      setCodeToExecute({ code: code.trim(), timestamp: Date.now() });
      addToConsole(' Code sent to Terminal for interactive execution', 'info');
    }

    addToConsole(' Switch to Terminal tab to see output and provide inputs in real-time', 'info');
  };

  const clearConsole = () => {
    setOutput([]);
    setInputQueue([]);
    setWaitingForInput(false);
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
          addToConsole(` Loaded file: ${file.name}`, 'info');
        };
        reader.onerror = () => {
          addToConsole(` Error loading file: ${file.name}`, 'error');
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

  const handleConsoleInput = (_value: string) => {
    // Console input disabled - now using Terminal for interactive execution
    addToConsole(' Code execution moved to Terminal tab for real-time interaction', 'info');
    addToConsole('   Click the Terminal tab to see and interact with your running code', 'output');
  };

  // Close project handler
  const handleCloseProject = () => {
    setCurrentProject(null);
    setCurrentFile(null);
    setCode(localStorage.getItem('nexusquest-code') || defaultCode);
    localStorage.removeItem('nexusquest-last-project');
    localStorage.removeItem('nexusquest-last-file');
    navigate('/');
  };

  // Open file handler
  const handleOpenFile = (file: ProjectFile) => {
    setCurrentFile(file);
    setCode(file.content);
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'py') setLanguage('python');
    else if (ext === 'js') setLanguage('javascript');
    else if (ext === 'java') setLanguage('java');
    else if (ext === 'cpp' || ext === 'cc' || ext === 'h' || ext === 'hpp') setLanguage('cpp');
  };

  // Delete project handler
  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (confirm(`Delete project "${projectName}"?`)) {
      try {
        await projectService.deleteProject(projectId);
        if (currentProject?._id === projectId) {
          handleCloseProject();
        }
        loadProjects();
      } catch (err) {
        console.error('Failed to delete project:', err);
      }
    }
  };

  // Add file handler
  const handleAddFile = async (fileName: string, folderPath?: string) => {
    if (!currentProject || !fileName.trim()) return;

    try {
      const extensions: Record<Language, string> = {
        python: '.py', javascript: '.js', java: '.java', cpp: '.cpp'
      };
      let name = fileName.trim();
      const ext = extensions[newFileLanguage];
      const hasExtension = ['.py', '.js', '.java', '.cpp', '.h', '.hpp'].some(e => name.endsWith(e));
      if (!hasExtension && ext) name += ext;
      if (folderPath) name = `${folderPath}/${name}`;

      await projectService.addFile(currentProject._id, name, '', newFileLanguage);
      setNewFileName('');
      setNewFileLanguage('python');
      setShowNewFileInput(null);

      // Refresh current project
      const updatedProject = await projectService.getProject(currentProject._id);
      setCurrentProject(updatedProject);
      loadProjects();
    } catch (err) {
      console.error('Failed to add file:', err);
      alert('Failed to add file');
    }
  };

  // Delete file handler
  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (!currentProject) return;
    if (confirm(`Delete file "${fileName}"?`)) {
      try {
        await projectService.deleteFile(currentProject._id, fileId);
        if (currentFile?._id === fileId) {
          setCurrentFile(null);
        }
        // Refresh current project
        const updatedProject = await projectService.getProject(currentProject._id);
        setCurrentProject(updatedProject);
        loadProjects();
      } catch (err) {
        console.error('Failed to delete file:', err);
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
      <Header
        theme={theme}
        user={user}
        avatarImage={avatarImage}
        language={language}
        setLanguage={setLanguage}
        currentProject={currentProject}
        currentFile={currentFile}
        isRunning={isRunning}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        waitingForInput={waitingForInput}
        inputQueue={inputQueue}
        onRun={runCode}
        onSave={saveFile}
        onClear={clearConsole}
        onDownload={downloadCode}
        onLoadFile={loadCodeFile}
        onCloseProject={handleCloseProject}
        onShowSidePanel={() => setShowSidePanel(true)}
        onToggleAiAgent={() => setIsAiAgentOpen(!isAiAgentOpen)}
      />

      {/* AI Agent */}
      <AiAgent
        isOpen={isAiAgentOpen}
        onClose={() => setIsAiAgentOpen(false)}
        theme={theme}
        currentCode={code}
        language={language}
      />

      {/* Main Layout: editor + right project panel, console at bottom */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden">
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
                onSave={saveFile}
              />
            </div>
          </div>

          {/* Right collapsible project panel */}
          <ProjectExplorer
            theme={theme}
            user={user}
            isOpen={isProjectPanelOpen}
            setIsOpen={setIsProjectPanelOpen}
            currentProject={currentProject}
            currentFile={currentFile}
            showNewFileInput={showNewFileInput}
            newFileName={newFileName}
            newFileLanguage={newFileLanguage}
            expandedFolders={expandedFolders}
            setShowNewFileInput={setShowNewFileInput}
            setNewFileName={setNewFileName}
            setNewFileLanguage={setNewFileLanguage}
            setExpandedFolders={setExpandedFolders}
            onOpenFile={handleOpenFile}
            onDeleteProject={handleDeleteProject}
            onAddFile={handleAddFile}
            onDeleteFile={handleDeleteFile}
            onCloseProject={handleCloseProject}
          />
        </div>

        {/* Bottom area: tabs (Console / Terminal / Versions) */}
        <div className={`${activeBottomTab === 'dependencies' ? 'px-4 pb-3' : 'h-[30vh] min-h-[170px] px-4 pb-3'}`}>
          <div className={`${activeBottomTab === 'dependencies' ? 'flex flex-col' : 'h-full flex flex-col'}`}>
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
                <button
                  type="button"
                  onClick={() => setActiveBottomTab('versions')}
                  className={`px-2 py-0.5 rounded-t-md border-b-2 ${
                    activeBottomTab === 'versions'
                      ? 'border-purple-400 text-purple-300'
                      : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  Versions
                </button>
                {currentProject && (
                  <button
                    type="button"
                    onClick={() => setActiveBottomTab('dependencies')}
                    className={`px-2 py-0.5 rounded-t-md border-b-2 ${
                      activeBottomTab === 'dependencies'
                        ? 'border-orange-400 text-orange-300'
                        : 'border-transparent text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    Dependencies
                  </button>
                )}
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
              ) : activeBottomTab === 'terminal' ? (
                <Terminal
                  height="100%"
                  theme={theme}
                  language={language}
                  codeToExecute={codeToExecute}
                />
              ) : activeBottomTab === 'dependencies' && currentProject ? (
                <ProjectDependencies
                  projectId={currentProject._id}
                  language={currentProject.language}
                  dependencies={currentProject.dependencies || {}}
                  theme={theme}
                  onDependenciesChange={async (newDeps) => {
                    if (!currentProject) return;
                    try {
                      const token = localStorage.getItem('nexusquest-token');

                      // Update dependencies in the backend
                      await fetch(`${getApiUrl()}/api/projects/${currentProject._id}/dependencies`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ dependencies: newDeps })
                      });

                      // Update current project state
                      setCurrentProject(prev => {
                        if (!prev) return prev;
                        return { ...prev, dependencies: newDeps };
                      });

                      // For JavaScript projects, also update the package.json file
                      if (currentProject.language === 'javascript') {
                        const packageJsonFile = currentProject.files.find(f => f.name === 'package.json');
                        if (packageJsonFile) {
                          try {
                            const parsed = JSON.parse(packageJsonFile.content);
                            parsed.dependencies = newDeps;
                            const updatedContent = JSON.stringify(parsed, null, 2);

                            // Update the file in the backend
                            await projectService.updateFile(currentProject._id, packageJsonFile._id, { content: updatedContent });

                            // Update the file in the projects list
                            setProjects(prev => prev.map(p =>
                              p._id === currentProject._id
                                ? { ...p, files: p.files.map(f => f._id === packageJsonFile._id ? { ...f, content: updatedContent } : f) }
                                : p
                            ));

                            // If currently viewing package.json, update the code editor
                            if (currentFile?._id === packageJsonFile._id) {
                              setCode(updatedContent);
                              setLastSavedCode(updatedContent);
                            }
                          } catch (parseErr) {
                            console.warn('Failed to update package.json file:', parseErr);
                          }
                        }
                      }
                      // For Python projects, also update the requirements.txt file
                      else if (currentProject.language === 'python') {
                        const requirementsFile = currentProject.files.find(f => f.name === 'requirements.txt');
                        if (requirementsFile) {
                          try {
                            const requirementsContent = Object.entries(newDeps)
                              .map(([name, version]) => {
                                if (version === '*' || version === 'latest') return name;
                                return `${name}${version.startsWith('==') || version.startsWith('>=') || version.startsWith('<=') ? '' : '=='}${version}`;
                              })
                              .join('\n');

                            // Update the file in the backend
                            await projectService.updateFile(currentProject._id, requirementsFile._id, { content: requirementsContent });

                            // Update the file in the projects list
                            setProjects(prev => prev.map(p =>
                              p._id === currentProject._id
                                ? { ...p, files: p.files.map(f => f._id === requirementsFile._id ? { ...f, content: requirementsContent } : f) }
                                : p
                            ));

                            // If currently viewing requirements.txt, update the code editor
                            if (currentFile?._id === requirementsFile._id) {
                              setCode(requirementsContent);
                              setLastSavedCode(requirementsContent);
                            }
                          } catch (parseErr) {
                            console.warn('Failed to update requirements.txt file:', parseErr);
                          }
                        }
                      }

                      addToConsole('✓ Dependencies updated and saved', 'info');
                    } catch (err) {
                      console.error('Failed to save dependencies:', err);
                      addToConsole('✗ Failed to save dependencies', 'error');
                    }
                  }}
                />
              ) : (
                <div className={`flex items-center justify-center text-gray-500 ${theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-100/50'}`}>
                  <p>Select a tab above</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
