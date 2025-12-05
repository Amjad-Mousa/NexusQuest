import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { fetchUsers, fetchConversations, type ChatUser } from '../services/userService';
import { getStoredUser } from '../services/authService';
import { connectChat, getChatSocket, type ChatMessage } from '../services/chatService';

export function UsersPage() {
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
    <div className="min-h-screen flex flex-col bg-gray-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 px-6 py-4 border-b border-gray-800/50 flex items-center justify-between bg-gray-900/95 backdrop-blur-xl shadow-lg">
        <button
          type="button"
          className="text-sm text-gray-400 hover:text-white transition-colors font-medium"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>
        <h1 className="text-base font-semibold">Messages</h1>
        <div className="w-16" />
      </header>

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 w-full max-w-5xl mx-auto space-y-8">
        {/* Search Bar */}
        <div className="relative">
          <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-gray-900/90 border border-gray-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all placeholder:text-gray-500 shadow-lg"
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
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Recent Chats</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {conversations.map((u) => (
                <Link
                  key={u.id}
                  to={`/user/${u.id}`}
                  onClick={() => clearUnread(u.id)}
                  className="group relative rounded-2xl border border-gray-800/50 bg-gradient-to-br from-gray-900/80 to-gray-900/40 hover:border-emerald-500/50 hover:from-gray-900 hover:to-gray-800/80 transition-all px-5 py-4 flex flex-col justify-between shadow-lg hover:shadow-emerald-500/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate group-hover:text-emerald-400 transition-colors">
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
                    <div className="text-xs text-gray-600">
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
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">All Users</h3>
          <div className="space-y-2.5">
            {filteredUsers.map((u) => (
              <Link
                key={u.id}
                to={`/user/${u.id}`}
                onClick={() => clearUnread(u.id)}
                className="group relative rounded-2xl border border-gray-800/50 bg-gradient-to-r from-gray-900/70 to-gray-900/40 hover:border-emerald-500/50 hover:from-gray-900/90 hover:to-gray-900/70 transition-all px-5 py-4 flex items-center justify-between shadow-lg hover:shadow-emerald-500/10"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 flex items-center justify-center text-emerald-400 font-semibold text-sm flex-shrink-0 border border-emerald-500/30">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold group-hover:text-emerald-400 transition-colors truncate">
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
                  <svg className="w-5 h-5 text-emerald-400/60 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
          {filteredUsers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-sm text-gray-400">No users found</p>
              <p className="text-xs text-gray-600 mt-1">Try a different search term</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default UsersPage;