import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { getStoredUser } from '../services/authService';
import { getTopLeaderboard, getMyLeaderboardRank, type LeaderboardEntry } from '../services/userService';
import { UserSidePanel } from '../components/UserSidePanel';
import { Trophy, Star, User as UserIcon } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';

export function LeaderboardPage() {
  usePageTitle('Leaderboard');
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
    <div className={`min-h-screen relative ${theme === 'dark' ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50'}`}>
      {/* Subtle Background */}
      {theme === 'dark' && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        </div>
      )}
      <header className="border-b border-gray-800/40 bg-gray-950/80 backdrop-blur-xl shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="text-xs px-4 py-2 rounded-lg bg-gray-800/60 border border-gray-700/50 text-gray-300 hover:bg-gray-700/60 hover:text-white hover:border-gray-600 transition-all duration-200 font-medium"
            >
              ← Back
            </button>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Trophy className="w-10 h-10 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]" />
                <div className="absolute inset-0 blur-xl bg-yellow-400/20 rounded-full"></div>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                  Global Leaderboard
                </h1>
                <p className="text-xs text-gray-400 mt-0.5">Top 50 {activeRole === 'teacher' ? 'teachers' : 'students'} competing worldwide</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowSidePanel(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800/60 border border-gray-700/50 text-sm text-gray-200 hover:bg-gray-700/60 hover:border-gray-600 transition-all duration-200"
          >
            <UserIcon className="w-4 h-4" />
            <span className="font-medium">{viewer?.name}</span>
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

      <main className="container mx-auto px-6 py-10 max-w-6xl">
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-12 h-12 border-4 border-gray-700 border-t-yellow-400 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-400 text-sm">Loading leaderboard...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="inline-block p-4 rounded-full bg-red-500/10 border border-red-500/30 mb-4">
              <Trophy className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-900/40 rounded-xl p-4 border border-gray-800/50 backdrop-blur-sm">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-300">
                  <Star className="w-5 h-5 text-yellow-400" />
                  <span>
                    Showing top <span className="font-bold text-white">{entries.length}</span> of{' '}
                    <span className="font-bold text-white">{totalUsers ?? '...'}</span> {activeRole === 'teacher' ? 'teachers' : 'students'}
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-gray-950/60 border border-gray-700/50 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setActiveRole('user')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                      activeRole === 'user'
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                    }`}
                  >
                    Students
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveRole('teacher')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                      activeRole === 'teacher'
                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                    }`}
                  >
                    Teachers
                  </button>
                </div>
              </div>
              {myRank && (
                <div className="text-xs px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-emerald-500/10 font-medium">
                  Your global rank: <span className="font-bold text-white">#{myRank}</span>
                  {myPoints !== null && (
                    <span className="ml-2 text-gray-300">({myPoints.toLocaleString()} pts)</span>
                  )}
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-800/50 bg-gradient-to-b from-gray-950/80 to-gray-900/80 shadow-2xl backdrop-blur-sm">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-gray-900/90 via-gray-850/90 to-gray-900/90 border-b border-gray-700/50">
                  <tr className="text-left text-xs text-gray-400 uppercase tracking-wider">
                    <th className="px-6 py-4 w-20 font-semibold">Rank</th>
                    <th className="px-6 py-4 font-semibold">User</th>
                    <th className="px-6 py-4 text-right w-36 font-semibold">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, idx) => {
                    const isMe = viewer && entry.email === viewer.email;
                    const isTop3 = entry.rank <= 3;
                    const medalColor = entry.rank === 1 ? 'from-yellow-400 to-amber-500' : 
                                     entry.rank === 2 ? 'from-gray-300 to-gray-400' : 
                                     'from-orange-400 to-amber-600';
                    
                    return (
                      <tr
                        key={entry.id}
                        className={`border-t border-gray-800/40 hover:bg-gray-800/50 transition-all duration-200 cursor-pointer group ${
                          isMe ? 'bg-emerald-900/20 hover:bg-emerald-900/30' : ''
                        }`}
                        onClick={() => navigate(`/user/${entry.id}`)}
                      >
                        <td className="px-6 py-4">
                          {isTop3 ? (
                            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${medalColor} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                              {entry.rank}
                            </div>
                          ) : (
                            <span className="text-base font-semibold text-gray-400 group-hover:text-gray-300">
                              #{entry.rank}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg ${
                              isTop3 ? `bg-gradient-to-br ${medalColor}` : 'bg-gradient-to-br from-blue-500/50 to-purple-500/50'
                            }`}>
                              {entry.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-base font-semibold text-gray-100 flex items-center gap-2 group-hover:text-white transition-colors">
                                {entry.name}
                                {isMe && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-500/50 font-medium">
                                    You
                                  </span>
                                )}
                                {isTop3 && (
                                  <Trophy className="w-4 h-4 text-yellow-400" />
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20">
                            <span className="text-base font-bold text-yellow-300">
                              {entry.totalPoints.toLocaleString()}
                            </span>
                            <span className="text-xs text-gray-400">pts</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!isInTop && myRank && (
              <div className="mt-6 pt-6 border-t border-gray-800/50">
                <h2 className="text-xs uppercase tracking-wider text-gray-500 mb-3 font-semibold">Your Position</h2>
                <div className="rounded-xl border border-emerald-500/50 bg-gradient-to-r from-emerald-900/30 to-teal-900/30 backdrop-blur-sm px-6 py-4 flex items-center justify-between shadow-lg shadow-emerald-500/5 hover:shadow-emerald-500/10 transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                      <span className="text-xl font-bold text-white">#{myRank}</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-100 text-base">{viewer.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">Currently outside top 50</div>
                    </div>
                  </div>
                  {myPoints !== null && (
                    <div className="text-right">
                      <div className="text-xs text-gray-400 mb-1">Your points</div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20">
                        <span className="text-base font-bold text-yellow-300">{myPoints.toLocaleString()}</span>
                        <span className="text-xs text-gray-400">pts</span>
                      </div>
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