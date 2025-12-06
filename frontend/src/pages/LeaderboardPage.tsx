import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { getStoredUser } from '../services/authService';
import { getTopLeaderboard, getMyLeaderboardRank, type LeaderboardEntry } from '../services/userService';
import { UserSidePanel } from '../components/UserSidePanel';
import { Trophy, Star, User as UserIcon } from 'lucide-react';

export function LeaderboardPage() {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [viewer] = useState(() => getStoredUser());

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myPoints, setMyPoints] = useState<number | null>(null);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [activeRole, setActiveRole] = useState<'user' | 'teacher'>(() =>
    viewer?.role === 'teacher' ? 'teacher' : 'user'
  );

  useEffect(() => {
    if (!viewer) {
      navigate('/login');
      return;
    }

    const load = async () => {
      try {
        const [top, me] = await Promise.all([
          getTopLeaderboard(50, activeRole),
          getMyLeaderboardRank(),
        ]);

        setEntries(top);

        if (me) {
          setMyRank(me.rank);
          setMyPoints(me.totalPoints);
          setTotalUsers(me.totalUsers);
        }
      } catch (e) {
        console.error('Failed to load leaderboard', e);
        setError('Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate, viewer, activeRole]);

  if (!viewer) {
    return null;
  }

  const isInTop = myRank && entries.some(e => e.rank === myRank);

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50'}`}>
      <header className="border-b border-gray-800/60 bg-black/40 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="text-xs px-3 py-1.5 rounded-full border border-gray-700 text-gray-300 hover:bg-gray-900/70 hover:text-white"
            >
              ← Back
            </button>
            <div className="flex items-center gap-2">
              <Trophy className="w-8 h-8 text-yellow-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">Global Leaderboard</h1>
                <p className="text-xs text-gray-400">Top 50 {activeRole === 'teacher' ? 'teachers' : 'students'} by total points</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowSidePanel(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-700 text-sm text-gray-200 hover:bg-gray-800"
          >
            <UserIcon className="w-4 h-4" />
            <span>{viewer?.name}</span>
          </button>
        </div>
      </header>

      <UserSidePanel
        theme={theme}
        setTheme={setTheme}
        user={viewer}
        avatarImage={null}
        fontSize={fontSize}
        setFontSize={setFontSize}
        isOpen={showSidePanel}
        onClose={() => setShowSidePanel(false)}
        onLogout={() => navigate('/login')}
      />

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {loading ? (
          <div className="text-center text-gray-400 text-sm">Loading leaderboard...</div>
        ) : error ? (
          <div className="text-center text-red-400 text-sm">{error}</div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span>
                    Showing top <span className="font-semibold">{entries.length}</span> of{' '}
                    <span className="font-semibold">{totalUsers ?? '...'}</span> {activeRole === 'teacher' ? 'teachers' : 'students'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] bg-gray-900/70 border border-gray-700 rounded-full px-1 py-0.5">
                  <button
                    type="button"
                    onClick={() => setActiveRole('user')}
                    className={`px-2 py-0.5 rounded-full ${
                      activeRole === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Students
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveRole('teacher')}
                    className={`px-2 py-0.5 rounded-full ${
                      activeRole === 'teacher'
                        ? 'bg-purple-500 text-white'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Teachers
                  </button>
                </div>
              </div>
              {myRank && (
                <div className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Your global rank: <span className="font-semibold">#{myRank}</span>
                  {myPoints !== null && (
                    <span className="ml-2 text-gray-300">({myPoints} points)</span>
                  )}
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-800/70 bg-gray-950/60 shadow-xl">
              <table className="w-full text-sm">
                <thead className="bg-gray-900/80 border-b border-gray-800">
                  <tr className="text-left text-xs text-gray-400">
                    <th className="px-4 py-3 w-16">Rank</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3 text-right w-32">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(entry => {
                    const isMe = viewer && entry.email === viewer.email;
                    return (
                      <tr
                        key={entry.id}
                        className={`border-t border-gray-900/60 hover:bg-gray-900/70 transition-colors cursor-pointer ${
                          isMe ? 'bg-emerald-900/30' : ''
                        }`}
                        onClick={() => navigate(`/user/${entry.id}`)}
                      >
                        <td className="px-4 py-2.5 text-sm text-gray-200">
                          #{entry.rank}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500/40 to-purple-500/40 flex items-center justify-center text-xs font-semibold text-white">
                              {entry.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-100 flex items-center gap-1">
                                {entry.name}
                                {isMe && (
                                  <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                    You
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right text-sm font-semibold text-yellow-300">
                          {entry.totalPoints.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!isInTop && myRank && (
              <div className="mt-4 pt-4 border-t border-gray-800/70">
                <h2 className="text-xs uppercase tracking-wide text-gray-500 mb-2">Your position</h2>
                <div className="rounded-lg border border-emerald-600/50 bg-emerald-900/20 px-4 py-3 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-emerald-300">#{myRank}</span>
                    <div>
                      <div className="font-medium text-gray-100">{viewer.name}</div>
                      <div className="text-[11px] text-gray-400">Outside top 50</div>
                    </div>
                  </div>
                  {myPoints !== null && (
                    <div className="text-right">
                      <div className="text-xs text-gray-400">Your points</div>
                      <div className="text-sm font-semibold text-yellow-300">{myPoints.toLocaleString()}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default LeaderboardPage;
