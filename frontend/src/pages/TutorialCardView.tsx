import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Code, Loader2, CheckCircle, Trophy, ChevronRight, Code2, MessageCircle, User } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useTheme } from '../context/ThemeContext';
import { getTutorial, getTutorials, Tutorial } from '../services/tutorialService';
import type { TutorialSection } from '../services/tutorialService';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { getStoredUser } from '../services/authService';
import { NotificationsBell } from '../components/NotificationsBell';
import { UserSidePanel } from '../components/UserSidePanel';
import { connectChat, getChatSocket, type ChatMessage } from '../services/chatService';
import { usePageTitle } from '../hooks/usePageTitle';
import YouTubeEmbed from '../components/YouTubeEmbed';

export default function TutorialCardView() {
  usePageTitle('Tutorial');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completedSections, setCompletedSections] = useState<Set<number>>(new Set());
  const [nextTutorial, setNextTutorial] = useState<Tutorial | null>(null);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [fontSize, setFontSize] = useState(14);
  const [newMessageCount, setNewMessageCount] = useState(0);

  useEffect(() => {
    loadTutorial();
  }, [id]);

  // Load user avatar
  useEffect(() => {
    const loadUserAvatar = async () => {
      try {
        const token = localStorage.getItem('nexusquest-token');
        const response = await fetch('http://localhost:9876/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
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

  const getTutorialProgressKey = (tutorialId: string): string => {
    const user = getStoredUser();
    return user ? `tutorial-progress-${user.id}-${tutorialId}` : `tutorial-progress-${tutorialId}`;
  };

  const loadTutorial = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setCurrentSection(0); // Reset to first section when loading new tutorial
      setNextTutorial(null); // Reset next tutorial
      
      const data = await getTutorial(id);
      setTutorial(data);
      
      // Load completed sections from localStorage
      const saved = localStorage.getItem(getTutorialProgressKey(id));
      if (saved) {
        const progress = JSON.parse(saved);
        if (progress.sections) {
          setCompletedSections(new Set(progress.sections));
        } else {
          setCompletedSections(new Set(progress)); // Old format
        }
        
        // Check if tutorial is already completed - if so, show completion screen
        if (progress.completed) {
          setCurrentSection(data.sections.length);
        }
      } else {
        setCompletedSections(new Set());
      }

      // Load next tutorial
      await loadNextTutorial(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load tutorial');
    } finally {
      setLoading(false);
    }
  };

  const loadNextTutorial = async (currentTutorial: Tutorial) => {
    try {
      const allTutorials = await getTutorials();
      const sameLangTutorials = allTutorials
        .filter(t => t.language === currentTutorial.language)
        .sort((a, b) => a.order - b.order);
      
      const currentIndex = sameLangTutorials.findIndex(t => t.id === currentTutorial.id);
      if (currentIndex !== -1 && currentIndex < sameLangTutorials.length - 1) {
        setNextTutorial(sameLangTutorials[currentIndex + 1]);
      }
    } catch (err) {
      console.error('Failed to load next tutorial:', err);
    }
  };

  const handleNext = () => {
    if (tutorial && currentSection < tutorial.sections.length - 1) {
      // Mark current section as completed
      const newCompleted = new Set(completedSections);
      newCompleted.add(currentSection);
      setCompletedSections(newCompleted);
      
      // Save progress
      localStorage.setItem(
        getTutorialProgressKey(id!),
        JSON.stringify(Array.from(newCompleted))
      );
      
      setCurrentSection(currentSection + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  const handleSectionClick = (index: number) => {
    setCurrentSection(index);
  };

  const handleReviewTutorial = () => {
    setCurrentSection(0);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-500/20 text-green-400';
      case 'intermediate':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'advanced':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !tutorial) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <div className="text-center">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-400 mb-4">{error || 'Tutorial not found'}</p>
          <Button onClick={() => navigate('/tutorials')}>Back to Tutorials</Button>
        </div>
      </div>
    );
  }

  // Check if showing completion screen
  const isCompletionScreen = currentSection >= tutorial.sections.length;
  const currentSectionData = isCompletionScreen ? null : tutorial.sections[currentSection];
  const progress = ((currentSection + 1) / tutorial.sections.length) * 100;

  const user = getStoredUser();

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950' : 'bg-gradient-to-br from-gray-100 via-white to-gray-100'}`}>
      {/* Main Header */}
      <header className={`border-b sticky top-0 z-50 ${theme === 'dark' ? 'border-gray-800 bg-gray-950/80' : 'border-gray-200 bg-white/80'} backdrop-blur-md`}>
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
              <form onSubmit={(e) => { e.preventDefault(); const term = userSearch.trim(); if (term) navigate(`/users?q=${encodeURIComponent(term)}`); }}>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search users by name..."
                  className={`w-64 pl-3 pr-3 py-2 rounded-full text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500/60 shadow-sm transition-colors ${
                    theme === 'dark' ? 'bg-gray-900/80 border-gray-700 text-gray-100 placeholder:text-gray-500' : 'bg-white/80 border-gray-300 text-gray-800 placeholder:text-gray-400'
                  }`}
                />
              </form>
            </div>
            <button type="button" onClick={() => { setNewMessageCount(0); navigate('/users'); }} className={`relative rounded-full p-2 border hover:text-emerald-300 hover:border-emerald-500 transition-colors ${theme === 'dark' ? 'border-gray-700 bg-gray-900/70 text-gray-300' : 'border-gray-300 bg-white/70 text-gray-600'}`}>
              <MessageCircle className="w-4 h-4" />
              {newMessageCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[10px] leading-4 text-white flex items-center justify-center">
                  {newMessageCount > 9 ? '9+' : newMessageCount}
                </span>
              )}
            </button>
            <NotificationsBell theme={theme} />
            <Button onClick={() => setShowSidePanel(true)} variant="outline" className={`flex items-center gap-2 ${theme === 'dark' ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}>
              {avatarImage ? <img src={avatarImage} alt="Avatar" className="w-6 h-6 rounded-full object-cover" /> : <User className="w-4 h-4" />}
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
          onLogout={() => { localStorage.removeItem('nexusquest-token'); localStorage.removeItem('nexusquest-user'); navigate('/login'); }}
        />
      )}

      {/* Tutorial Sub-Header */}
      <div className={`border-b ${theme === 'dark' ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white/50'} backdrop-blur-sm`}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigate('/tutorials')}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Learning Paths
            </Button>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getDifficultyColor(tutorial.difficulty)}`}>
                {tutorial.difficulty}
              </span>
              <span className={`px-3 py-1 rounded-lg text-sm font-medium ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                {tutorial.language}
              </span>
            </div>
          </div>
          {!isCompletionScreen && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                  Section {currentSection + 1} of {tutorial.sections.length}
                </span>
                <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>{Math.round(progress)}% Complete</span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}`}>
                <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {isCompletionScreen ? (
          // Completion Screen
          <div className="max-w-3xl mx-auto">
            <div className={`rounded-xl p-12 text-center ${theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'}`}>
              {/* Celebration */}
              <div className="mb-6">
                <Trophy className="w-20 h-20 mx-auto mb-4 text-yellow-500" />
                <h1 className="text-4xl font-bold mb-3">🎉 Congratulations!</h1>
                <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  You've successfully completed <span className="font-semibold text-blue-500">{tutorial.title}</span>!
                </p>
              </div>

              {/* Stats */}
              <div className={`grid grid-cols-2 gap-4 mb-8 p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                <div>
                  <div className="text-3xl font-bold text-blue-500">{tutorial.sections.length}</div>
                  <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Sections Completed</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-green-500">100%</div>
                  <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Progress</div>
                </div>
              </div>

              {/* Next Tutorial Card */}
              {nextTutorial ? (
                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-4 flex items-center justify-center gap-2">
                    Continue Your Learning Journey
                    <ChevronRight className="w-5 h-5 text-blue-500" />
                  </h3>
                  <div 
                    className={`p-6 rounded-xl text-left border-2 transition-all hover:scale-105 cursor-pointer ${
                      theme === 'dark' 
                        ? 'bg-gray-800 border-blue-500/50 hover:border-blue-500' 
                        : 'bg-gray-50 border-blue-200 hover:border-blue-400'
                    }`}
                    onClick={() => navigate(`/tutorials/${nextTutorial.id}`)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-lg font-bold mb-1">{nextTutorial.title}</h4>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {nextTutorial.description}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-lg text-xs font-medium ${getDifficultyColor(nextTutorial.difficulty)}`}>
                        {nextTutorial.difficulty}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className={`px-2 py-1 rounded ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                        {nextTutorial.language}
                      </span>
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                        {nextTutorial.sections.length} sections
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-8">
                  <div className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <h3 className="text-xl font-semibold mb-2">🏆 Language Path Complete!</h3>
                    <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      You've completed all tutorials in {tutorial.language}. Check out other languages to continue learning!
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {nextTutorial && (
                  <Button
                    onClick={() => navigate(`/tutorials/${nextTutorial.id}`)}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  >
                    Continue to Next Tutorial
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleReviewTutorial}
                >
                  <BookOpen className="w-5 h-5 mr-2" />
                  Review Tutorial
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/tutorials')}
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back to Learning Paths
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Regular Tutorial View
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar - Section Navigation */}
            <div className={`lg:col-span-1 rounded-xl p-4 h-fit sticky top-24 ${theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'}`}>
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-500" />
                Sections
              </h3>
              <div className="space-y-2">
                {tutorial.sections.map((section: TutorialSection, index: number) => (
                  <button
                    key={section.id}
                    onClick={() => handleSectionClick(index)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all text-sm flex items-center gap-2 ${
                      currentSection === index
                        ? theme === 'dark'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500'
                          : 'bg-blue-100 text-blue-700 border border-blue-500'
                        : completedSections.has(index)
                        ? theme === 'dark'
                          ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                          : 'bg-green-50 text-green-700 hover:bg-green-100'
                        : theme === 'dark'
                        ? 'hover:bg-gray-800 text-gray-400'
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    {completedSections.has(index) && (
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span className="flex-1">{section.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Main Content - Card */}
            <div className="lg:col-span-3">
              <div className={`rounded-xl p-8 min-h-[600px] ${theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'}`}>
                {/* Section Title */}
                <h1 className="text-3xl font-bold mb-2">{tutorial.title}</h1>
                <h2 className="text-2xl font-semibold text-blue-500 mb-6">{currentSectionData?.title}</h2>

                {/* Section Content */}
                <div className="mb-8">
                  <div className="prose prose-lg max-w-none">
                    {currentSectionData?.content.split('\n\n').map((paragraph, idx) => (
                      <p key={idx} className={`mb-4 leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>

                {/* YouTube Video */}
                {currentSectionData?.videoUrl && (
                  <YouTubeEmbed 
                    videoUrl={currentSectionData.videoUrl} 
                    title={`${currentSectionData.title} - Video`}
                    theme={theme}
                  />
                )}

                {/* Code Example */}
                {currentSectionData?.codeExample && (
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-3">
                      <Code className="w-5 h-5 text-blue-500" />
                      <h3 className="font-semibold text-lg">Code Example</h3>
                    </div>
                    <SyntaxHighlighter
                      language={currentSectionData.language || tutorial.language}
                      style={vscDarkPlus as any}
                      customStyle={{
                        borderRadius: '0.75rem',
                        padding: '1.5rem',
                        fontSize: '0.95rem'
                      }}
                    >
                      {currentSectionData.codeExample}
                    </SyntaxHighlighter>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between pt-6 border-t border-gray-700">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentSection === 0}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Previous
                  </Button>

                  <div className="text-sm text-gray-400">
                    {currentSection + 1} / {tutorial.sections.length}
                  </div>

                  {currentSection === tutorial.sections.length - 1 ? (
                    <Button
                      onClick={() => {
                        const newCompleted = new Set(completedSections);
                        newCompleted.add(currentSection);
                        setCompletedSections(newCompleted);
                        localStorage.setItem(
                          getTutorialProgressKey(id!),
                          JSON.stringify({ completed: true, sections: Array.from(newCompleted) })
                        );
                        // Show completion with next suggestion
                        setCurrentSection(tutorial.sections.length); // Go to completion screen
                      }}
                      className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Complete Tutorial
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNext}
                      className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                    >
                      Next
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
