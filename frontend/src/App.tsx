import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CodeEditor } from './components/CodeEditor';
import { Console } from './components/Console';
import { Terminal } from './components/Terminal';
import { Header } from './components/Header';
import { ProjectExplorer } from './components/ProjectExplorer';
import { UserSidePanel } from './components/UserSidePanel';
import { AiAgent } from './components/AiAgent';
import { VersionControl } from './components/VersionControl';
import * as aiService from './services/aiService';
import * as projectService from './services/projectService';
import {
  defaultCode,
  defaultPythonCode,
  defaultJavaCode,
  defaultJavaScriptCode,
  defaultCppCode
} from './constants/defaultCode';
import type { Language, Theme, ConsoleOutput, AppProps, Project, ProjectFile } from './types';

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
  const [isRunning] = useState(false); // Currently not used but kept for Header component
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('nexusquest-language');
    return (saved as Language) || 'python';
  });

  // Input state
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [inputQueue, setInputQueue] = useState<string[]>([]);

  // UI state
  const [isProjectPanelOpen, setIsProjectPanelOpen] = useState(true);
  const [activeBottomTab, setActiveBottomTab] = useState<'console' | 'terminal' | 'versions'>('console');
  const [codeToExecute, setCodeToExecute] = useState<{ code: string; timestamp: number; files?: { name: string; content: string }[]; mainFile?: string } | null>(null);
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
  const [, setProjects] = useState<Project[]>([]); // Used for session restoration
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentFile, setCurrentFile] = useState<ProjectFile | null>(null);
  const [showNewFileInput, setShowNewFileInput] = useState<string | null>(null); // null, project._id, or "folder:path"
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
  }, [currentProject, currentFile, code, addToConsole]);

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

      const mainFileName = currentFile?.name || currentProject.files[0].name;

      setCodeToExecute({
        code: code.trim(),
        timestamp: Date.now(),
        files: filesForExecution,
        mainFile: mainFileName
      });

      addToConsole(`⏳ Running project with ${filesForExecution.length} file(s)...`, 'info');
    } else {
      // Single file mode (no project)
      setCodeToExecute({ code: code.trim(), timestamp: Date.now() });
      addToConsole('⏳ Code sent to Terminal for interactive execution', 'info');
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

  const handleConsoleInput = (_value: string) => {
    // Console input disabled - now using Terminal for interactive execution
    addToConsole('💡 Code execution moved to Terminal tab for real-time interaction', 'info');
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
              ) : (
                <VersionControl
                  theme={theme}
                  projectId={currentProject?._id || null}
                  currentFileId={currentFile?._id || null}
                  currentFileName={currentFile?.name || null}
                  currentCode={code}
                  projectFiles={currentProject?.files || []}
                  onSnapshotCreated={(msg) => addToConsole(msg, 'info')}
                  onRestore={(content, fileId, fileName) => {
                    if (currentProject) {
                      const file = currentProject.files.find(f => f._id === fileId);
                      if (file) {
                        setCurrentFile({ ...file, content });
                        setCode(content);
                        addToConsole(`🔄 Restored: ${fileName}`, 'info');
                      }
                    }
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* User Side Panel */}
      <UserSidePanel
        theme={theme}
        setTheme={setTheme}
        user={user}
        avatarImage={avatarImage}
        fontSize={fontSize}
        setFontSize={setFontSize}
        isOpen={showSidePanel}
        onClose={() => setShowSidePanel(false)}
        onLogout={onLogout}
      />
    </div>
  );
}

export default App;