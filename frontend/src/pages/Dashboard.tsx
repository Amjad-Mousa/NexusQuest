import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Code2, Trophy, Target, BookOpen, Clock, Star, TrendingUp, Award, User } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { getStoredUser } from '../services/authService';
import { getMyProgress, TaskProgress, getUserStats, UserStats } from '../services/taskService';
import { UserSidePanel } from '@/components/UserSidePanel';
import { ProjectsSidebar } from '@/components/ProjectsSidebar';
import { DailyChallenge } from '@/components/DailyChallenge';
import { NotificationsBell } from '@/components/NotificationsBell';

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
  const storedUser = getStoredUser();
  const isTeacher = storedUser?.role === 'teacher';

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

  // User's task progress (started/completed tasks)
  const [myTaskProgress, setMyTaskProgress] = useState<TaskProgress[]>([]);
  const [completedTasks, setCompletedTasks] = useState<TaskProgress[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [userStats, setUserStats] = useState<UserStats>({ totalPoints: 0, completedTasks: 0, startedTasks: 0 });

  // Load user's task progress and stats
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const [progress, completed, stats] = await Promise.all([
          getMyProgress('started'),
          getMyProgress('completed'),
          getUserStats()
        ]);
        setMyTaskProgress(progress.slice(0, 4)); // Show first 4 in-progress
        setCompletedTasks(completed.slice(0, 4)); // Show first 4 completed
        setUserStats(stats);
      } catch (err) {
        console.error('Failed to load task progress:', err);
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
    rank: 156, // TODO: implement leaderboard
    streak: 5  // TODO: implement streak tracking
  };



  

  const learningPaths = [
    { id: 1, title: 'Python Basics', progress: 75, total: 20 },
    { id: 2, title: 'Data Structures', progress: 40, total: 30 },
    { id: 3, title: 'Algorithms', progress: 20, total: 25 }
  ];


   

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950' : 'bg-gradient-to-br from-gray-100 via-white to-gray-100'}`}>
      {/* Header */}
      <header className={`border-b sticky top-0 z-50 ${
        theme === 'dark' 
          ? 'border-gray-800 bg-gray-950/80' 
          : 'border-gray-200 bg-white/80'
      } backdrop-blur-md`}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Code2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">
              NexusQuest
            </span>
          </div>
          <div className="flex items-center gap-4">
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
   
      
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className={`text-4xl font-bold mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Welcome back, {user?.name?.split(' ')[0]}! 👋
            </h1>
            <p className={`text-lg ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>Here's what's happening with your learning journey</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/quizzes')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 text-lg"
            >
              📝 Quizzes
            </Button>
            <Button
              onClick={() => navigate('/playground')}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 text-lg"
            >
              ⚡ Quick Playground
            </Button>
            <Button
              onClick={() => navigate('/projects')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 text-lg"
            >
              + New Project
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className={`rounded-xl p-6 border ${
            theme === 'dark'
              ? 'bg-gray-900/50 border-blue-500/20'
              : 'bg-white border-blue-200'
          }`}>
            <Trophy className="w-8 h-8 text-blue-400 mb-2" />
            <div className={`text-3xl font-bold mb-1 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>{stats.points}</div>
            <div className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>Total Points</div>
          </div>

          <div className={`rounded-xl p-6 border ${
            theme === 'dark'
              ? 'bg-gray-900/50 border-purple-500/20'
              : 'bg-white border-purple-200'
          }`}>
            <Target className="w-8 h-8 text-purple-400 mb-2" />
            <div className={`text-3xl font-bold mb-1 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>{stats.completedChallenges}</div>
            <div className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>Completed</div>
          </div>

          <div className={`rounded-xl p-6 border ${
            theme === 'dark'
              ? 'bg-gray-900/50 border-yellow-500/20'
              : 'bg-white border-yellow-200'
          }`}>
            <Star className="w-8 h-8 text-yellow-400 mb-2" />
            <div className={`text-3xl font-bold mb-1 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>#{stats.rank}</div>
            <div className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>Global Rank</div>
          </div>

          <div className={`rounded-xl p-6 border ${
            theme === 'dark'
              ? 'bg-gray-900/50 border-orange-500/20'
              : 'bg-white border-orange-200'
          }`}>
            <TrendingUp className="w-8 h-8 text-orange-400 mb-2" />
            <div className={`text-3xl font-bold mb-1 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>{stats.streak} days</div>
            <div className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>Streak 🔥</div>
          </div>

          <div className={`rounded-xl p-6 border ${
            theme === 'dark'
              ? 'bg-gray-900/50 border-green-500/20'
              : 'bg-white border-green-200'
          }`}>
            <Award className="w-8 h-8 text-green-400 mb-2" />
            <div className={`text-3xl font-bold mb-1 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>8</div>
            <div className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>Badges Earned</div>
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
            <div className={`rounded-xl p-6 mb-6 border ${
              theme === 'dark'
                ? 'bg-gray-900/50 border-gray-800'
                : 'bg-white border-gray-200 shadow-sm'
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
            <div className={`${theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} border rounded-xl p-6`}>
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
    </div>
  );
}
