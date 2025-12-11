import { useState, useEffect } from 'react';
import { Star, CheckCircle, Trophy, Zap } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useProfileImages } from '../hooks/useProfileImages';
import { UserSidePanel } from '../components/UserSidePanel';
import { ProfileHeader, ProfileCard, StatsGrid, ProfileTabs, EditProfileModal } from '../components/profile';
import { getUserStats, getMyProgress, TaskProgress } from '../services/taskService';
import { getMyLeaderboardRank } from '../services/userService';
import { getDailyChallengeStats } from '../services/dailyChallengeService';
import { getGamificationProfile, GamificationProfile, getAllAchievementsWithStatus, AchievementWithStatus } from '../services/gamificationService';

interface ProfileProps {
  user: { name: string; email: string } | null;
  onLogout: () => void;
}

export function Profile({ user, onLogout }: ProfileProps) {
  const { theme, setTheme } = useTheme();
  const { avatarImage, coverImage, handleAvatarChange, handleCoverChange } = useProfileImages();

  const [showSidePanel, setShowSidePanel] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'achievements' | 'settings'>('overview');
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editConfirmPassword, setEditConfirmPassword] = useState('');
  const [fontSize, setFontSize] = useState(14);
  const [totalPoints, setTotalPoints] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [completedTasks, setCompletedTasks] = useState<TaskProgress[]>([]);
  const [globalRank, setGlobalRank] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [gamificationProfile, setGamificationProfile] = useState<GamificationProfile | null>(null);
  const [allAchievements, setAllAchievements] = useState<AchievementWithStatus[]>([]);

  // Load real stats from API
  useEffect(() => {
    const loadStats = async () => {
      try {
        const [stats, completed, leaderboard, dailyStats, gamification, achievementsWithStatus] = await Promise.all([
          getUserStats(),
          getMyProgress('completed'),
          getMyLeaderboardRank(),
          getDailyChallengeStats(),
          getGamificationProfile(),
          getAllAchievementsWithStatus(),
        ]);

        setTotalPoints(stats.totalPoints);
        setCompletedCount(stats.completedTasks);
        setCompletedTasks(completed);
        setGamificationProfile(gamification);
        setAllAchievements(achievementsWithStatus);

        if (leaderboard && typeof leaderboard.rank === 'number') {
          setGlobalRank(leaderboard.rank);
        } else {
          setGlobalRank(null);
        }

        if (dailyStats) {
          setStreak(dailyStats.currentStreak || 0);
        }
      } catch (err) {
        console.error('Failed to load profile stats:', err);
      }
    };
    loadStats();
  }, []);

  const saveProfileChanges = async () => {
    if (editPassword && editPassword !== editConfirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    if (!editName && !editPassword) {
      alert('Please enter a name or password to update.');
      return;
    }

    try {
      const token = localStorage.getItem('nexusquest-token');
      const updateData: Record<string, string> = {};
      if (editName) updateData.name = editName;
      if (editPassword) updateData.password = editPassword;

      const response = await fetch('http://localhost:9876/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(updateData)
      });
      const data = await response.json();

      if (data.success) {
        const storedUser = localStorage.getItem('nexusquest-user');
        if (storedUser) {
          const userObj = JSON.parse(storedUser);
          if (data.user.name) userObj.name = data.user.name;
          localStorage.setItem('nexusquest-user', JSON.stringify(userObj));
        }
        closeEditModal();
        setTimeout(() => window.location.reload(), 100);
      } else {
        alert(data.error || 'Failed to update profile.');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile.');
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditName('');
    setEditPassword('');
    setEditConfirmPassword('');
  };



  // Profile data with real gamification
  const profileData = {
    joinDate: 'January 2024',
    location: 'Amman, Jordan',
    bio: 'Passionate developer learning to code and solve problems',
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

  // Map real skills from gamification profile
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

  // Generate recent activity from completed tasks
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

  // Map all achievements (both locked and unlocked)
  const achievements = allAchievements.map((ach, index) => ({
    id: index + 1,
    title: ach.title,
    description: ach.description,
    earned: ach.earned,
    icon: ach.icon,
    unlockedAt: ach.unlockedAt,
  }));

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50'}`}>
      <ProfileHeader
        user={user}
        avatarImage={avatarImage}
        onShowSidePanel={() => setShowSidePanel(true)}
      />

      <UserSidePanel
        user={user}
        avatarImage={avatarImage}
        isOpen={showSidePanel}
        onClose={() => setShowSidePanel(false)}
        onLogout={onLogout}
        theme={theme}
        setTheme={setTheme}
        fontSize={fontSize}
        setFontSize={setFontSize}
      />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <ProfileCard
          user={user}
          avatarImage={avatarImage}
          coverImage={coverImage}
          profileData={profileData}
          onAvatarChange={handleAvatarChange}
          onCoverChange={handleCoverChange}
          onEditProfile={() => setShowEditModal(true)}
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

      <EditProfileModal
        isOpen={showEditModal}
        onClose={closeEditModal}
        userName={user?.name}
        editName={editName}
        editPassword={editPassword}
        editConfirmPassword={editConfirmPassword}
        onNameChange={setEditName}
        onPasswordChange={setEditPassword}
        onConfirmPasswordChange={setEditConfirmPassword}
        onSave={saveProfileChanges}
      />
    </div>
  );
}
