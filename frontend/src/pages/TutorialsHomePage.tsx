import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, CheckCircle, Circle, ChevronRight, Code2, MessageCircle, User } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { getTutorials, Tutorial } from '../services/tutorialService';
import { getStoredUser } from '../services/authService';
import { Button } from '../components/ui/button';
import { NotificationsBell } from '../components/NotificationsBell';
import { UserSidePanel } from '../components/UserSidePanel';
import { connectChat, getChatSocket, type ChatMessage } from '../services/chatService';

interface LanguageFolder {
  language: string;
  tutorials: Tutorial[];
  totalTutorials: number;
  completedTutorials: number;
  progress: number;
}

export default function TutorialsHomePage() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  
  const [folders, setFolders] = useState<LanguageFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [fontSize, setFontSize] = useState(14);
  const [newMessageCount, setNewMessageCount] = useState(0);

  useEffect(() => {
    loadFolders();
  }, []);

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

  const loadFolders = async () => {
    try {
      setLoading(true);
      const allTutorials = await getTutorials();
      
      // Group by language
      const languageMap = allTutorials.reduce((acc, tutorial) => {
        if (!acc[tutorial.language]) {
          acc[tutorial.language] = [];
        }
        acc[tutorial.language].push(tutorial);
        return acc;
      }, {} as Record<string, Tutorial[]>);

      // Create folders with progress
      const languageFolders: LanguageFolder[] = Object.entries(languageMap).map(([language, tutorials]) => {
        const sortedTutorials = tutorials.sort((a, b) => a.order - b.order);
        const completed = sortedTutorials.filter(t => isCompleted(t.id)).length;
        
        return {
          language,
          tutorials: sortedTutorials,
          totalTutorials: sortedTutorials.length,
          completedTutorials: completed,
          progress: (completed / sortedTutorials.length) * 100
        };
      });

      setFolders(languageFolders.sort((a, b) => a.language.localeCompare(b.language)));
    } catch (error) {
      console.error('Error loading folders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTutorialProgressKey = (tutorialId: string): string => {
    const user = getStoredUser();
    return user ? `tutorial-progress-${user.id}-${tutorialId}` : `tutorial-progress-${tutorialId}`;
  };

  const isCompleted = (tutorialId: string): boolean => {
    const progress = localStorage.getItem(getTutorialProgressKey(tutorialId));
    if (!progress) return false;
    
    const data = JSON.parse(progress);
    return data.completed === true;
  };

  const handleFolderClick = (language: string) => {
    if (selectedLanguage === language) {
      setSelectedLanguage(null);
    } else {
      setSelectedLanguage(language);
    }
  };

  const handleTutorialClick = (tutorial: Tutorial) => {
    navigate(`/tutorials/${tutorial.id}`);
  };

  const getLanguageIcon = (language: string) => {
    const colors: Record<string, string> = {
      javascript: 'text-yellow-400',
      python: 'text-blue-400',
      java: 'text-red-400',
      'c++': 'text-purple-400',
      go: 'text-cyan-400'
    };
    return colors[language.toLowerCase()] || 'text-gray-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const user = getStoredUser();

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950' : 'bg-gradient-to-br from-gray-100 via-white to-gray-100'}`}>
      {/* Header */}
      <header className={`border-b sticky top-0 z-50 ${
        theme === 'dark' 
          ? 'border-gray-800 bg-gray-950/80' 
          : 'border-gray-200 bg-white/80'
      } backdrop-blur-md`}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Code2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">
              NexusQuest
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const term = userSearch.trim();
                  if (term) navigate(`/users?q=${encodeURIComponent(term)}`);
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
                </div>
              </form>
            </div>
            <button
              type="button"
              onClick={() => { setNewMessageCount(0); navigate('/users'); }}
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
          setTheme={() => {}}
          user={user}
          avatarImage={avatarImage}
          fontSize={fontSize}
          setFontSize={setFontSize}
          isOpen={showSidePanel}
          onClose={() => setShowSidePanel(false)}
          onLogout={() => {
            localStorage.removeItem('nexusquest-token');
            localStorage.removeItem('nexusquest-user');
            navigate('/login');
          }}
        />
      )}

      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Learning Paths</h1>
            <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Choose a language to start your learning journey
            </p>
          </div>

        <div className="space-y-4">
          {folders.map((folder) => (
            <div
              key={folder.language}
              className={`rounded-xl border transition-all ${
                theme === 'dark'
                  ? 'bg-gray-900 border-gray-800 hover:border-gray-700'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Folder Header */}
              <button
                onClick={() => handleFolderClick(folder.language)}
                className="w-full p-6 flex items-center justify-between hover:bg-gray-800/50 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-4">
                  <FolderOpen className={`w-8 h-8 ${getLanguageIcon(folder.language)}`} />
                  <div className="text-left">
                    <h2 className="text-2xl font-bold capitalize">{folder.language}</h2>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {folder.completedTutorials} / {folder.totalTutorials} completed
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Progress Bar */}
                  <div className="w-48 bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${folder.progress}%` }}
                    />
                  </div>
                  
                  <ChevronRight
                    className={`w-6 h-6 transition-transform ${
                      selectedLanguage === folder.language ? 'rotate-90' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Tutorials List */}
              {selectedLanguage === folder.language && (
                <div className="px-6 pb-6 space-y-2">
                  {folder.tutorials.map((tutorial, index) => {
                    const completed = isCompleted(tutorial.id);
                    const previousCompleted = index === 0 || isCompleted(folder.tutorials[index - 1].id);
                    const isLocked = !previousCompleted;

                    return (
                      <button
                        key={tutorial.id}
                        onClick={() => !isLocked && handleTutorialClick(tutorial)}
                        disabled={isLocked}
                        className={`w-full p-4 rounded-lg border flex items-center justify-between transition-all ${
                          isLocked
                            ? 'opacity-50 cursor-not-allowed'
                            : theme === 'dark'
                            ? 'bg-gray-800 border-gray-700 hover:border-blue-500'
                            : 'bg-gray-50 border-gray-200 hover:border-blue-500'
                        } ${completed ? 'border-green-500' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          {completed ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-500" />
                          )}
                          
                          <div className="text-left">
                            <h3 className="font-semibold">{tutorial.title}</h3>
                            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                              {tutorial.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              tutorial.difficulty === 'beginner'
                                ? 'bg-green-500/20 text-green-400'
                                : tutorial.difficulty === 'intermediate'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {tutorial.difficulty}
                          </span>
                          
                          {!isLocked && <ChevronRight className="w-5 h-5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
        </div>
      </div>
    </div>
  );
}
