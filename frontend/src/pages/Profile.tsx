import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { 
  User, Mail, Calendar, MapPin, Award, Zap, Code2, 
  Edit, Camera, Trophy, Target, Star, TrendingUp, 
  BookOpen, Clock, CheckCircle, X, Settings, 
  ChevronRight, Moon, Sun, LogOut, Github, Linkedin, Globe
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ProfileProps {
  user: { name: string; email: string } | null;
  onLogout: () => void;
}

export function Profile({ user, onLogout }: ProfileProps) {
  const navigate = useNavigate();
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'achievements' | 'settings'>('overview');
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editConfirmPassword, setEditConfirmPassword] = useState('');
  const { theme, setTheme } = useTheme();

  // Load user images on mount
  useEffect(() => {
    const loadUserImages = async () => {
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
          setCoverImage(data.user.coverImage || null);
        }
      } catch (error) {
        console.error('Failed to load user images:', error);
      }
    };
    loadUserImages();
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const imageData = reader.result as string;
        try {
          const token = localStorage.getItem('nexusquest-token');
          const response = await fetch('http://localhost:9876/api/auth/profile/images', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              avatarImage: imageData,
              coverImage: coverImage
            })
          });
          const data = await response.json();
          if (data.success) {
            setAvatarImage(imageData);
            console.log('Avatar updated successfully');
          } else {
            console.error('Failed to update avatar:', data.error);
            alert('Failed to update avatar: ' + (data.error || 'Unknown error'));
          }
        } catch (error) {
          console.error('Failed to update avatar:', error);
          alert('Failed to update avatar. Please check console for details.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const imageData = reader.result as string;
        try {
          const token = localStorage.getItem('nexusquest-token');
          const response = await fetch('http://localhost:9876/api/auth/profile/images', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              avatarImage: avatarImage,
              coverImage: imageData
            })
          });
          const data = await response.json();
          if (data.success) {
            setCoverImage(imageData);
            console.log('Cover image updated successfully');
          } else {
            console.error('Failed to update cover:', data.error);
            alert('Failed to update cover: ' + (data.error || 'Unknown error'));
          }
        } catch (error) {
          console.error('Failed to update cover:', error);
          alert('Failed to update cover. Please check console for details.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const saveProfileChanges = async () => {
    if (editPassword && editPassword !== editConfirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    // Check if there's anything to update
    if (!editName && !editPassword) {
      alert('Please enter a name or password to update.');
      return;
    }

    try {
      const token = localStorage.getItem('nexusquest-token');
      const updateData: any = {};
      
      if (editName) updateData.name = editName;
      if (editPassword) updateData.password = editPassword;

      const response = await fetch('http://localhost:9876/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('Profile updated successfully:', data.user);
        
        // Update localStorage with new user data
        const storedUser = localStorage.getItem('nexusquest-user');
        if (storedUser) {
          const userObj = JSON.parse(storedUser);
          if (data.user.name) userObj.name = data.user.name;
          localStorage.setItem('nexusquest-user', JSON.stringify(userObj));
        }
        
        setShowEditModal(false);
        setEditName('');
        setEditPassword('');
        setEditConfirmPassword('');
        // Reload immediately to show updated name
        setTimeout(() => {
          window.location.reload();
        }, 100);
      } else {
        console.error('Update failed:', data.error);
        alert(data.error || 'Failed to update profile. Please try again.');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile. Please try again.');
    }
  };



  // Mock data
  const profileData = {
    joinDate: 'January 2024',
    location: 'Amman, Jordan',
    bio: 'Passionate developer learning to code and solve problems',
    level: 12,
    experience: 2450,
    nextLevelXP: 3000,
    github: 'github.com/username',
    linkedin: 'linkedin.com/in/username',
    website: 'myportfolio.com'
  };

  const stats = [
    { label: 'Total Points', value: '2,450', icon: Star, color: 'yellow' },
    { label: 'Problems Solved', value: '47', icon: CheckCircle, color: 'green' },
    { label: 'Global Rank', value: '#156', icon: Trophy, color: 'purple' },
    { label: 'Current Streak', value: '7 days', icon: Zap, color: 'blue' }
  ];

  const skills = [
    { name: 'Python', level: 85, color: 'blue' },
    { name: 'JavaScript', level: 70, color: 'yellow' },
    { name: 'C++', level: 60, color: 'purple' },
    { name: 'Data Structures', level: 75, color: 'green' },
    { name: 'Algorithms', level: 65, color: 'red' }
  ];

  const recentActivity = [
    { id: 1, type: 'solved', title: 'Two Sum Problem', time: '2 hours ago', points: 10 },
    { id: 2, type: 'achievement', title: 'Earned "Speed Demon" badge', time: '5 hours ago', points: 50 },
    { id: 3, type: 'project', title: 'Created new project "Todo App"', time: '1 day ago', points: 0 },
    { id: 4, type: 'solved', title: 'Binary Search Implementation', time: '2 days ago', points: 25 }
  ];

  const achievements = [
    { id: 1, title: 'First Steps', description: 'Solve your first problem', earned: true, icon: '🎯' },
    { id: 2, title: 'Speed Demon', description: 'Solve 5 problems in one day', earned: true, icon: '⚡' },
    { id: 3, title: 'Week Warrior', description: 'Maintain 7-day streak', earned: true, icon: '🔥' },
    { id: 4, title: 'Century Club', description: 'Solve 100 problems', earned: false, icon: '💯' },
    { id: 5, title: 'Language Master', description: 'Master 3 languages', earned: false, icon: '🌟' },
    { id: 6, title: 'Code Legend', description: 'Reach level 50', earned: false, icon: '👑' }
  ];

  const getStatColor = (color: string) => {
    const colors = {
      yellow: 'from-yellow-500 to-orange-500',
      green: 'from-green-500 to-emerald-500',
      purple: 'from-purple-500 to-pink-500',
      blue: 'from-blue-500 to-cyan-500',
      red: 'from-red-500 to-rose-500'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50'}`}>
      {/* Header */}
      <header className={`border-b sticky top-0 z-50 ${
        theme === 'dark' 
          ? 'border-gray-800 bg-gray-950/80' 
          : 'border-gray-200 bg-white/80'
      } backdrop-blur-md`}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className={`${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
              ← Back
            </button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Code2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">
                NexusQuest
              </span>
            </div>
          </div>
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
      </header>

      {/* User Side Panel */}
      {showSidePanel && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowSidePanel(false)}
          />
          <div className={`fixed top-0 right-0 h-full w-80 z-50 shadow-2xl transform transition-transform duration-300 ${
            theme === 'dark' ? 'bg-gray-900 border-l border-gray-800' : 'bg-white border-l border-gray-200'
          }`}>
            <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {avatarImage ? (
                    <img
                      src={avatarImage}
                      alt="Avatar"
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {user?.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {user?.name}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {user?.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSidePanel(false)}
                  className={`p-1 rounded-lg transition-colors ${
                    theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <nav className="p-2">
              <button
                onClick={() => {
                  setShowSidePanel(false);
                  navigate('/profile');
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-gray-800 text-gray-300'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <User className="w-5 h-5" />
                <span>Profile</span>
              </button>

              <button
                onClick={() => {
                  setShowSidePanel(false);
                  navigate('/dashboard');
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-gray-800 text-gray-300'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <Trophy className="w-5 h-5" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => {
                  setShowSidePanel(false);
                  navigate('/projects');
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-gray-800 text-gray-300'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <Code2 className="w-5 h-5" />
                <span>Projects</span>
              </button>

              <div className="mt-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'hover:bg-gray-800 text-gray-300'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5" />
                    <span>Settings</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform ${showSettings ? 'rotate-90' : ''}`} />
                </button>

                {showSettings && (
                  <div className={`mt-1 ml-4 mr-2 p-3 rounded-lg ${
                    theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-100'
                  }`}>
                    <div className="flex items-center justify-between py-2">
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Dark Mode
                      </span>
                      <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform flex items-center justify-center ${
                          theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                        }`}>
                          {theme === 'dark' ? (
                            <Moon className="w-2.5 h-2.5 text-blue-600" />
                          ) : (
                            <Sun className="w-2.5 h-2.5 text-yellow-500" />
                          )}
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </nav>

            <div className={`absolute bottom-0 left-0 right-0 p-4 border-t ${
              theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
            }`}>
              <button
                onClick={() => {
                  setShowSidePanel(false);
                  onLogout();
                  navigate('/');
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-red-500/10 text-red-400'
                    : 'hover:bg-red-50 text-red-600'
                }`}
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Profile Header Card */}
        <div className={`${theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200 shadow-lg'} border rounded-2xl overflow-hidden mb-8`}>
          {/* Cover Image */}
          <div className="h-32 relative overflow-hidden">
            {coverImage ? (
              <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600" />
            )}
            <input
              type="file"
              id="cover-upload"
              accept="image/*"
              onChange={handleCoverChange}
              className="hidden"
            />
            <label
              htmlFor="cover-upload"
              className={`absolute bottom-4 right-4 z-20 cursor-pointer ${theme === 'dark' ? 'bg-gray-900 hover:bg-gray-800' : 'bg-white hover:bg-gray-100'} rounded-lg p-3 shadow-xl transition-all hover:scale-110`}
            >
              <Camera className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`} />
            </label>
          </div>

          <div className="px-8 pb-6 relative">
            {/* Avatar */}
            <div className="flex items-end justify-between -mt-12 mb-4">
              <div className="relative z-10">
                {avatarImage ? (
                  <img
                    src={avatarImage}
                    alt="Avatar"
                    className={`w-24 h-24 rounded-2xl object-cover shadow-xl border-4 ${theme === 'dark' ? 'border-gray-900' : 'border-white'}`}
                  />
                ) : (
                  <div className={`w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-4xl font-bold text-white shadow-xl border-4 ${theme === 'dark' ? 'border-gray-900' : 'border-white'}`}>
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 rounded-full p-2 shadow-lg transition-colors cursor-pointer"
                >
                  <Camera className="w-3 h-3 text-white" />
                </label>
              </div>
              <Button 
                onClick={() => setShowEditModal(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </div>

            {/* User Info */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {user?.name}
                </h1>
                <span className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm font-semibold rounded-full">
                  Level {profileData.level}
                </span>
              </div>
              <div className={`flex flex-wrap items-center gap-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-3`}>
                <span className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {user?.email}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Joined {profileData.joinDate}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {profileData.location}
                </span>
              </div>
              <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-4`}>
                {profileData.bio}
              </p>

              {/* Social Links */}
              <div className="flex gap-3">
                <a href={`https://${profileData.github}`} target="_blank" rel="noopener noreferrer" 
                   className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                     theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                   }`}>
                  <Github className="w-4 h-4" />
                  <span className="text-sm">GitHub</span>
                </a>
                <a href={`https://${profileData.linkedin}`} target="_blank" rel="noopener noreferrer"
                   className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                     theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                   }`}>
                  <Linkedin className="w-4 h-4" />
                  <span className="text-sm">LinkedIn</span>
                </a>
                <a href={`https://${profileData.website}`} target="_blank" rel="noopener noreferrer"
                   className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                     theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                   }`}>
                  <Globe className="w-4 h-4" />
                  <span className="text-sm">Website</span>
                </a>
              </div>
            </div>

            {/* XP Progress Bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Experience Points
                </span>
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {profileData.experience} / {profileData.nextLevelXP} XP
                </span>
              </div>
              <div className={`w-full h-3 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                  style={{ width: `${(profileData.experience / profileData.nextLevelXP) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className={`${theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} border rounded-xl p-6 hover:shadow-lg transition-shadow`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-12 h-12 bg-gradient-to-br ${getStatColor(stat.color)} rounded-xl flex items-center justify-center`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-1`}>
                {stat.value}
              </h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className={`${theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} border rounded-xl mb-6`}>
          <div className="flex border-b border-gray-800">
            {(['overview', 'activity', 'achievements', 'settings'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-6 py-4 font-medium transition-colors ${
                  activeTab === tab
                    ? theme === 'dark'
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-blue-600 border-b-2 border-blue-600'
                    : theme === 'dark'
                      ? 'text-gray-400 hover:text-gray-300'
                      : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
                    <Target className="w-5 h-5 text-blue-500" />
                    Skills
                  </h3>
                  <div className="space-y-4">
                    {skills.map((skill, index) => (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            {skill.name}
                          </span>
                          <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {skill.level}%
                          </span>
                        </div>
                        <div className={`w-full h-2 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                          <div 
                            className={`h-full bg-gradient-to-r ${getStatColor(skill.color)} rounded-full transition-all`}
                            style={{ width: `${skill.level}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Activity Tab */}
            {activeTab === 'activity' && (
              <div>
                <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
                  <Clock className="w-5 h-5 text-blue-500" />
                  Recent Activity
                </h3>
                <div className="space-y-3">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className={`${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'} border rounded-lg p-4 hover:border-blue-500/30 transition-all`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-1`}>
                            {activity.title}
                          </p>
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {activity.time}
                          </p>
                        </div>
                        {activity.points > 0 && (
                          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-500 text-xs font-semibold rounded">
                            +{activity.points} XP
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Achievements Tab */}
            {activeTab === 'achievements' && (
              <div>
                <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
                  <Award className="w-5 h-5 text-blue-500" />
                  Achievements
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {achievements.map((achievement) => (
                    <div 
                      key={achievement.id} 
                      className={`${
                        achievement.earned
                          ? theme === 'dark' 
                            ? 'bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30' 
                            : 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300'
                          : theme === 'dark'
                            ? 'bg-gray-800/30 border-gray-700'
                            : 'bg-gray-50 border-gray-200'
                      } border rounded-lg p-4 ${achievement.earned ? '' : 'opacity-50'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-3xl">{achievement.icon}</div>
                        <div className="flex-1">
                          <h4 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-1`}>
                            {achievement.title}
                          </h4>
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {achievement.description}
                          </p>
                        </div>
                        {achievement.earned && (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div>
                  <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
                    <Settings className="w-5 h-5 text-blue-500" />
                    Account Settings
                  </h3>
                  <div className="space-y-4">
                    <div className={`${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'} border rounded-lg p-4`}>
                      <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>
                        Email Notifications
                      </h4>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-3`}>
                        Receive updates about your progress and new challenges
                      </p>
                      <label className="flex items-center gap-3">
                        <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" defaultChecked />
                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          Enable notifications
                        </span>
                      </label>
                    </div>

                    <div className={`${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'} border rounded-lg p-4`}>
                      <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>
                        Privacy
                      </h4>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-3`}>
                        Control who can see your profile and activities
                      </p>
                      <label className="flex items-center gap-3">
                        <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" defaultChecked />
                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          Make profile public
                        </span>
                      </label>
                    </div>

                    <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
                      Delete Account
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowEditModal(false);
              setEditName('');
              setEditPassword('');
              setEditConfirmPassword('');
            }}
          />
          {/* Modal */}
          <div
            className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl z-50 rounded-2xl shadow-2xl ${
              theme === 'dark' ? 'bg-gray-900' : 'bg-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Edit Profile
                </h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditName('');
                    setEditPassword('');
                    setEditConfirmPassword('');
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {/* Name */}
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={user?.name || 'Enter your name'}
                  className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                />
              </div>

              {/* New Password */}
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  New Password (leave empty to keep current)
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Enter new password"
                  className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                />
              </div>

              {/* Confirm Password */}
              {editPassword && (
                <div className="mb-6">
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={editConfirmPassword}
                    onChange={(e) => setEditConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                      theme === 'dark'
                        ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  />
                </div>
              )}

              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Note: To change your profile picture or cover image, use the camera icons on your profile page.
              </p>
            </div>

            {/* Footer */}
            <div className={`px-6 py-4 border-t flex justify-end gap-3 ${
              theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
            }`}>
              <Button
                onClick={() => {
                  setShowEditModal(false);
                  setEditName('');
                  setEditPassword('');
                  setEditConfirmPassword('');
                }}
                className={`px-6 ${
                  theme === 'dark'
                    ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                Cancel
              </Button>
              <Button
                onClick={saveProfileChanges}
                className="px-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
