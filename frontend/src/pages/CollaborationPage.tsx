import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCollaboration } from '../context/CollaborationContext';
import { collaborationService } from '../services/collaborationService';
import { getStoredUser } from '../services/authService';
import { CollaborationSession, CreateSessionData } from '../types/collaboration';
import CollaborativeEditor from '../components/CollaborativeEditor';
import { useTheme } from '../context/ThemeContext';
import { NotificationsBell } from '../components/NotificationsBell';
import { UserSidePanel } from '../components/UserSidePanel';
import {
  Plus,
  Users,
  Clock,
  Globe,
  Lock,
  Loader2,
  Play,
  Code,
  Code2,
  X,
  User,
  ArrowLeft,
  Sparkles,
  Zap,
  Copy,
  Share2,
  Trash2,
} from 'lucide-react';
import { Button } from '../components/ui/button';

export default function CollaborationPage() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId?: string }>();
  const { joinSession, currentSession } = useCollaboration();
  const storedUser = getStoredUser();
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);

  const [sessions, setSessions] = useState<CollaborationSession[]>([]);
  const [publicSessions, setPublicSessions] = useState<CollaborationSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'my-sessions' | 'public'>('my-sessions');

  const [formData, setFormData] = useState<CreateSessionData>({
    name: '',
    description: '',
    language: 'javascript',
    isPublic: false,
    maxParticipants: 10,
  });

  useEffect(() => {
    loadSessions();
  }, []);

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

  useEffect(() => {
    if (sessionId && !currentSession) {
      handleJoinSession(sessionId);
    }
  }, [sessionId]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const [mySessions, pubSessions] = await Promise.all([
        collaborationService.getUserSessions(true),
        collaborationService.getPublicSessions(),
      ]);
      setSessions(mySessions);
      setPublicSessions(pubSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a session name');
      return;
    }

    try {
      setCreating(true);
      const session = await collaborationService.createSession(formData);
      setShowCreateDialog(false);
      setFormData({
        name: '',
        description: '',
        language: 'javascript',
        isPublic: false,
        maxParticipants: 10,
      });
      navigate(`/collaboration/${session.sessionId}`);
      handleJoinSession(session.sessionId);
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Failed to create session');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinSession = async (sessionId: string) => {
    try {
      const session = await collaborationService.getSession(sessionId);
      const user = getStoredUser();
      if (!user?.id) {
        alert('Please log in again to join collaboration sessions.');
        return;
      }
      
      joinSession({
        sessionId: session.sessionId,
        userId: user.id,
        username: user.name || user.email,
      });
    } catch (error) {
      console.error('Error joining session:', error);
      alert(
        (error as any)?.response?.data?.message ||
        'Failed to join session'
      );
    }
  };

  const handleEndSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to end this session?')) return;

    try {
      await collaborationService.endSession(sessionId);
      loadSessions();
    } catch (error) {
      console.error('Error ending session:', error);
      alert('Failed to end session');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('nexusquest-token');
    localStorage.removeItem('nexusquest-user');
    navigate('/');
  };

  if (currentSession) {
    return (
      <div className="h-screen w-screen flex overflow-hidden">
        <CollaborativeEditor
          sessionId={currentSession.sessionId}
          initialCode={currentSession.code}
          language={currentSession.language}
        />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen relative ${
        theme === 'dark' ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white' : 'bg-gradient-to-br from-gray-100 via-white to-gray-100 text-gray-900'
      }`}
    >
      {/* Subtle Background */}
      {theme === 'dark' && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-0 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
        </div>
      )}
      {/* Top Header/Navbar */}
      <header className={`border-b sticky top-0 z-50 ${
        theme === 'dark' 
          ? 'border-gray-800/50 bg-gray-950/80' 
          : 'border-gray-200 bg-white/80'
      } backdrop-blur-xl shadow-sm`}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className={`flex items-center gap-2 ${
                theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              } transition-colors`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Code2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-orange-400 via-red-400 to-orange-500 bg-clip-text text-transparent">
                Live Collaboration
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <NotificationsBell theme={theme} />
            <Button
              onClick={() => setShowSidebar(true)}
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
              {storedUser?.name || 'Profile'}
            </Button>
          </div>
        </div>
      </header>

      {/* User Sidebar */}
      <UserSidePanel
        user={storedUser}
        onLogout={handleLogout}
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
      />

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Live Collaboration</h1>
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
              Code together in real-time
            </p>
          </div>
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-300 hover:scale-105"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Session
          </Button>
        </div>

        {/* Tabs */}
        <div className={`flex gap-2 mb-8 p-1.5 rounded-xl w-fit ${
          theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-100'
        }`}>
          <button
            onClick={() => setActiveTab('my-sessions')}
            className={`px-5 py-2.5 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 ${
              activeTab === 'my-sessions'
                ? theme === 'dark'
                  ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg shadow-orange-500/25'
                  : 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25'
                : theme === 'dark'
                ? 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }`}
          >
            <User className="w-4 h-4" />
            My Sessions
            {sessions.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'my-sessions'
                  ? 'bg-white/20'
                  : theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'
              }`}>
                {sessions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('public')}
            className={`px-5 py-2.5 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 ${
              activeTab === 'public'
                ? theme === 'dark'
                  ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg shadow-orange-500/25'
                  : 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25'
                : theme === 'dark'
                ? 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            Public Sessions
            {publicSessions.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'public'
                  ? 'bg-white/20'
                  : theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'
              }`}>
                {publicSessions.length}
              </span>
            )}
          </button>
        </div>

        {/* Sessions List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-orange-500/20 border-t-orange-500 animate-spin" />
              <Zap className="w-6 h-6 text-orange-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className={`mt-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Loading sessions...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(activeTab === 'my-sessions' ? sessions : publicSessions).map((session) => {
              const activeParticipants = session.participants?.filter((p) => p.isActive).length || 0;
              const isOwner = session.owner === storedUser?.id;
              
              return (
                <div
                  key={session.sessionId}
                  className={`group relative p-6 rounded-2xl border transition-all duration-300 overflow-hidden ${
                    theme === 'dark'
                      ? 'bg-gray-900/60 border-gray-800 hover:border-orange-500/50 hover:shadow-xl hover:shadow-orange-500/10'
                      : 'bg-white border-gray-200 hover:border-orange-400 shadow-sm hover:shadow-xl hover:shadow-orange-500/10'
                  } hover:-translate-y-1`}
                >
                  {/* Gradient overlay on hover */}
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${
                    theme === 'dark'
                      ? 'bg-gradient-to-br from-orange-500/5 via-transparent to-red-500/5'
                      : 'bg-gradient-to-br from-orange-500/5 via-transparent to-red-500/5'
                  }`} />
                  
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4 relative">
                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold truncate">{session.name}</h3>
                        {isOwner && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            theme === 'dark'
                              ? 'bg-orange-500/20 text-orange-400'
                              : 'bg-orange-100 text-orange-600'
                          }`}>
                            Owner
                          </span>
                        )}
                      </div>
                      {session.description && (
                        <p className={`text-sm line-clamp-2 ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {session.description}
                        </p>
                      )}
                    </div>
                    <div className={`p-2 rounded-lg ${
                      session.isPublic
                        ? theme === 'dark' ? 'bg-green-500/20' : 'bg-green-100'
                        : theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                    }`}>
                      {session.isPublic ? (
                        <Globe className="w-4 h-4 text-green-500" />
                      ) : (
                        <Lock className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                      )}
                    </div>
                  </div>

                  {/* Info badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${
                      theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                    }`}>
                      <Code className="w-3.5 h-3.5 text-orange-500" />
                      <span className="capitalize font-medium">{session.language}</span>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${
                      theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                    }`}>
                      <Users className="w-3.5 h-3.5 text-blue-500" />
                      <span>
                        <span className="font-medium">{activeParticipants}</span>
                        <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>
                          /{session.maxParticipants}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Active participants avatars */}
                  {activeParticipants > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex -space-x-2">
                        {session.participants?.filter(p => p.isActive).slice(0, 4).map((p, idx) => (
                          <div
                            key={p.userId}
                            className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                            style={{ 
                              backgroundColor: p.color || '#6366f1',
                              borderColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                              zIndex: 4 - idx
                            }}
                            title={p.username}
                          >
                            {p.username?.charAt(0).toUpperCase()}
                          </div>
                        ))}
                        {activeParticipants > 4 && (
                          <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-medium ${
                            theme === 'dark'
                              ? 'bg-gray-700 border-gray-900 text-gray-300'
                              : 'bg-gray-200 border-white text-gray-600'
                          }`}>
                            +{activeParticipants - 4}
                          </div>
                        )}
                      </div>
                      <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                        coding now
                      </span>
                    </div>
                  )}

                  {/* Last activity */}
                  <div className={`flex items-center gap-1.5 text-xs mb-4 ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    <Clock className="w-3.5 h-3.5" />
                    <span>Last active {new Date(session.lastActivity).toLocaleDateString()}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 relative">
                    <Button
                      onClick={() => {
                        navigate(`/collaboration/${session.sessionId}`);
                        handleJoinSession(session.sessionId);
                      }}
                      className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all duration-300"
                      size="sm"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Join Session
                    </Button>
                    {activeTab === 'my-sessions' && (
                      <Button
                        onClick={() => handleEndSession(session.sessionId)}
                        variant="outline"
                        size="sm"
                        className={`${
                          theme === 'dark'
                            ? 'border-gray-700 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400'
                            : 'border-gray-300 hover:bg-red-50 hover:border-red-300 hover:text-red-500'
                        } transition-all duration-300`}
                        title="End Session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}

            {(activeTab === 'my-sessions' ? sessions : publicSessions).length === 0 && (
              <div className="col-span-full">
                <div className={`text-center py-16 px-8 rounded-2xl border-2 border-dashed ${
                  theme === 'dark' ? 'border-gray-800 bg-gray-900/30' : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center ${
                    theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                  }`}>
                    {activeTab === 'my-sessions' ? (
                      <Sparkles className="w-10 h-10 text-orange-500" />
                    ) : (
                      <Globe className="w-10 h-10 text-orange-500" />
                    )}
                  </div>
                  <h3 className="text-xl font-bold mb-2">
                    {activeTab === 'my-sessions'
                      ? 'No Active Sessions'
                      : 'No Public Sessions'}
                  </h3>
                  <p className={`mb-6 max-w-sm mx-auto ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {activeTab === 'my-sessions'
                      ? 'Start a new collaboration session and invite your friends to code together in real-time!'
                      : 'There are no public sessions available right now. Check back later or create your own!'}
                  </p>
                  {activeTab === 'my-sessions' && (
                    <Button
                      onClick={() => setShowCreateDialog(true)}
                      className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 shadow-lg shadow-orange-500/25"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Session
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Session Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${
              theme === 'dark' ? 'bg-gray-900' : 'bg-white'
            }`}
          >
            {/* Dialog Header */}
            <div className={`px-6 py-4 border-b ${
              theme === 'dark' ? 'border-gray-800 bg-gray-900' : 'border-gray-100 bg-gray-50'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Create New Session</h2>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      Start coding together in real-time
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateDialog(false)}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-200'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Dialog Body */}
            <div className="p-6 space-y-5">
              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Session Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700 focus:border-orange-500 text-white placeholder-gray-500'
                      : 'bg-gray-50 border-gray-200 focus:border-orange-500 text-gray-900 placeholder-gray-400'
                  }`}
                  placeholder="e.g., JavaScript Study Group"
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none resize-none ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700 focus:border-orange-500 text-white placeholder-gray-500'
                      : 'bg-gray-50 border-gray-200 focus:border-orange-500 text-gray-900 placeholder-gray-400'
                  }`}
                  rows={3}
                  placeholder="What will you be working on?"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${
                    theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                  }`}>
                    Language
                  </label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-gray-800 border-gray-700 focus:border-orange-500 text-white'
                        : 'bg-gray-50 border-gray-200 focus:border-orange-500 text-gray-900'
                    }`}
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                    <option value="go">Go</option>
                    <option value="rust">Rust</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-semibold mb-2 ${
                    theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                  }`}>
                    Max Participants
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="50"
                    value={formData.maxParticipants}
                    onChange={(e) =>
                      setFormData({ ...formData, maxParticipants: parseInt(e.target.value) })
                    }
                    className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none ${
                      theme === 'dark'
                        ? 'bg-gray-800 border-gray-700 focus:border-orange-500 text-white'
                        : 'bg-gray-50 border-gray-200 focus:border-orange-500 text-gray-900'
                    }`}
                  />
                </div>
              </div>

              {/* Public toggle */}
              <div className={`flex items-center justify-between p-4 rounded-xl ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    formData.isPublic
                      ? 'bg-green-500/20 text-green-500'
                      : theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {formData.isPublic ? <Globe className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-medium">
                      {formData.isPublic ? 'Public Session' : 'Private Session'}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formData.isPublic
                        ? 'Anyone can discover and join'
                        : 'Only people with the link can join'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isPublic: !formData.isPublic })}
                  className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
                    formData.isPublic
                      ? 'bg-green-500'
                      : theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
                  }`}
                >
                  <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                    formData.isPublic ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>

            {/* Dialog Footer */}
            <div className={`px-6 py-4 border-t flex gap-3 ${
              theme === 'dark' ? 'border-gray-800 bg-gray-900/50' : 'border-gray-100 bg-gray-50'
            }`}>
              <Button
                onClick={() => setShowCreateDialog(false)}
                variant="outline"
                disabled={creating}
                className={`flex-1 py-3 ${
                  theme === 'dark'
                    ? 'border-gray-700 hover:bg-gray-800'
                    : 'border-gray-300 hover:bg-gray-100'
                }`}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateSession}
                disabled={creating || !formData.name.trim()}
                className="flex-1 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 shadow-lg shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create Session
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
