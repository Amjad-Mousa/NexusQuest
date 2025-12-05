import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { BookOpen, Users, TrendingUp, Award, Camera, User, Moon, Sun, ArrowLeft, MessageCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { getStoredUser } from '../services/authService';
import { getMyTasks, Task } from '../services/taskService';
import { UserSidebar } from '../components/UserSidebar';
import { connectChat, getChatSocket, type ChatMessage } from '../services/chatService';
import { useProfileImages } from '../hooks/useProfileImages';

export function TeacherProfile() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const { theme, setTheme } = useTheme();
  const [showSidebar, setShowSidebar] = useState(false);
  const { avatarImage, coverImage, handleAvatarChange, handleCoverChange } = useProfileImages();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [stats, setStats] = useState({
    totalTasks: 0,
    totalStudents: 0,
    averageScore: 0,
    popularTask: ''
  });

  useEffect(() => {
    loadTasks();
  }, []);

  // Subscribe to chat for unread messages
  useEffect(() => {
    const s = connectChat();
    if (!s || !user) return;

    const handleReceived = (_msg: ChatMessage) => {
      if (_msg.recipientId !== user.id) return;
      setNewMessageCount((prev) => prev + 1);
    };

    s.on('dm:received', handleReceived as any);

    return () => {
      const existing = getChatSocket();
      if (existing) {
        existing.off('dm:received', handleReceived as any);
      }
    };
  }, [user]);

  const loadTasks = async () => {
    try {
      const tasksData = await getMyTasks();
      setTasks(tasksData);
      
      // Calculate stats
      setStats({
        totalTasks: tasksData.length,
        totalStudents: Math.floor(Math.random() * 100) + 50, // Placeholder
        averageScore: Math.floor(Math.random() * 30) + 70,
        popularTask: tasksData.length > 0 ? tasksData[0].title : 'N/A'
      });
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('nexusquest-token');
    localStorage.removeItem('nexusquest-user');
    navigate('/');
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`border-b ${theme === 'dark' ? 'bg-gray-900/80 border-gray-800' : 'bg-white border-gray-200'} backdrop-blur-sm sticky top-0 z-40`}>
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/teacher')} className="p-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">Teacher Profile</h1>
          </div>

          <div className="flex items-center gap-3">
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

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-full"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Cover Image */}
        <div className="relative mb-20">
          <div className={`h-64 rounded-xl overflow-hidden ${theme === 'dark' ? 'bg-gradient-to-r from-blue-900 to-purple-900' : 'bg-gradient-to-r from-blue-500 to-purple-500'}`}>
            {coverImage && (
              <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
            )}
            <label htmlFor="cover-upload" className="absolute top-4 right-4 cursor-pointer">
              <div className={`p-2 rounded-full ${theme === 'dark' ? 'bg-gray-800/80' : 'bg-white/80'} backdrop-blur-sm hover:scale-110 transition-transform`}>
                <Camera className="w-5 h-5" />
              </div>
              <input
                id="cover-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverChange}
              />
            </label>
          </div>

          {/* Avatar */}
          <div className="absolute left-8 -bottom-16">
            <div className="relative">
              <div className={`w-32 h-32 rounded-full border-4 overflow-hidden ${theme === 'dark' ? 'border-gray-900 bg-gray-800' : 'border-white bg-gray-200'}`}>
                {avatarImage ? (
                  <img src={avatarImage} alt={user?.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>
              <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 cursor-pointer">
                <div className={`p-2 rounded-full ${theme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'} hover:scale-110 transition-transform`}>
                  <Camera className="w-4 h-4 text-white" />
                </div>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </label>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="mb-8">
          <div className="mb-2">
            <h2 className="text-3xl font-bold">{user?.name}</h2>
          </div>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>{user?.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <div className="px-3 py-1 rounded-full bg-blue-600 text-white text-sm font-medium">
              Teacher
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Total Tasks</span>
              <BookOpen className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-3xl font-bold">{stats.totalTasks}</div>
          </div>

          <div className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Total Students</span>
              <Users className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold">{stats.totalStudents}</div>
          </div>

          <div className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Avg Score</span>
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-3xl font-bold">{stats.averageScore}%</div>
          </div>

          <div className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Achievements</span>
              <Award className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="text-3xl font-bold">{Math.floor(stats.totalTasks / 5)}</div>
          </div>
        </div>

        {/* Recent Tasks */}
        <div className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <h3 className="text-xl font-bold mb-4">Recent Tasks</h3>
          <div className="space-y-3">
            {tasks.slice(0, 5).map((task) => (
              <div
                key={task._id}
                className={`p-4 rounded-lg cursor-pointer transition-colors ${
                  theme === 'dark' ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => navigate(`/task/${task._id}`)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">{task.title}</h4>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {task.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      task.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                      task.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {task.difficulty}
                    </span>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                      {task.language}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {tasks.length === 0 && (
              <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                No tasks created yet.
              </p>
            )}
          </div>
        </div>
      </main>

      {/* User Sidebar */}
      <UserSidebar
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
        user={user}
        onLogout={handleLogout}
      />

    </div>
  );
}
