import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchUserProfile, type UserProfile, getUserLeaderboardRank } from '../services/userService';
import { getStoredUser } from '../services/authService';
import { useTheme } from '../context/ThemeContext';
import { UserSidePanel } from '../components/UserSidePanel';
import { ProfileHeader, ProfileCard, StatsGrid, ProfileTabs } from '../components/profile';
import { Star, CheckCircle, Trophy, Zap, Lock } from 'lucide-react';
import { getUserDailyChallengeStats } from '../services/dailyChallengeService';
import { getGamificationProfile, GamificationProfile, getAvailableAchievements, AchievementWithStatus } from '../services/gamificationService';
import { getUserProgress, TaskProgress } from '../services/taskService';

export function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [fontSize, setFontSize] = useState(14);

  const [viewer] = useState(() => getStoredUser());

  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'achievements' | 'settings'>('overview');

  const [totalPoints, setTotalPoints] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [globalRank, setGlobalRank] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [gamificationProfile, setGamificationProfile] = useState<GamificationProfile | null>(null);
  const [allAchievements, setAllAchievements] = useState<AchievementWithStatus[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<TaskProgress[]>([]);

  useEffect(() => {
    if (!viewer) {
      navigate('/login');
      return;
    }

    if (!userId) {
      navigate('/dashboard');
      return;
    }

    const load = async () => {
      try {
        const [data, leaderboard, dailyStats] = await Promise.all([
          fetchUserProfile(userId),
          getUserLeaderboardRank(userId),
          getUserDailyChallengeStats(userId),
        ]);

        if (!data) {
          setError('User not found');
        } else {
          setProfile(data);
          if (typeof data.totalPoints === 'number') {
            setTotalPoints(data.totalPoints);
          }
        }

        if (dailyStats) {
          setCompletedCount(dailyStats.totalCompleted || 0);
          setStreak(dailyStats.currentStreak || 0);
        }

        if (leaderboard && typeof leaderboard.rank === 'number') {
          setGlobalRank(leaderboard.rank);
        } else {
          setGlobalRank(null);
        }

        // Try to fetch gamification profile
        try {
          const [gamification, availableAchievements, userTasks] = await Promise.all([
            getGamificationProfile(userId),
            getAvailableAchievements(),
            getUserProgress(userId, 'completed'),
          ]);
          setGamificationProfile(gamification);
          setIsPrivate(false);
          setCompletedTasks(userTasks);

          // Map available achievements with the target user's unlock status
          const achievementsWithStatus: AchievementWithStatus[] = availableAchievements.map(achievement => {
            const unlocked = gamification.achievements.find(a => a.id === achievement.id);
            return {
              ...achievement,
              earned: !!unlocked,
              unlockedAt: unlocked?.unlockedAt,
            };
          });
          setAllAchievements(achievementsWithStatus);
        } catch (gamError: any) {
          // If profile is private, we'll get an error
          if (gamError.message?.includes('private')) {
            setIsPrivate(true);
          }
          console.log('Could not load gamification profile:', gamError.message);
        }
      } catch (e) {
        console.error('Failed to load user profile or stats', e);
        setError('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId, navigate, viewer]);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <p className="text-sm text-gray-400">Loading profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center px-4 ${theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <p className="text-sm text-red-400 mb-4">{error || 'User not found'}</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded-full bg-gray-800 hover:bg-gray-700 text-sm text-gray-100 border border-gray-700"
        >
          Go back
        </button>
      </div>
    );
  }

  // If profile is private, show limited view
  if (isPrivate) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50'}`}>
        <ProfileHeader
          user={viewer ? { name: viewer.name, email: viewer.email } : null}
          avatarImage={null}
          onShowSidePanel={() => setShowSidePanel(true)}
        />

        <UserSidePanel
          user={viewer ? { name: viewer.name, email: viewer.email } : null}
          avatarImage={null}
          isOpen={showSidePanel}
          onClose={() => setShowSidePanel(false)}
          onLogout={() => navigate('/login')}
          theme={theme}
          setTheme={setTheme}
          fontSize={fontSize}
          setFontSize={setFontSize}
        />

        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className={`${theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} border rounded-xl p-12 text-center`}>
            <Lock className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
            <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              This Profile is Private
            </h2>
            <p className={`text-lg mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {profile.name}'s profile is set to private
            </p>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
              Only the profile owner can view their achievements, skills, and activity
            </p>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className={`mt-6 px-6 py-2 rounded-lg ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-gray-100' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}
            >
              Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const otherUser = { name: profile.name, email: profile.email };

  const profileData = {
    joinDate: profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Unknown',
    location: 'Unknown',
    bio: 'NexusQuest learner',
    level: gamificationProfile?.level || 1,
    experience: gamificationProfile?.xpProgress || 0,
    nextLevelXP: gamificationProfile?.xpNeeded || 100,
    github: 'github.com/username',
    linkedin: 'linkedin.com/in/username',
    website: 'myportfolio.com'
  };

  const stats = [
    { label: 'Total Points', value: totalPoints.toLocaleString(), icon: Star, color: 'yellow' },
    { label: 'Problems Solved', value: completedCount.toString(), icon: CheckCircle, color: 'green' },
    { label: 'Global Rank', value: globalRank && globalRank > 0 ? `#${globalRank}` : '-', icon: Trophy, color: 'purple' },
    { label: 'Current Streak', value: `${streak} days`, icon: Zap, color: 'blue' }
  ];

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      python: 'blue',
      javascript: 'yellow',
      java: 'red',
      cpp: 'purple',
      general: 'green'
    };
    return colors[category] || 'gray';
  };

  const skills = gamificationProfile?.skills.map(skill => ({
    name: skill.name,
    level: Math.min(100, Math.floor((skill.xp / (skill.level * 100)) * 100)),
    color: getCategoryColor(skill.category)
  })) || [];

  // Recent activity from completed tasks
  const recentActivity = completedTasks.slice(0, 4).map((progress, index) => {
    const task = progress.taskId;
    const completedDate = progress.completedAt ? new Date(progress.completedAt) : new Date();
    const now = new Date();
    const diffMs = now.getTime() - completedDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    const timeAgo = diffDays > 0 ? `${diffDays} day${diffDays > 1 ? 's' : ''} ago` : 
                   diffHours > 0 ? `${diffHours} hour${diffHours > 1 ? 's' : ''} ago` : 'Just now';
    
    return {
      id: index + 1,
      type: 'solved' as const,
      title: typeof task === 'object' ? task.title : 'Completed Task',
      time: timeAgo,
      points: typeof task === 'object' ? task.points : 0
    };
  });

  const achievements = allAchievements.map((ach, index) => ({
    id: index + 1,
    title: ach.title,
    description: ach.description,
    earned: ach.earned,
    icon: ach.icon,
    hidden: ach.hidden,
    unlockedAt: ach.unlockedAt,
  }));

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50'}`}>
      <ProfileHeader
        user={viewer ? { name: viewer.name, email: viewer.email } : null}
        avatarImage={null}
        onShowSidePanel={() => setShowSidePanel(true)}
      />

      <UserSidePanel
        user={viewer ? { name: viewer.name, email: viewer.email } : null}
        avatarImage={null}
        isOpen={showSidePanel}
        onClose={() => setShowSidePanel(false)}
        onLogout={() => {
          navigate('/login');
        }}
        theme={theme}
        setTheme={setTheme}
        fontSize={fontSize}
        setFontSize={setFontSize}
      />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <ProfileCard
          user={otherUser}
          avatarImage={profile.avatarImage || null}
          coverImage={profile.coverImage || null}
          profileData={profileData}
          onAvatarChange={() => {}}
          onCoverChange={() => {}}
          onEditProfile={() => {}}
          showEditButton={false}
          showImageEditors={false}
        />

        <StatsGrid stats={stats} />

        <ProfileTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          skills={skills}
          recentActivity={recentActivity}
          achievements={achievements}
          showSettings={false}
          customSkills={gamificationProfile?.customSkills || []}
        />
      </div>
    </div>
  );
}

export default UserProfilePage;
