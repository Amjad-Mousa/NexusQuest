import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Play, Square, Download, Upload, Sparkles, User, LogIn, X, Save } from 'lucide-react';
import type { Language, Theme, User as UserType, Project, ProjectFile } from '../types';

interface HeaderProps {
  theme: Theme;
  user: UserType | null;
  avatarImage: string | null;
  language: Language;
  setLanguage: (lang: Language) => void;
  currentProject: Project | null;
  currentFile: ProjectFile | null;
  isRunning: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  waitingForInput: boolean;
  inputQueue: string[];
  onRun: () => void;
  onSave: () => void;
  onClear: () => void;
  onExplain: () => void;
  onDownload: () => void;
  onLoadFile: () => void;
  onCloseProject: () => void;
  onShowSidePanel: () => void;
}

export function Header({
  theme,
  user,
  avatarImage,
  language,
  setLanguage,
  currentProject,
  currentFile,
  isRunning,
  isSaving,
  hasUnsavedChanges,
  waitingForInput,
  inputQueue,
  onRun,
  onSave,
  onClear,
  onExplain,
  onDownload,
  onLoadFile,
  onCloseProject,
  onShowSidePanel,
}: HeaderProps) {
  const navigate = useNavigate();

  return (
    <header className={`border-b ${
      theme === 'dark'
        ? 'border-gray-800 bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950'
        : 'border-gray-200 bg-gradient-to-r from-gray-50 via-white to-gray-50'
    } backdrop-blur-sm`}>
      <div className="px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center shadow-md flex-shrink-0">
              <span className="text-white font-bold text-lg">N</span>
            </div>
          </div>

          {/* Center toolbar */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {inputQueue.length > 0 && (
              <div className="px-2 py-1 bg-yellow-500/10 border border-yellow-500/40 rounded-md flex items-center gap-1">
                <span className="text-yellow-400 text-[10px] font-semibold">📥 {inputQueue.length} input{inputQueue.length > 1 ? 's' : ''}</span>
              </div>
            )}
            
            {!currentProject ? (
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
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
                  onClick={onCloseProject}
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
              onClick={onRun}
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
              onClick={onSave}
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

            <Button onClick={onLoadFile} className="h-8 px-3 flex items-center gap-1 text-xs bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-md shadow-purple-500/30 transition-all duration-200 hover:scale-105">
              <Upload className="w-3 h-3" />
              Open File
            </Button>

            <Button onClick={onClear} className="h-8 px-3 flex items-center gap-1 text-xs bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-md shadow-orange-500/30 transition-all duration-200 hover:scale-105">
              <Square className="w-3 h-3" />
              Clear
            </Button>

            <Button onClick={onExplain} className="h-8 px-3 hidden sm:flex items-center gap-1 text-xs bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-md shadow-indigo-500/30 transition-all duration-200 hover:scale-105" title="Explain code with AI">
              <Sparkles className="w-3 h-3" />
              Explain
            </Button>

            <Button onClick={onDownload} className="h-8 px-3 hidden md:flex items-center gap-1 text-xs bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white shadow-md shadow-blue-500/30 transition-all duration-200 hover:scale-105">
              <Download className="w-3 h-3" />
              Download
            </Button>
          </div>

          {/* User section */}
          <div className="flex items-center gap-2 flex-shrink-0 relative">
            {user ? (
              <button
                onClick={onShowSidePanel}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                {avatarImage ? (
                  <img src={avatarImage} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                  }`}>
                    <User className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} />
                  </div>
                )}
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
  );
}

