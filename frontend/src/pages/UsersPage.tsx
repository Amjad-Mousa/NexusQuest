import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchUsers, fetchConversations, type ChatUser } from '../services/userService';
import { getStoredUser } from '../services/authService';

export function UsersPage() {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [conversations, setConversations] = useState<ChatUser[]>([]);
  const [search, setSearch] = useState('');
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
    });
  }, [navigate]);

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
          <h2 className="text-sm text-gray-400 flex-1">Select a user to start a conversation</h2>
          <input
            className="px-3 py-1.5 rounded-full bg-gray-900 border border-gray-700 text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-52"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {conversations.length > 0 && (
          <section>
            <h3 className="text-xs text-gray-400 mb-2">Recent conversations</h3>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {conversations.map((u) => (
                <Link
                  key={u.id}
                  to={`/chat/${u.id}`}
                  state={{ userName: u.name, userEmail: u.email }}
                  className="min-w-[180px] max-w-[220px] rounded-2xl border border-gray-800 bg-gray-900/70 hover:border-emerald-500 hover:bg-gray-900/90 transition-colors px-3 py-2 flex-shrink-0"
                >
                  <div className="text-sm font-semibold mb-1 truncate">{u.name}</div>
                  <div className="text-[11px] text-gray-400 truncate">{u.email}</div>
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
          <h3 className="text-xs text-gray-400 mb-2">All users</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredUsers.map((u) => (
            <Link
              key={u.id}
              to={`/chat/${u.id}`}
              state={{ userName: u.name, userEmail: u.email }}
              className="group rounded-2xl border border-gray-800 bg-gray-900/60 hover:border-emerald-500 hover:bg-gray-900/90 transition-colors px-4 py-3 flex flex-col justify-between"
            >
              <div>
                <div className="text-sm font-semibold mb-1 group-hover:text-emerald-400">
                  {u.name}
                </div>
                <div className="text-[11px] text-gray-400 break-all">{u.email}</div>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400">
                <span className="px-2 py-0.5 rounded-full bg-gray-800 text-gray-200">
                  {u.role}
                </span>
                <span className="text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
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

