import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Code2, Trophy, Target, BookOpen, Clock, Star, TrendingUp, Award, User, MessageCircle, Users, Home, FileQuestion, MessageSquare } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { getStoredUser } from '../services/authService';
import { getMyProgress, TaskProgress, getUserStats, UserStats } from '../services/taskService';
import { getGamificationProfile } from '../services/gamificationService';
import { checkGamificationUpdates, storeGamificationState, getStoredGamificationState } from '../services/gamificationEvents';
import { UserSidePanel } from '@/components/UserSidePanel';
import { ProjectsSidebar } from '@/components/ProjectsSidebar';
import { DailyChallenge } from '@/components/DailyChallenge';
import { NotificationsBell } from '@/components/NotificationsBell';
import { connectChat, getChatSocket, type ChatMessage } from '../services/chatService';
import { fetchUsers, type ChatUser, getMyLeaderboardRank } from '../services/userService';
import { getDailyChallengeStats } from '../services/dailyChallengeService';

interface DashboardProps {
  user: { name: string; email: string } | null;
  onLogout: () => void;
}

export function Dashboard({ user, onLogout }: DashboardProps) {
  const navigate = useNavigate();
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();
  const [fontSize, setFontSize] = useState(14);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [userSearch, setUserSearch] = useState('');
  const [allUsers, setAllUsers] = useState<ChatUser[]>([]);
  const storedUser = getStoredUser();
  const isTeacher = storedUser?.role === 'teacher';
  const [activeTab, setActiveTab] = useState('home');

  // Redirect teachers to their dashboard
  useEffect(() => {
    if (isTeacher) {
      navigate('/teacher');
    }
  }, [isTeacher, navigate]);

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

  // Load users list once for header search suggestions
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const users = await fetchUsers();
        setAllUsers(users);
      } catch (error) {
        console.error('Failed to load users for search:', error);
      }
    };

    loadUsers();
  }, []);

  // Subscribe to chat socket for unread indicator
  useEffect(() => {
    const s = connectChat();
    if (!s) return;

    const handleReceived = (_msg: ChatMessage) => {
      if (!storedUser || _msg.recipientId !== storedUser.id) return;

      // Increment global counter
      setNewMessageCount((prev) => prev + 1);

      // Persist per-user unread counts so Messages page can show badges
      try {
        const raw = localStorage.getItem('nexusquest-unread-users');
        const map: Record<string, number> = raw ? JSON.parse(raw) : {};
        const fromId = _msg.senderId;
        map[fromId] = (map[fromId] || 0) + 1;
        localStorage.setItem('nexusquest-unread-users', JSON.stringify(map));
      } catch {
        // ignore JSON/localStorage errors
      }
    };

    s.on('dm:received', handleReceived as any);

    return () => {
      const existing = getChatSocket();
      if (existing) {
        existing.off('dm:received', handleReceived as any);
      }
    };
  }, []);

  // User's task progress (started/completed tasks)
  const [myTaskProgress, setMyTaskProgress] = useState<TaskProgress[]>([]);
  const [completedTasks, setCompletedTasks] = useState<TaskProgress[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [userStats, setUserStats] = useState<UserStats>({ totalPoints: 0, completedTasks: 0, startedTasks: 0 });
  const [globalRank, setGlobalRank] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [achievementsCount, setAchievementsCount] = useState(0);

  // Load user's task progress and stats
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const [progress, completed, stats, dailyStats, leaderboard, gamification] = await Promise.all([
          getMyProgress('started'),
          getMyProgress('completed'),
          getUserStats(),
          getDailyChallengeStats(),
          getMyLeaderboardRank(),
          getGamificationProfile(),
        ]);

        setMyTaskProgress(progress.slice(0, 4)); // Show first 4 in-progress
        setCompletedTasks(completed.slice(0, 4)); // Show first 4 completed
        setUserStats(stats);

        if (dailyStats) {
          setStreak(dailyStats.currentStreak || 0);
        }

        if (leaderboard && typeof leaderboard.rank === 'number') {
          setGlobalRank(leaderboard.rank);
        } else {
          setGlobalRank(null);
        }

        // Set achievements count from gamification profile
        setAchievementsCount(gamification.totalAchievements);

        // Check for level ups and new achievements
        const stored = getStoredGamificationState();
        if (stored.level && stored.achievements) {
          // Check if level increased
          if (gamification.level > stored.level) {
            // Trigger level up notification (will be shown by toast container)
            // The notification will be triggered automatically by checkGamificationUpdates
          }

          // Check for new achievements
          const currentAchievementIds = gamification.achievements.map((a: any) => a.id);
          const newAchievements = gamification.achievements.filter(
            (a: any) => !stored.achievements.includes(a.id)
          );

          // Notifications will be triggered by the event system
        }

        // Store current state for next comparison
        storeGamificationState(
          gamification.level,
          gamification.achievements.map((a: any) => a.id)
        );

        // Trigger notifications for any changes
        await checkGamificationUpdates(stored.level, stored.achievements);
      } catch (err) {
        console.error('Failed to load task progress or stats:', err);
      } finally {
        setTasksLoading(false);
      }
    };
    loadProgress();
  }, []);

  // Stats derived from real data
  const stats = {
    completedChallenges: userStats.completedTasks,
    inProgressChallenges: userStats.startedTasks,
    points: userStats.totalPoints,
    rank: globalRank ?? 0,
    streak,
  };

  const userSuggestions = useMemo(() => {
    const term = userSearch.trim().toLowerCase();
    if (!term) return { list: [] as ChatUser[], hasMore: false };

    const matches = allUsers.filter((u: ChatUser) =>
      u.id !== storedUser?.id &&
      u.name.toLowerCase().includes(term)
    );

    const maxSuggestions = 5;
    return {
      list: matches.slice(0, maxSuggestions),
      hasMore: matches.length > maxSuggestions,
    };
  }, [allUsers, userSearch]);

  const learningPaths = [
    { id: 1, title: 'Python Basics', progress: 75, total: 20 },
    { id: 2, title: 'Data Structures', progress: 40, total: 30 },
    { id: 3, title: 'Algorithms', progress: 20, total: 25 }
  ];


   

  return (
    <div className={`min-h-screen relative ${theme === 'dark' ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950' : 'bg-gradient-to-br from-gray-100 via-white to-gray-100'}`}>
      {/* Subtle Background Elements */}
      {theme === 'dark' && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        </div>
      )}
      {/* Header */}
      <header className={`border-b sticky top-0 z-50 ${
        theme === 'dark' 
          ? 'border-gray-800/50 bg-gray-950/80' 
          : 'border-gray-200 bg-white/80'
      } backdrop-blur-xl shadow-sm`}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/dashboard')}>
            <div className="w-11 h-11 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-all duration-300 group-hover:scale-105">
              <Code2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
              NexusQuest
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const term = userSearch.trim();
                  if (!term) return;
                  navigate(`/users?q=${encodeURIComponent(term)}`);
                }}
              >
                <div className="relative">
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search users by name..."
                    className={`w-64 pl-3 pr-3 py-2 rounded-full text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500/60 shadow-sm transition-colors ${
                      theme === 'dark'
                        ? 'bg-gray-900/80 border-gray-700 text-gray-100 placeholder:text-gray-500'
                        : 'bg-white/80 border-gray-300 text-gray-800 placeholder:text-gray-400'
                    }`}
                  />
                  {userSearch.trim() && userSuggestions.list.length > 0 && (
                    <div
                      className={`absolute mt-2 w-full rounded-xl border shadow-lg text-sm overflow-hidden z-50 ${
                        theme === 'dark'
                          ? 'bg-gray-900/95 border-gray-800'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      {userSuggestions.list.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setUserSearch('');
                            navigate(`/user/${u.id}`);
                          }}
                          className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-blue-500/10 ${
                            theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
                          }`}
                        >
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 flex items-center justify-center text-emerald-400 text-xs font-semibold">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate">{u.name}</span>
                        </button>
                      ))}
                      {userSuggestions.hasMore && (
                        <button
                          type="button"
                          onClick={() => {
                            const term = userSearch.trim();
                            if (!term) return;
                            navigate(`/users?q=${encodeURIComponent(term)}`);
                          }}
                          className={`w-full text-left px-3 py-2 border-t text-xs font-medium ${
                            theme === 'dark'
                              ? 'border-gray-800 text-blue-300 hover:bg-blue-500/10'
                              : 'border-gray-200 text-blue-600 hover:bg-blue-50'
                          }`}
                        >
                          Show all results
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </form>
            </div>
            <button
              type="button"
              onClick={() => {
                setNewMessageCount(0);
                navigate('/users');
              }}
              className={`relative rounded-full p-2 border text-gray-300 hover:text-emerald-300 hover:border-emerald-500 transition-colors ${
                theme === 'dark' ? 'border-gray-700 bg-gray-900/70' : 'border-gray-300 bg-white/70'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              {newMessageCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[10px] leading-4 text-white flex items-center justify-center">
                  {newMessageCount > 9 ? '9+' : newMessageCount}
                </span>
              )}
            </button>
            <NotificationsBell theme={theme} />
            <Button
              onClick={() => setShowSidePanel(true)}
              variant="outline"
              className={`flex items-center gap-2 ${
                theme === 'dark'
                  ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {avatarImage ? (
                <img 
                  src={avatarImage} 
                  alt="Avatar" 
                  className="w-6 h-6 rounded-full object-cover" 
                />
              ) : (
                <User className="w-4 h-4" />
              )}
              {user?.name}
            </Button>
          </div>
        </div>
      </header>

      {/* User Side Panel */}
      {showSidePanel && (
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
      )}
   
      
      <div className="container mx-auto px-4 py-8 pb-24 md:pb-8">
        {/* Welcome Section */}
        <div className="mb-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className={`text-2xl md:text-4xl font-bold mb-2 md:mb-3 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Welcome back, <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">{user?.name?.split(' ')[0]}</span>! 👋
            </h1>
            <p className={`text-sm md:text-lg ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>Here's what's happening with your learning journey</p>
          </div>
          <Button
            onClick={() => navigate('/playground')}
            className="w-full md:w-auto bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white px-5 py-2.5 shadow-lg shadow-green-500/20 hover:shadow-green-500/30 transition-all duration-300 hover:scale-105"
          >
            ⚡ Start Playground
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
          <div className={`group rounded-2xl p-6 border transition-all duration-300 hover:scale-105 cursor-pointer ${
            theme === 'dark'
              ? 'bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10'
              : 'bg-white border-blue-200 hover:border-blue-300 hover:shadow-lg'
          }`} onClick={() => navigate('/leaderboard')}>
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Trophy className="w-6 h-6 text-blue-400" />
            </div>
            <div className={`text-3xl font-bold mb-1 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>{stats.points.toLocaleString()}</div>
            <div className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>Total Points</div>
          </div>

          <div className={`group rounded-2xl p-6 border transition-all duration-300 hover:scale-105 cursor-pointer ${
            theme === 'dark'
              ? 'bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/10'
              : 'bg-white border-purple-200 hover:border-purple-300 hover:shadow-lg'
          }`} onClick={() => navigate('/tasks')}>
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Target className="w-6 h-6 text-purple-400" />
            </div>
            <div className={`text-3xl font-bold mb-1 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>{stats.completedChallenges}</div>
            <div className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>Completed</div>
          </div>

          <div className={`group rounded-2xl p-6 border transition-all duration-300 hover:scale-105 cursor-pointer ${
            theme === 'dark'
              ? 'bg-gradient-to-br from-yellow-500/10 to-amber-600/5 border-yellow-500/20 hover:border-yellow-500/40 hover:shadow-lg hover:shadow-yellow-500/10'
              : 'bg-white border-yellow-200 hover:border-yellow-300 hover:shadow-lg'
          }`} onClick={() => navigate('/leaderboard')}>
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Star className="w-6 h-6 text-yellow-400" />
            </div>
            <div className={`text-3xl font-bold mb-1 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>{stats.rank > 0 ? `#${stats.rank}` : '-'}</div>
            <div className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>Global Rank</div>
          </div>

          <div className={`group rounded-2xl p-6 border transition-all duration-300 hover:scale-105 ${
            theme === 'dark'
              ? 'bg-gradient-to-br from-orange-500/10 to-red-600/5 border-orange-500/20 hover:border-orange-500/40 hover:shadow-lg hover:shadow-orange-500/10'
              : 'bg-white border-orange-200 hover:border-orange-300 hover:shadow-lg'
          }`}>
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6 text-orange-400" />
            </div>
            <div className={`text-3xl font-bold mb-1 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>{stats.streak} <span className="text-lg">days</span></div>
            <div className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>Streak 🔥</div>
          </div>

          <div className={`group rounded-2xl p-6 border transition-all duration-300 hover:scale-105 cursor-pointer ${
            theme === 'dark'
              ? 'bg-gradient-to-br from-green-500/10 to-emerald-600/5 border-green-500/20 hover:border-green-500/40 hover:shadow-lg hover:shadow-green-500/10'
              : 'bg-white border-green-200 hover:border-green-300 hover:shadow-lg'
          }`} onClick={() => navigate('/profile')}>
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Award className="w-6 h-6 text-green-400" />
            </div>
            <div className={`text-3xl font-bold mb-1 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>{achievementsCount}</div>
            <div className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>Achievements</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tasks Section */}
          <div className="lg:col-span-2">
            <div className={`rounded-xl p-6 mb-6 border ${
              theme === 'dark'
                ? 'bg-gray-900/50 border-gray-800'
                : 'bg-white border-gray-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-2xl font-bold flex items-center gap-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  <Target className="w-6 h-6 text-blue-400" />
                  My Tasks
                </h2>
                <Button
                  onClick={() => navigate('/tasks')}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Browse All Tasks
                </Button>
              </div>

              <div className="space-y-3">
                {tasksLoading ? (
                  <div className="text-center py-4 text-gray-400">Loading tasks...</div>
                ) : myTaskProgress.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                    <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      You haven't started any tasks yet
                    </p>
                    <Button
                      onClick={() => navigate('/tasks')}
                      className="mt-3 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Find Tasks to Start
                    </Button>
                  </div>
                ) : (
                  myTaskProgress.map((progress) => {
                    const task = progress.taskId;
                    if (!task || typeof task !== 'object') return null;
                    return (
                      <div
                        key={progress._id}
                        onClick={() => navigate(`/task/${task._id}`)}
                        className={`rounded-lg p-4 transition-all cursor-pointer border ${
                          theme === 'dark'
                            ? 'bg-gray-800/50 border-gray-700 hover:border-blue-500/30'
                            : 'bg-gray-50 border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {progress.status === 'completed' ? (
                              <Award className="w-5 h-5 text-green-400" />
                            ) : (
                              <Clock className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} />
                            )}
                            <div>
                              <h3 className={`font-semibold ${
                                progress.status === 'completed'
                                  ? 'line-through opacity-75'
                                  : ''
                              } ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {task.title}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  task.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                                  task.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-red-500/20 text-red-400'
                                }`}>
                                  {task.difficulty}
                                </span>
                                <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {task.points} points
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                                  {task.language}
                                </span>
                              </div>
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            progress.status === 'completed'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {progress.status === 'completed' ? 'Completed' : 'In Progress'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Completed Tasks Section */}
            <div className={`rounded-2xl p-6 mb-6 border transition-all duration-300 ${
              theme === 'dark'
                ? 'bg-gray-900/50 border-gray-800 hover:border-gray-700'
                : 'bg-white border-gray-200 shadow-sm hover:shadow-md'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-2xl font-bold flex items-center gap-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  <Award className="w-6 h-6 text-green-400" />
                  Completed Tasks
                </h2>
                <span className={`text-sm px-3 py-1 rounded-full ${
                  theme === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'
                }`}>
                  {userStats.completedTasks} completed
                </span>
              </div>

              <div className="space-y-3">
                {tasksLoading ? (
                  <div className="text-center py-4 text-gray-400">Loading completed tasks...</div>
                ) : completedTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                    <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      No completed tasks yet. Keep solving!
                    </p>
                  </div>
                ) : (
                  completedTasks.map((progress) => {
                    const task = progress.taskId;
                    if (!task || typeof task !== 'object') return null;
                    return (
                      <div
                        key={progress._id}
                        onClick={() => navigate(`/task/${task._id}`)}
                        className={`rounded-lg p-4 transition-all cursor-pointer border ${
                          theme === 'dark'
                            ? 'bg-green-900/20 border-green-700/30 hover:border-green-500/50'
                            : 'bg-green-50 border-green-200 hover:border-green-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Award className="w-5 h-5 text-green-400" />
                            <div>
                              <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {task.title}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  task.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                                  task.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-red-500/20 text-red-400'
                                }`}>
                                  {task.difficulty}
                                </span>
                                <span className={`text-xs ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                                  +{task.points} points earned
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                                  {task.language}
                                </span>
                              </div>
                            </div>
                          </div>
                          <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                            ✓ Completed
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Learning Paths */}
            <div className={`${theme === 'dark' ? 'bg-gray-900/50 border-gray-800 hover:border-gray-700' : 'bg-white border-gray-200 shadow-sm hover:shadow-md'} border rounded-2xl p-6 transition-all duration-300`}>
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} flex items-center gap-2 mb-6`}>
                <BookOpen className="w-6 h-6 text-purple-400" />
                Learning Paths
              </h2>

              <div className="space-y-4">
                {learningPaths.map((path) => (
                  <div key={path.id} className={`${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'} border rounded-lg p-4`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{path.title}</h3>
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{path.progress}%</span>
                    </div>
                    <div className={`w-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-2 mb-2`}>
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                        style={{ width: `${path.progress}%` }}
                      />
                    </div>
                    <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{Math.round(path.total * path.progress / 100)} of {path.total} lessons</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar with Daily Challenge and Projects */}
          <div className="space-y-6">
            {/* Daily Challenge */}
            <DailyChallenge
              theme={theme}
              onPointsEarned={(points) => {
                setUserStats(prev => ({
                  ...prev,
                  totalPoints: prev.totalPoints + points
                }));
              }}
            />

            {/* My Projects */}
            <ProjectsSidebar
              theme={theme}
              setTheme={setTheme}
            />
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 border-t backdrop-blur-lg z-40 ${
        theme === 'dark'
          ? 'bg-gray-900/95 border-gray-800'
          : 'bg-white/95 border-gray-200'
      }`}>
        <div className="flex items-center justify-around h-16 px-2">
          <button
            onClick={() => {
              setActiveTab('home');
              navigate('/dashboard');
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              activeTab === 'home'
                ? theme === 'dark'
                  ? 'text-blue-400'
                  : 'text-blue-600'
                : theme === 'dark'
                ? 'text-gray-400 hover:text-gray-300'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Home className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Home</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('tutorials');
              navigate('/tutorials');
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              activeTab === 'tutorials'
                ? theme === 'dark'
                  ? 'text-blue-400'
                  : 'text-blue-600'
                : theme === 'dark'
                ? 'text-gray-400 hover:text-gray-300'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BookOpen className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Tutorials</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('quizzes');
              navigate('/quizzes');
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              activeTab === 'quizzes'
                ? theme === 'dark'
                  ? 'text-blue-400'
                  : 'text-blue-600'
                : theme === 'dark'
                ? 'text-gray-400 hover:text-gray-300'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileQuestion className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Quizzes</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('forum');
              navigate('/forum');
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              activeTab === 'forum'
                ? theme === 'dark'
                  ? 'text-blue-400'
                  : 'text-blue-600'
                : theme === 'dark'
                ? 'text-gray-400 hover:text-gray-300'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MessageSquare className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Forum</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('collaborate');
              navigate('/collaboration');
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              activeTab === 'collaborate'
                ? theme === 'dark'
                  ? 'text-blue-400'
                  : 'text-blue-600'
                : theme === 'dark'
                ? 'text-gray-400 hover:text-gray-300'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Collaborate</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
