import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchUserProfile, type UserProfile } from '../services/userService';
import { getStoredUser } from '../services/authService';
import { useTheme } from '../context/ThemeContext';
import { UserSidePanel } from '../components/UserSidePanel';
import { ProfileHeader, ProfileCard, StatsGrid, ProfileTabs } from '../components/profile';
import { Star, CheckCircle, Trophy, Zap } from 'lucide-react';

export function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [fontSize, setFontSize] = useState(14);

  const viewer = getStoredUser();

  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'achievements' | 'settings'>('overview');

  const [totalPoints, setTotalPoints] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

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
        const data = await fetchUserProfile(userId);
        if (!data) {
          setError('User not found');
        } else {
          setProfile(data);
          if (typeof data.totalPoints === 'number') {
            setTotalPoints(data.totalPoints);
          }
        }
      } catch (e) {
        console.error('Failed to load user profile', e);
        setError('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId, navigate, viewer]);

  useEffect(() => {
    setCompletedCount(0);
  }, []);

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

  const otherUser = { name: profile.name, email: profile.email };

  const profileData = {
    joinDate: profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Unknown',
    location: 'Unknown',
    bio: 'NexusQuest learner',
    level: 1,
    experience: totalPoints,
    nextLevelXP: Math.max(totalPoints + 100, 1000),
    github: 'github.com/username',
    linkedin: 'linkedin.com/in/username',
    website: 'myportfolio.com'
  };

  const stats = [
    { label: 'Total Points', value: totalPoints.toLocaleString(), icon: Star, color: 'yellow' },
    { label: 'Problems Solved', value: completedCount.toString(), icon: CheckCircle, color: 'green' },
    { label: 'Global Rank', value: '#156', icon: Trophy, color: 'purple' },
    { label: 'Current Streak', value: '7 days', icon: Zap, color: 'blue' }
  ];

  const skills = [
    { name: 'Python', level: 80, color: 'blue' },
    { name: 'JavaScript', level: 70, color: 'yellow' },
    { name: 'C++', level: 60, color: 'purple' },
    { name: 'Data Structures', level: 75, color: 'green' },
    { name: 'Algorithms', level: 65, color: 'red' }
  ];

  const recentActivity = [] as { id: number; type: string; title: string; time: string; points: number }[];

  const achievements = [
    { id: 1, title: 'First Steps', description: 'Solve your first problem', earned: true, icon: '🎯' },
    { id: 2, title: 'Speed Demon', description: 'Solve 5 problems in one day', earned: false, icon: '⚡' },
    { id: 3, title: 'Week Warrior', description: 'Maintain 7-day streak', earned: false, icon: '🔥' },
  ];

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
        />
      </div>
    </div>
  );
}

export default UserProfilePage;
