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
      <div className="h-screen">
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
        <div className="flex gap-4 mb-6 border-b">
          <button
            onClick={() => setActiveTab('my-sessions')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'my-sessions'
                ? theme === 'dark'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-blue-600 border-b-2 border-blue-600'
                : theme === 'dark'
                ? 'text-gray-400 hover:text-gray-300'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Sessions
          </button>
          <button
            onClick={() => setActiveTab('public')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'public'
                ? theme === 'dark'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-blue-600 border-b-2 border-blue-600'
                : theme === 'dark'
                ? 'text-gray-400 hover:text-gray-300'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Public Sessions
          </button>
        </div>

        {/* Sessions List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(activeTab === 'my-sessions' ? sessions : publicSessions).map((session) => (
              <div
                key={session.sessionId}
                className={`group p-6 rounded-2xl border transition-all duration-300 ${
                  theme === 'dark'
                    ? 'bg-gray-900/50 border-gray-800 hover:border-orange-500/40 hover:shadow-lg hover:shadow-orange-500/5'
                    : 'bg-white border-gray-200 hover:border-orange-300 shadow-sm hover:shadow-md'
                } hover:-translate-y-1`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">{session.name}</h3>
                    {session.description && (
                      <p
                        className={`text-sm ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}
                      >
                        {session.description}
                      </p>
                    )}
                  </div>
                  {session.isPublic ? (
                    <Globe className="w-5 h-5 text-green-500" />
                  ) : (
                    <Lock className="w-5 h-5 text-gray-500" />
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Code className="w-4 h-4" />
                    <span className="capitalize">{session.language}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4" />
                    <span>
                      {session.participants?.filter((p) => p.isActive).length || 0} /{' '}
                      {session.maxParticipants} participants
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4" />
                    <span>
                      {new Date(session.lastActivity).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      navigate(`/collaboration/${session.sessionId}`);
                      handleJoinSession(session.sessionId);
                    }}
                    className="flex-1"
                    size="sm"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Join
                  </Button>
                  {activeTab === 'my-sessions' && (
                    <Button
                      onClick={() => handleEndSession(session.sessionId)}
                      variant="outline"
                      size="sm"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {(activeTab === 'my-sessions' ? sessions : publicSessions).length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                  {activeTab === 'my-sessions'
                    ? 'No active sessions. Create one to get started!'
                    : 'No public sessions available.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Session Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className={`w-full max-w-md p-6 rounded-lg ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Create Collaboration Session</h2>
              <button onClick={() => setShowCreateDialog(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Session Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 rounded border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600'
                      : 'bg-white border-gray-300'
                  }`}
                  placeholder="My Coding Session"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className={`w-full px-3 py-2 rounded border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600'
                      : 'bg-white border-gray-300'
                  }`}
                  rows={3}
                  placeholder="Optional description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Language</label>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  className={`w-full px-3 py-2 rounded border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="go">Go</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Max Participants</label>
                <input
                  type="number"
                  min="2"
                  max="50"
                  value={formData.maxParticipants}
                  onChange={(e) =>
                    setFormData({ ...formData, maxParticipants: parseInt(e.target.value) })
                  }
                  className={`w-full px-3 py-2 rounded border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600'
                      : 'bg-white border-gray-300'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={formData.isPublic}
                  onChange={(e) =>
                    setFormData({ ...formData, isPublic: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <label htmlFor="isPublic" className="text-sm">
                  Make this session public
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleCreateSession}
                  disabled={creating}
                  className="flex-1"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Session'
                  )}
                </Button>
                <Button
                  onClick={() => setShowCreateDialog(false)}
                  variant="outline"
                  disabled={creating}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
