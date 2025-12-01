import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Play, BookOpen, Award, BarChart3, Code2, Moon, Sun, ChevronLeft, ChevronRight, CheckCircle2, Trophy, X } from 'lucide-react';
import { CodeEditor } from '../components/CodeEditor';
import { Console } from '../components/Console';
import { Terminal } from '../components/Terminal';
import { Button } from '../components/ui/button';
import { Task, getTask, startTask, saveTaskCode, runTaskTests, TaskTestResultItem } from '../services/taskService';
import type { Language, Theme, ConsoleOutput } from '../types';

interface TaskPageProps {
  user: { name: string; email: string } | null;
  onLogout: () => void;
}

export default function TaskPage({ user }: TaskPageProps) {
  const navigate = useNavigate();
  const { taskId } = useParams<{ taskId: string }>();

  // Theme state
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('nexusquest-theme');
    return (saved as Theme) || 'dark';
  });

  // Task state
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Code state
  const [code, setCode] = useState('');
  const [output, setOutput] = useState<ConsoleOutput[]>([]);

  // UI state
  const [isDescPanelOpen, setIsDescPanelOpen] = useState(true);
  const [activeBottomTab, setActiveBottomTab] = useState<'console' | 'terminal'>('terminal');
  const [codeToExecute, setCodeToExecute] = useState<{ code: string; timestamp: number } | null>(null);
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);

  // Load task and start progress tracking
  useEffect(() => {
    const loadTask = async () => {
      if (!taskId) return;
      try {
        setLoading(true);
        const data = await getTask(taskId);
        setTask(data);

        // Start the task to track progress
        const progress = await startTask(taskId);

        // Use saved code if available, otherwise use starter code or default
        if (progress.code) {
          setCode(progress.code);
        } else {
          setCode(data.starterCode || getDefaultCode(data.language));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load task');
      } finally {
        setLoading(false);
      }
    };
    loadTask();
  }, [taskId]);

  // Auto-save code every 30 seconds
  useEffect(() => {
    if (!taskId || !code) return;
    const saveInterval = setInterval(async () => {
      try {
        await saveTaskCode(taskId, code);
      } catch (err) {
        console.error('Failed to auto-save:', err);
      }
    }, 30000);
    return () => clearInterval(saveInterval);
  }, [taskId, code]);

  // Load user avatar
  useEffect(() => {
    const loadUserAvatar = async () => {
      try {
        const token = localStorage.getItem('nexusquest-token');
        const response = await fetch('http://localhost:9876/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success && data.user) setAvatarImage(data.user.avatarImage || null);
      } catch (err) { console.error('Failed to load user avatar:', err); }
    };
    loadUserAvatar();
  }, []);

  const getDefaultCode = (lang: string): string => {
    switch (lang) {
      case 'python': return '# Write your solution here\n\n';
      case 'javascript': return '// Write your solution here\n\n';
      case 'java': return 'public class Main {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}';
      case 'cpp': return '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}';
      default: return '';
    }
  };

  const runCode = useCallback(() => {
    if (!code.trim() || !task) return;
    setActiveBottomTab('terminal');
    setCodeToExecute({ code: code.trim(), timestamp: Date.now() });
    addToConsole('⏳ Running code...', 'info');
  }, [code, task]);

  const runTests = useCallback(async () => {
    if (!code.trim() || !task || !taskId) return;
    try {
      setActiveBottomTab('console');
      addToConsole('⏳ Running tests...', 'info');
      const summary = await runTaskTests(taskId, code.trim());
      addToConsole(`✅ Passed ${summary.passed}/${summary.total} tests`, 'info');

      summary.results.forEach((r: TaskTestResultItem) => {
        const label = r.input === '' && r.expectedOutput === '' ? `Hidden test #${r.index + 1}` : `Test #${r.index + 1}`;
        const parts: string[] = [r.passed ? `${label}: PASSED` : `${label}: FAILED`];

        if (r.actualOutput) {
          parts.push(`actual: ${r.actualOutput.trim()}`);
        }
        if (r.expectedOutput) {
          parts.push(`expected: ${r.expectedOutput.trim()}`);
        }
        if (r.error) {
          parts.push(`error: ${r.error}`);
        }

        addToConsole(parts.join(' | '), r.passed ? 'info' : 'error');
      });

      // Show success notification if all tests passed
      if (summary.completed) {
        setEarnedPoints(task.points);
        setShowSuccessNotification(true);
        addToConsole(`🎉 Task completed! You earned ${task.points} points!`, 'info');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to run tests';
      addToConsole(`❌ ${msg}`, 'error');
    }
  }, [code, task, taskId]);

  const addToConsole = (message: string, type: ConsoleOutput['type'] = 'output') => {
    setOutput(prev => [...prev, { type, message, timestamp: new Date() }]);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'hard': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getLanguageIcon = (lang: string) => {
    switch (lang) {
      case 'python': return '🐍';
      case 'javascript': return '🟨';
      case 'java': return '☕';
      case 'cpp': return '⚡';
      default: return '📄';
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading task...</p>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Task not found'}</p>
          <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen flex flex-col ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'}`}>
      {/* Success Notification */}
      {showSuccessNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`relative mx-4 max-w-md w-full rounded-2xl p-8 shadow-2xl ${theme === 'dark' ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <button
              onClick={() => setShowSuccessNotification(false)}
              className={`absolute top-4 right-4 p-1 rounded-full ${theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center animate-bounce">
                <Trophy className="w-10 h-10 text-white" />
              </div>
              <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                🎉 Task Completed!
              </h2>
              <p className={`mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Congratulations! You've passed all test cases.
              </p>
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${theme === 'dark' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700'}`}>
                <Award className="w-5 h-5" />
                <span className="font-bold">+{earnedPoints} Points Earned!</span>
              </div>
              <div className="mt-6 flex gap-3 justify-center">
                <Button
                  onClick={() => setShowSuccessNotification(false)}
                  variant="outline"
                  className={theme === 'dark' ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : ''}
                >
                  Continue Coding
                </Button>
                <Button
                  onClick={() => navigate('/dashboard')}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                >
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`h-14 border-b ${theme === 'dark' ? 'bg-gray-900/80 border-gray-700' : 'bg-white/90 border-gray-200'} backdrop-blur-sm flex items-center justify-between px-4`}>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getLanguageIcon(task.language)}</span>
            <div>
              <h1 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{task.title}</h1>
              <div className="flex items-center gap-2 text-xs">
                <span className={`px-2 py-0.5 rounded-full border ${getDifficultyColor(task.difficulty)}`}>{task.difficulty}</span>
                <span className="text-gray-400">{task.points} pts</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={runCode} className="bg-green-600 hover:bg-green-700 text-white">
            <Play className="w-4 h-4 mr-2" /> Run
          </Button>
          <Button onClick={runTests} variant="outline" className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/10">
            <CheckCircle2 className="w-4 h-4 mr-2" /> Run Tests
          </Button>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
            {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
          </button>
          {avatarImage ? (
            <img src={avatarImage} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex overflow-hidden px-4 pt-3 pb-2">
          {/* Code Editor */}
          <div className="flex-1 flex flex-col min-w-0 mr-2">
            <div className={`flex-1 rounded-xl overflow-hidden border shadow-2xl backdrop-blur-sm ${theme === 'dark' ? 'border-gray-700 bg-gray-900/50' : 'border-gray-300 bg-white/90'}`}>
              <CodeEditor key={task.language} value={code} onChange={(v) => setCode(v || '')} language={task.language as Language} height="100%" theme={theme === 'dark' ? 'vs-dark' : 'light'} />
            </div>
          </div>

          {/* Task Description Panel */}
          <div className={`${isDescPanelOpen ? 'w-80' : 'w-8'} flex-shrink-0 transition-all duration-300 ease-in-out relative`}>
            <div className={`h-full rounded-xl border ${theme === 'dark' ? 'bg-gray-900/70 border-gray-700' : 'bg-white/90 border-gray-200'} overflow-hidden flex flex-col`}>
              {/* Toggle button */}
              <button onClick={() => setIsDescPanelOpen(!isDescPanelOpen)} className={`absolute -left-3 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 border-gray-600' : 'bg-gray-200 hover:bg-gray-300 border-gray-300'} border`}>
                {isDescPanelOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>

              {isDescPanelOpen && (
                <>
                  <div className={`p-3 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-blue-400" />
                      <span className="font-semibold">Task Description</span>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-4">
                      {/* Task info badges */}
                      <div className="flex flex-wrap gap-2">
                        <span className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                          <Code2 className="w-3 h-3" /> {task.language}
                        </span>
                        <span className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 ${theme === 'dark' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700'}`}>
                          <Award className="w-3 h-3" /> {task.points} points
                        </span>
                        <span className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 border ${getDifficultyColor(task.difficulty)}`}>
                          <BarChart3 className="w-3 h-3" /> {task.difficulty}
                        </span>
                      </div>
                      {/* Description */}
                      <div className={`text-sm leading-relaxed whitespace-pre-wrap ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {task.description}
                      </div>
                      {/* Created by */}
                      <div className={`pt-4 mt-4 border-t text-xs ${theme === 'dark' ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
                        Created by: {task.createdBy?.name || 'Unknown'}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Tabs */}
        <div className="h-[30vh] min-h-[170px] px-4 pb-3">
          <div className="h-full flex flex-col">
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-1 text-[11px]">
                <button onClick={() => setActiveBottomTab('console')} className={`px-2 py-0.5 rounded-t-md border-b-2 ${activeBottomTab === 'console' ? 'border-emerald-400 text-emerald-300' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>Console</button>
                <button onClick={() => setActiveBottomTab('terminal')} className={`px-2 py-0.5 rounded-t-md border-b-2 ${activeBottomTab === 'terminal' ? 'border-blue-400 text-blue-300' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>Terminal</button>
              </div>
              {activeBottomTab === 'console' && (
                <span className={`text-[10px] px-2 py-0.5 rounded border ${theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border-emerald-300'}`}>{output.length} messages</span>
              )}
            </div>
            <div className={`flex-1 rounded-xl overflow-hidden border shadow-2xl ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
              {activeBottomTab === 'console' ? (
                <Console output={output} height="100%" onInput={() => {}} waitingForInput={false} theme={theme} />
              ) : (
                <Terminal height="100%" theme={theme} language={task.language as Language} codeToExecute={codeToExecute} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

