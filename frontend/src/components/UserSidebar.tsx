import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, FolderOpen, Settings, Moon, Sun, LogOut, X, User as UserIcon, Users, MessageSquare } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface UserSidebarProps {
  user: { name: string; email: string; role?: string } | null;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export function UserSidebar({ user, onLogout, isOpen, onClose }: UserSidebarProps) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [avatarImage, setAvatarImage] = useState<string | null>(null);

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
    if (isOpen) {
      loadUserAvatar();
    }
  }, [isOpen]);

  const handleLogout = () => {
    onClose();
    onLogout();
    navigate('/');
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      <div className={`fixed top-0 right-0 h-full w-80 shadow-2xl z-50 transform transition-transform duration-300 ${
        theme === 'dark' 
          ? 'bg-gray-900 border-l border-gray-800' 
          : 'bg-white border-l border-gray-200'
      }`}>
        <div className="flex flex-col h-full">
          {/* Panel Header */}
          <div className={`p-6 border-b ${
            theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>Profile</h2>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark' 
                    ? 'hover:bg-gray-800' 
                    : 'hover:bg-gray-100'
                }`}
              >
                <X className={`w-5 h-5 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`} />
              </button>
            </div>
            <div className="flex items-center gap-3">
              {avatarImage ? (
                <img
                  src={avatarImage}
                  alt="Avatar"
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <div className={`font-semibold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>{user?.name}</div>
                <div className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>{user?.email}</div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              <button
                onClick={() => {
                  onClose();
                  navigate(user?.role === 'teacher' ? '/teacher' : '/dashboard');
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-gray-800 text-white'
                    : 'hover:bg-gray-100 text-gray-900'
                }`}
              >
                <Trophy className="w-5 h-5" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  navigate(user?.role === 'teacher' ? '/teacher-profile' : '/profile');
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-gray-800 text-white'
                    : 'hover:bg-gray-100 text-gray-900'
                }`}
              >
                <UserIcon className="w-5 h-5" />
                <span>Profile</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  navigate('/playground');
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors bg-green-600/10 border border-green-600/20 ${
                  theme === 'dark'
                    ? 'hover:bg-green-600/20 text-green-400'
                    : 'hover:bg-green-100 text-green-600'
                }`}
              >
                <Trophy className="w-5 h-5" />
                <span>⚡ Quick Playground</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  navigate('/projects');
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-gray-800 text-white'
                    : 'hover:bg-gray-100 text-gray-900'
                }`}
              >
                <FolderOpen className="w-5 h-5" />
                <span>My Projects</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  navigate('/leaderboard');
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-gray-800 text-white'
                    : 'hover:bg-gray-100 text-gray-900'
                }`}
              >
                <Trophy className="w-5 h-5" />
                <span>Leaderboard</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  navigate('/collaboration');
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors bg-orange-600/10 border border-orange-600/20 ${
                  theme === 'dark'
                    ? 'hover:bg-orange-600/20 text-orange-400'
                    : 'hover:bg-orange-100 text-orange-600'
                }`}
              >
                <Users className="w-5 h-5" />
                <span>🤝 Live Collaboration</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  navigate('/forum');
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors bg-purple-600/10 border border-purple-600/20 ${
                  theme === 'dark'
                    ? 'hover:bg-purple-600/20 text-purple-400'
                    : 'hover:bg-purple-100 text-purple-600'
                }`}
              >
                <MessageSquare className="w-5 h-5" />
                <span>💬 Q&A Forum</span>
              </button>

              <div className={`pt-4 border-t mt-4 ${
                  theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
                }`}>
                <div className={`px-4 py-2 text-sm font-medium ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>Settings</div>
                
                <button
                  onClick={toggleTheme}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'hover:bg-gray-800 text-white'
                      : 'hover:bg-gray-100 text-gray-900'
                  }`}
                >
                  {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  <span>Theme: {theme === 'dark' ? 'Dark' : 'Light'}</span>
                </button>

                <button
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'hover:bg-gray-800 text-white'
                      : 'hover:bg-gray-100 text-gray-900'
                  }`}
                >
                  <Settings className="w-5 h-5" />
                  <span>Account Settings</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sign Out Button */}
          <div className={`p-4 border-t ${
            theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
          }`}>
            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'hover:bg-red-500/10 text-red-400'
                  : 'hover:bg-red-50 text-red-600'
              }`}
            >
              <LogOut className="w-5 h-5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
