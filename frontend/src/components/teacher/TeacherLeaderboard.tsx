import { useState, useEffect } from 'react';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface LeaderboardEntry {
  id: string;
  name: string;
  email: string;
  totalPoints: number;
  rank: number;
}

export default function TeacherLeaderboard() {
  const { theme } = useTheme();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('nexusquest-token');
      const user = JSON.parse(localStorage.getItem('nexusquest-user') || '{}');

      // Fetch teacher leaderboard
      const response = await fetch('http://localhost:3001/api/auth/leaderboard/top?role=teacher&limit=50', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.data || []);

        // Find current user's rank
        const currentUserEntry = data.data.find((entry: LeaderboardEntry) => entry.id === user.id);
        if (currentUserEntry) {
          setUserRank(currentUserEntry.rank);
        }
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-400" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />;
      default:
        return <Award className="w-5 h-5 text-gray-500" />;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 2:
        return 'bg-gray-400/20 text-gray-300 border-gray-400/30';
      case 3:
        return 'bg-amber-600/20 text-amber-500 border-amber-600/30';
      default:
        return theme === 'dark' ? 'bg-gray-800 text-gray-300 border-gray-700' : 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className={`rounded-xl border p-8 ${theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border ${theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`}>
      {/* Header */}
      <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Teacher Leaderboard</h2>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Top educators by contribution points
              </p>
            </div>
          </div>
          {userRank && (
            <div className={`px-4 py-2 rounded-lg border ${getRankColor(userRank)}`}>
              <p className="text-xs font-medium">Your Rank</p>
              <p className="text-2xl font-bold">#{userRank}</p>
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard List */}
      <div className={`divide-y ${theme === 'dark' ? 'divide-gray-800' : 'divide-gray-200'}`}>
        {leaderboard.length === 0 ? (
          <div className="p-8 text-center">
            <Trophy className="w-12 h-12 mx-auto text-gray-600 mb-4" />
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
              No teachers on the leaderboard yet
            </p>
          </div>
        ) : (
          leaderboard.map((entry) => {
            const user = JSON.parse(localStorage.getItem('nexusquest-user') || '{}');
            const isCurrentUser = entry.id === user.id;

            return (
              <div
                key={entry.id}
                className={`p-4 flex items-center justify-between transition-colors ${
                  isCurrentUser
                    ? theme === 'dark'
                      ? 'bg-blue-500/10 hover:bg-blue-500/20'
                      : 'bg-blue-50 hover:bg-blue-100'
                    : theme === 'dark'
                    ? 'hover:bg-gray-800/50'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-4 flex-1">
                  {/* Rank */}
                  <div className="flex items-center justify-center w-12">
                    {getRankIcon(entry.rank)}
                  </div>

                  {/* User Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">
                        {entry.name}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                            You
                          </span>
                        )}
                      </p>
                    </div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {entry.email}
                    </p>
                  </div>

                  {/* Points */}
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-400">
                      {entry.totalPoints.toLocaleString()}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      points
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Points Info */}
      <div className={`p-4 border-t ${theme === 'dark' ? 'border-gray-800 bg-gray-800/30' : 'border-gray-200 bg-gray-50'}`}>
        <p className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          Earn Points By:
        </p>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className={`p-2 rounded ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
            <p className="font-medium text-blue-400">+20 pts</p>
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Create Task</p>
          </div>
          <div className={`p-2 rounded ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
            <p className="font-medium text-purple-400">+25 pts</p>
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Create Quiz</p>
          </div>
          <div className={`p-2 rounded ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
            <p className="font-medium text-green-400">+30 pts</p>
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Create Tutorial</p>
          </div>
        </div>
      </div>
    </div>
  );
}
