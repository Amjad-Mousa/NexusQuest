import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, BookOpen, Award, BarChart3, User, Clock, Calendar, Users, Book, MessageCircle, Code2 } from 'lucide-react';
import { getDifficultyColor, getQuizStatusColor } from '../utils/styleHelpers';
import { formatDateTime } from '../utils/dateHelpers';
import { Button } from '../components/ui/button';
import { Task, getMyTasks, deleteTask } from '../services/taskService';
import { Quiz, getMyQuizzes, deleteQuiz } from '../services/quizService';
import { connectChat, getChatSocket, type ChatMessage } from '../services/chatService';
import { getStoredUser } from '../services/authService';
import CreateTaskModal from '../components/teacher/CreateTaskModal';
import CreateQuizModal from '../components/teacher/CreateQuizModal';
import TutorialManagement from '../components/teacher/TutorialManagement';
import { UserSidePanel } from '../components/UserSidePanel';
import { useTheme } from '../context/ThemeContext';
import { NotificationsBell } from '../components/NotificationsBell';
import { usePageTitle } from '../hooks/usePageTitle';

interface TeacherDashboardProps {
  user: { name: string; email: string } | null;
  onLogout: () => void;
}

export default function TeacherDashboard({ user, onLogout }: TeacherDashboardProps) {
  usePageTitle('Teacher Dashboard');
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'quizzes' | 'tutorials'>('tasks');
  const [teacherPoints, setTeacherPoints] = useState(0);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const { theme } = useTheme();

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

  const loadQuizzes = async () => {
    try {
      const data = await getMyQuizzes();
      setQuizzes(data);
    } catch (err) {
      console.error('Failed to load quizzes:', err);
    }
  };

  useEffect(() => {
    loadTasks();
    loadQuizzes();
  }, []);

  // Load user avatar and points
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const token = localStorage.getItem('nexusquest-token');
        const response = await fetch('http://localhost:3001/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success && data.user) {
          setAvatarImage(data.user.avatarImage || null);
          setTeacherPoints(data.user.totalPoints || 0);
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      }
    };
    loadUserData();
  }, []);

  // Subscribe to chat for unread messages
  useEffect(() => {
    const storedUser = getStoredUser();
    const s = connectChat();
    if (!s || !storedUser) return;

    const handleReceived = (_msg: ChatMessage) => {
      if (_msg.recipientId !== storedUser.id) return;
      setNewMessageCount((prev) => prev + 1);
    };

    s.on('dm:received', handleReceived as any);

    return () => {
      const existing = getChatSocket();
      if (existing) {
        existing.off('dm:received', handleReceived as any);
      }
    };
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

  const handleDeleteQuiz = async (quizId: string, quizTitle: string) => {
    if (confirm(`Delete quiz "${quizTitle}"?`)) {
      try {
        await deleteQuiz(quizId);
        setQuizzes(quizzes.filter(q => q._id !== quizId));
      } catch (err) {
        console.error('Failed to delete quiz:', err);
        alert('Failed to delete quiz');
      }
    }
  };

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
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/teacher')}>
            <div className="w-11 h-11 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-all duration-300 group-hover:scale-105">
              <Code2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
              NexusQuest
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Chat Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { setNewMessageCount(0); navigate('/users'); }}
              className="rounded-full relative"
            >
              <MessageCircle className="h-5 w-5" />
              {newMessageCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[10px] leading-4 text-white flex items-center justify-center">
                  {newMessageCount > 9 ? '9+' : newMessageCount}
                </span>
              )}
            </Button>

            <NotificationsBell theme={theme} />

            {/* User Menu */}
            <Button
              variant="ghost"
              onClick={() => setShowSidebar(true)}
              className="flex items-center gap-2"
            >
              {avatarImage ? (
                <img src={avatarImage} alt="Profile" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <User className="h-5 w-5" />
              )}
              <span className="hidden md:inline">{user?.name}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* User Sidebar */}
      <UserSidePanel
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
        user={user}
        onLogout={onLogout}
      />

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
              <div><p className="text-sm text-gray-400">Your Points</p><p className="text-2xl font-bold">{teacherPoints}</p></div>
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

        {/* Tabs */}
        <div className={`flex gap-2 mb-6 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'tasks'
                ? theme === 'dark'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-blue-600 border-b-2 border-blue-600'
                : theme === 'dark'
                ? 'text-gray-400 hover:text-gray-300'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <BookOpen className="w-4 h-4 inline mr-2" />
            Tasks
          </button>
          <button
            onClick={() => setActiveTab('quizzes')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'quizzes'
                ? theme === 'dark'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-blue-600 border-b-2 border-blue-600'
                : theme === 'dark'
                ? 'text-gray-400 hover:text-gray-300'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Award className="w-4 h-4 inline mr-2" />
            Quizzes
          </button>
          <button
            onClick={() => setActiveTab('tutorials')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'tutorials'
                ? theme === 'dark'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-blue-600 border-b-2 border-blue-600'
                : theme === 'dark'
                ? 'text-gray-400 hover:text-gray-300'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Book className="w-4 h-4 inline mr-2" />
            Tutorials
          </button>
        </div>

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className={`rounded-xl border ${theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`}>
            <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'} flex items-center justify-between`}>
              <h2 className="text-lg font-semibold">Your Tasks</h2>
              <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" /> Create Task
              </Button>
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
        )}

        {/* Quizzes Tab */}
        {activeTab === 'quizzes' && (
          <div className={`rounded-xl border ${theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`}>
          <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-400" />
                Your Quizzes
              </h2>
              <div className="flex items-center gap-3">
                <span className={`text-sm px-2 py-1 rounded ${theme === 'dark' ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                  {quizzes.length} quizzes
                </span>
                <Button onClick={() => setShowQuizModal(true)} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" /> Create Quiz
                </Button>
              </div>
            </div>
          </div>
          {quizzes.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="w-12 h-12 mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400 mb-4">No quizzes created yet</p>
              <Button onClick={() => setShowQuizModal(true)} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" /> Create Your First Quiz
              </Button>
            </div>
          ) : (
            <div className={`divide-y ${theme === 'dark' ? 'divide-gray-800' : 'divide-gray-200'}`}>
              {quizzes.map(quiz => (
                <div key={quiz._id} className={`p-4 flex items-center justify-between ${theme === 'dark' ? 'hover:bg-gray-800/30' : 'hover:bg-gray-50'} transition-colors`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold">{quiz.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs border ${getQuizStatusColor(quiz.status)}`}>
                        {quiz.status}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs border ${getDifficultyColor(quiz.difficulty)}`}>
                        {quiz.difficulty}
                      </span>
                      <span className="text-sm text-gray-400">{quiz.points} pts</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDateTime(quiz.startTime)} - {formatDateTime(quiz.endTime)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {quiz.duration} min
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {quiz.assignedTo && quiz.assignedTo.length > 0 
                          ? `${quiz.assignedTo.length} student${quiz.assignedTo.length > 1 ? 's' : ''}`
                          : 'All students'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/quiz/${quiz._id}/results`)}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <Users className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setEditingQuiz(quiz); setShowQuizModal(true); }}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={() => handleDeleteQuiz(quiz._id, quiz.title)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        )}

        {/* Tutorials Tab */}
        {activeTab === 'tutorials' && (
          <TutorialManagement />
        )}
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

      {/* Create/Edit Quiz Modal */}
      {showQuizModal && (
        <CreateQuizModal
          quiz={editingQuiz}
          onClose={() => { setShowQuizModal(false); setEditingQuiz(null); }}
          onSave={() => { loadQuizzes(); setShowQuizModal(false); setEditingQuiz(null); }}
          theme={theme}
        />
      )}
    </div>
  );
}

