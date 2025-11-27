import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, BookOpen, Award, BarChart3, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Task, getMyTasks, deleteTask } from '../services/taskService';
import { getStoredUser } from '../services/authService';
import CreateTaskModal from '../components/teacher/CreateTaskModal';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const theme = localStorage.getItem('nexusquest-theme') === 'light' ? 'light' : 'dark';

  // Check if user is a teacher
  useEffect(() => {
    if (!user || user.role !== 'teacher') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await getMyTasks();
      setTasks(data);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleDeleteTask = async (taskId: string, taskTitle: string) => {
    if (confirm(`Delete task "${taskTitle}"?`)) {
      try {
        await deleteTask(taskId);
        setTasks(tasks.filter(t => t._id !== taskId));
      } catch (err) {
        console.error('Failed to delete task:', err);
        alert('Failed to delete task');
      }
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'hard': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const totalPoints = tasks.reduce((sum, t) => sum + t.points, 0);
  const tasksByDifficulty = {
    easy: tasks.filter(t => t.difficulty === 'easy').length,
    medium: tasks.filter(t => t.difficulty === 'medium').length,
    hard: tasks.filter(t => t.difficulty === 'hard').length,
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`border-b ${theme === 'dark' ? 'bg-gray-900/80 border-gray-800' : 'bg-white border-gray-200'} backdrop-blur-sm sticky top-0 z-40`}>
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')} className="p-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-blue-500" />
              <span className="text-xl font-bold">Teacher Dashboard</span>
            </div>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Create Task
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className={`rounded-xl p-4 border ${theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20"><BookOpen className="w-5 h-5 text-blue-400" /></div>
              <div><p className="text-sm text-gray-400">Total Tasks</p><p className="text-2xl font-bold">{tasks.length}</p></div>
            </div>
          </div>
          <div className={`rounded-xl p-4 border ${theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/20"><Award className="w-5 h-5 text-yellow-400" /></div>
              <div><p className="text-sm text-gray-400">Total Points</p><p className="text-2xl font-bold">{totalPoints}</p></div>
            </div>
          </div>
          <div className={`rounded-xl p-4 border ${theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20"><BarChart3 className="w-5 h-5 text-green-400" /></div>
              <div><p className="text-sm text-gray-400">Easy Tasks</p><p className="text-2xl font-bold">{tasksByDifficulty.easy}</p></div>
            </div>
          </div>
          <div className={`rounded-xl p-4 border ${theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20"><BarChart3 className="w-5 h-5 text-red-400" /></div>
              <div><p className="text-sm text-gray-400">Hard Tasks</p><p className="text-2xl font-bold">{tasksByDifficulty.hard}</p></div>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className={`rounded-xl border ${theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`}>
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold">Your Tasks</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="p-8 text-center">
              <BookOpen className="w-12 h-12 mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400 mb-4">No tasks created yet</p>
              <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" /> Create Your First Task
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {tasks.map(task => (
                <div key={task._id} className="p-4 flex items-center justify-between hover:bg-gray-800/30 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold">{task.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs border ${getDifficultyColor(task.difficulty)}`}>
                        {task.difficulty}
                      </span>
                      <span className="text-sm text-gray-400">{task.points} pts</span>
                    </div>
                    <p className="text-sm text-gray-400 line-clamp-1">{task.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { setEditingTask(task); setShowCreateModal(true); }}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={() => handleDeleteTask(task._id, task.title)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          task={editingTask}
          onClose={() => { setShowCreateModal(false); setEditingTask(null); }}
          onSave={() => { loadTasks(); setShowCreateModal(false); setEditingTask(null); }}
          theme={theme}
        />
      )}
    </div>
  );
}

