import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchUsers, fetchConversations, type ChatUser } from '../services/userService';
import { getStoredUser } from '../services/authService';
import { connectChat, getChatSocket, type ChatMessage } from '../services/chatService';

export function UsersPage() {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [conversations, setConversations] = useState<ChatUser[]>([]);
  const [search, setSearch] = useState('');
  const [unreadByUser, setUnreadByUser] = useState<Record<string, number>>({});
  const navigate = useNavigate();

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

      // Load any stored unread counts from localStorage
      try {
        const raw = localStorage.getItem('nexusquest-unread-users');
        const map: Record<string, number> = raw ? JSON.parse(raw) : {};
        setUnreadByUser(map);
      } catch {
        // ignore JSON errors
      }
    });
  }, [navigate]);

  // Subscribe for new messages indicator within Messages page
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
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term)
    );
  }, [users, search]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
      <header className="px-4 py-3 border-b border-gray-800 flex items-center justify-between bg-gray-950/80 backdrop-blur">
        <button
          type="button"
          className="text-sm text-gray-300 hover:text-white"
          onClick={() => navigate(-1)}
        >
          Back
        </button>
        <h1 className="text-lg font-semibold">Messages</h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 px-4 py-4 w-full max-w-4xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <h2 className="text-sm text-gray-400 flex-1">Search by name</h2>
          <input
            className="px-3 py-1.5 rounded-full bg-gray-900 border border-gray-700 text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-52"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {conversations.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm text-gray-300">Recent chats</h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {conversations.map((u) => (
                <Link
                  key={u.id}
                  to={`/chat/${u.id}`}
                  state={{ userName: u.name, userEmail: u.email }}
                  onClick={() => {
                    // Clear unread for this user when opening chat
                    setUnreadByUser(prev => {
                      const next = { ...prev };
                      if (next[u.id]) {
                        delete next[u.id];
                        localStorage.setItem('nexusquest-unread-users', JSON.stringify(next));
                      }
                      return next;
                    });
                  }}
                  className="min-w-[160px] max-w-[200px] rounded-2xl border border-gray-800 bg-gray-900/70 hover:border-emerald-500 hover:bg-gray-900/90 transition-colors px-3 py-2 flex-shrink-0 flex flex-col justify-center"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold truncate">{u.name}</div>
                    {unreadByUser[u.id] > 0 && (
                      <span className="ml-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[10px] leading-4 text-white flex items-center justify-center">
                        {unreadByUser[u.id] > 9 ? '9+' : unreadByUser[u.id]}
                      </span>
                    )}
                  </div>
                  {u.lastMessageAt && (
                    <div className="text-[10px] text-gray-500 mt-1">
                      Last: {new Date(u.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="space-y-2">
            {filteredUsers.map((u) => (
              <Link
                key={u.id}
                to={`/chat/${u.id}`}
                state={{ userName: u.name, userEmail: u.email }}
                onClick={() => {
                  // Clear unread for this user when opening chat
                  setUnreadByUser(prev => {
                    const next = { ...prev };
                    if (next[u.id]) {
                      delete next[u.id];
                      localStorage.setItem('nexusquest-unread-users', JSON.stringify(next));
                    }
                    return next;
                  });
                }}
                className="group rounded-2xl border border-gray-800 bg-gray-900/70 hover:border-emerald-500 hover:bg-gray-900/90 transition-colors px-4 py-3 flex items-center justify-between"
              >
                <div className="flex flex-col">
                  <div className="text-sm font-semibold group-hover:text-emerald-400">
                    {u.name}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {unreadByUser[u.id] > 0 && (
                    <span className="min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[10px] leading-4 text-white flex items-center justify-center">
                      {unreadByUser[u.id] > 9 ? '9+' : unreadByUser[u.id]}
                    </span>
                  )}
                  <span className="text-[11px] text-emerald-400 opacity-80 group-hover:opacity-100">
                    Open chat →
                  </span>
                </div>
              </Link>
            ))}
          </div>
          {filteredUsers.length === 0 && (
            <div className="text-sm text-gray-500 text-center mt-8">
              No users match your search.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default UsersPage;

