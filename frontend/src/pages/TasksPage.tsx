import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, BookOpen, Award, BarChart3, Clock, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useTheme } from '../context/ThemeContext';
import { getTasks, Task, TaskDifficulty, TaskLanguage, getMyProgress, TaskProgress } from '../services/taskService';

interface TasksPageProps {
  user: { name: string; email: string } | null;
}

export default function TasksPage(_props: TasksPageProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<TaskDifficulty | ''>('');
  const [languageFilter, setLanguageFilter] = useState<TaskLanguage | ''>('');
  const [myProgress, setMyProgress] = useState<Map<string, TaskProgress>>(new Map());

  useEffect(() => {
    loadTasks();
    loadMyProgress();
  }, [difficultyFilter, languageFilter]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const filters: { difficulty?: TaskDifficulty; language?: TaskLanguage } = {};
      if (difficultyFilter) filters.difficulty = difficultyFilter;
      if (languageFilter) filters.language = languageFilter;
      const data = await getTasks(filters);
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyProgress = async () => {
    try {
      const progress = await getMyProgress();
      const progressMap = new Map<string, TaskProgress>();
      progress.forEach(p => {
        if (typeof p.taskId === 'object' && p.taskId._id) {
          progressMap.set(p.taskId._id, p);
        }
      });
      setMyProgress(progressMap);
    } catch (error) {
      console.error('Failed to load progress:', error);
    }
  };

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'hard': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getLanguageColor = (language: string) => {
    switch (language) {
      case 'python': return 'bg-blue-500/20 text-blue-400';
      case 'javascript': return 'bg-yellow-500/20 text-yellow-400';
      case 'java': return 'bg-orange-500/20 text-orange-400';
      case 'cpp': return 'bg-purple-500/20 text-purple-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getTaskStatus = (taskId: string) => {
    const progress = myProgress.get(taskId);
    if (!progress) return null;
    return progress.status;
  };

  const selectClass = `px-3 py-2 rounded-lg border ${
    theme === 'dark'
      ? 'bg-gray-800 border-gray-700 text-white'
      : 'bg-white border-gray-300 text-gray-900'
  } outline-none`;

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`border-b ${theme === 'dark' ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <div className="flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-blue-500" />
                <h1 className="text-xl font-bold">Browse Tasks</h1>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {filteredTasks.length} tasks available
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Search and Filters */}
        <div className={`rounded-xl p-4 mb-6 ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="flex-1 min-w-[250px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                } outline-none focus:ring-2 focus:ring-blue-500/50`}
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
              <Filter className="w-4 h-4 text-gray-500" />
              <select value={difficultyFilter} onChange={e => setDifficultyFilter(e.target.value as TaskDifficulty | '')} className={selectClass}>
                <option value="">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <select value={languageFilter} onChange={e => setLanguageFilter(e.target.value as TaskLanguage | '')} className={selectClass}>
                <option value="">All Languages</option>
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
            </div>
          </div>
        </div>

        {/* Task Grid */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-500" />
            <h3 className="text-lg font-medium mb-2">No tasks found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTasks.map(task => {
              const status = getTaskStatus(task._id);
              return (
                <div
                  key={task._id}
                  onClick={() => navigate(`/task/${task._id}`)}
                  className={`rounded-xl p-5 cursor-pointer transition-all border ${
                    theme === 'dark'
                      ? 'bg-gray-900 border-gray-800 hover:border-blue-500/50'
                      : 'bg-white border-gray-200 hover:border-blue-300'
                  } ${status === 'completed' ? 'opacity-75' : ''}`}
                >
                  {/* Status Badge */}
                  {status && (
                    <div className="flex justify-end mb-2">
                      {status === 'completed' ? (
                        <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">
                          <Clock className="w-3 h-3" /> In Progress
                        </span>
                      )}
                    </div>
                  )}

                  {/* Title */}
                  <h3 className={`font-semibold text-lg mb-2 ${status === 'completed' ? 'line-through opacity-75' : ''}`}>
                    {task.title}
                  </h3>

                  {/* Description */}
                  <p className={`text-sm mb-4 line-clamp-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {task.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className={`text-xs px-2 py-1 rounded-full border ${getDifficultyColor(task.difficulty)}`}>
                      {task.difficulty}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getLanguageColor(task.language)}`}>
                      {task.language}
                    </span>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-medium">{task.points} pts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-gray-500" />
                      <span className="text-xs text-gray-500">
                        by {typeof task.createdBy === 'object' ? task.createdBy.name : 'Teacher'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

