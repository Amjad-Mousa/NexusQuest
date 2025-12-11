import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { fetchUsers, fetchConversations, type ChatUser } from '../services/userService';
import { getStoredUser } from '../services/authService';
import { connectChat, getChatSocket, type ChatMessage } from '../services/chatService';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, Search, Users, MessageCircle, ChevronRight } from 'lucide-react';

export function UsersPage() {
  const { theme } = useTheme();
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [conversations, setConversations] = useState<ChatUser[]>([]);
  const [search, setSearch] = useState('');
  const [unreadByUser, setUnreadByUser] = useState<Record<string, number>>({});
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const currentUser = getStoredUser();
    if (!currentUser) {
      navigate('/login');
      return;
    }

    Promise.all([fetchUsers(), fetchConversations()]).then(([allUsers, convos]) => {
      const filteredUsers = allUsers.filter((u) => u.id !== currentUser.id);
      setUsers(filteredUsers);
      setConversations(convos);

      try {
        const raw = localStorage.getItem('nexusquest-unread-users');
        const map: Record<string, number> = raw ? JSON.parse(raw) : {};
        setUnreadByUser(map);
      } catch {
        // ignore JSON errors
      }
    });
  }, [navigate]);

  useEffect(() => {
    const initial = searchParams.get('q') || '';
    setSearch(initial);
  }, [searchParams]);

  useEffect(() => {
    const s = connectChat();
    if (!s) return;

    const handleReceived = (_msg: ChatMessage) => {
      const currentUser = getStoredUser();
      if (currentUser && _msg.recipientId === currentUser.id) {
        const fromId = _msg.senderId;
        setUnreadByUser(prev => ({
          ...prev,
          [fromId]: (prev[fromId] || 0) + 1,
        }));
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

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(term)
    );
  }, [users, search]);

  const clearUnread = (userId: string) => {
    setUnreadByUser(prev => {
      const next = { ...prev };
      if (next[userId]) {
        delete next[userId];
        localStorage.setItem('nexusquest-unread-users', JSON.stringify(next));
      }
      return next;
    });
  };

  return (
    <div className={`min-h-screen flex flex-col relative ${
      theme === 'dark'
        ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white'
        : 'bg-gradient-to-br from-gray-50 via-white to-gray-50 text-gray-900'
    }`}>
      {/* Subtle Background */}
      {theme === 'dark' && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
        </div>
      )}
      
      {/* Header */}
      <header className={`sticky top-0 z-10 px-6 py-4 border-b flex items-center justify-between backdrop-blur-xl shadow-sm ${
        theme === 'dark'
          ? 'border-gray-800/50 bg-gray-950/80'
          : 'border-gray-200 bg-white/80'
      }`}>
        <button
          type="button"
          className={`flex items-center gap-2 text-sm font-medium transition-colors ${
            theme === 'dark'
              ? 'text-gray-400 hover:text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <MessageCircle className={`w-5 h-5 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
          <h1 className={`text-base font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Messages</h1>
        </div>
        <div className="w-16" />
      </header>

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 w-full max-w-5xl mx-auto space-y-8 relative z-10">
        {/* Search Bar */}
        <div className="relative">
          <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
            theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
          }`} />
          <input
            className={`w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm outline-none transition-all shadow-lg ${
              theme === 'dark'
                ? 'bg-gray-900/90 border border-gray-800 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500'
                : 'bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 shadow-md'
            }`}
            placeholder="Search by name..."
            value={search}
            onChange={(e) => {
              const value = e.target.value;
              setSearch(value);
              if (value.trim()) {
                setSearchParams({ q: value.trim() });
              } else {
                setSearchParams({});
              }
            }}
          />
        </div>

        {/* Recent Chats */}
        {conversations.length > 0 && (
          <section>
            <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>Recent Chats</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {conversations.map((u) => (
                <Link
                  key={u.id}
                  to={`/chat/${u.id}`}
                  state={{ userName: u.name, userEmail: u.email }}
                  onClick={() => clearUnread(u.id)}
                  className={`group relative rounded-2xl border transition-all duration-300 px-5 py-4 flex flex-col justify-between shadow-lg hover:-translate-y-1 ${
                    theme === 'dark'
                      ? 'border-gray-800/50 bg-gradient-to-br from-gray-900/80 to-gray-900/40 hover:border-emerald-500/50 hover:from-gray-900 hover:to-gray-800/80 hover:shadow-emerald-500/10'
                      : 'border-gray-200 bg-white hover:border-emerald-500/50 hover:shadow-emerald-500/10 shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-semibold truncate group-hover:text-emerald-500 transition-colors ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {u.name}
                      </div>
                    </div>
                    {unreadByUser[u.id] > 0 && (
                      <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-gradient-to-r from-red-500 to-red-600 text-[10px] font-bold leading-5 text-white flex items-center justify-center shadow-lg shadow-red-500/30">
                        {unreadByUser[u.id] > 9 ? '9+' : unreadByUser[u.id]}
                      </span>
                    )}
                  </div>
                  {u.lastMessageAt && (
                    <div className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      {new Date(u.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* All Users */}
        <section>
          <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`}>All Users</h3>
          <div className="space-y-2.5">
            {filteredUsers.map((u) => (
              <Link
                key={u.id}
                to={`/chat/${u.id}`}
                state={{ userName: u.name, userEmail: u.email }}
                onClick={() => clearUnread(u.id)}
                className={`group relative rounded-2xl border transition-all duration-300 px-5 py-4 flex items-center justify-between shadow-lg hover:-translate-y-0.5 ${
                  theme === 'dark'
                    ? 'border-gray-800/50 bg-gradient-to-r from-gray-900/70 to-gray-900/40 hover:border-emerald-500/50 hover:from-gray-900/90 hover:to-gray-900/70 hover:shadow-emerald-500/10'
                    : 'border-gray-200 bg-white hover:border-emerald-500/50 hover:shadow-emerald-500/10 shadow-md'
                }`}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 border ${
                    theme === 'dark'
                      ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  }`}>
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold group-hover:text-emerald-500 transition-colors truncate ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {u.name}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {unreadByUser[u.id] > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-gradient-to-r from-red-500 to-red-600 text-[10px] font-bold leading-5 text-white flex items-center justify-center shadow-lg shadow-red-500/30">
                      {unreadByUser[u.id] > 9 ? '9+' : unreadByUser[u.id]}
                    </span>
                  )}
                  <ChevronRight className={`w-5 h-5 group-hover:translate-x-1 transition-all ${
                    theme === 'dark' ? 'text-emerald-400/60 group-hover:text-emerald-400' : 'text-emerald-500/60 group-hover:text-emerald-500'
                  }`} />
                </div>
              </Link>
            ))}
          </div>
          {filteredUsers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
                theme === 'dark'
                  ? 'bg-gray-800/50 border border-gray-700/50'
                  : 'bg-gray-100 border border-gray-200'
              }`}>
                <Users className={`w-8 h-8 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
              </div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>No users found</p>
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>Try a different search term</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default UsersPage;