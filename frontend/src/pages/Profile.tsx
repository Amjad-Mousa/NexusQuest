import { useState } from 'react';
import { Star, CheckCircle, Trophy, Zap } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useProfileImages } from '../hooks/useProfileImages';
import { UserSidePanel } from '../components/UserSidePanel';
import { ProfileHeader, ProfileCard, StatsGrid, ProfileTabs, EditProfileModal } from '../components/profile';

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



  // Mock data
  const profileData = {
    joinDate: 'January 2024',
    location: 'Amman, Jordan',
    bio: 'Passionate developer learning to code and solve problems',
    level: 12,
    experience: 2450,
    nextLevelXP: 3000,
    github: 'github.com/username',
    linkedin: 'linkedin.com/in/username',
    website: 'myportfolio.com'
  };

  const stats = [
    { label: 'Total Points', value: '2,450', icon: Star, color: 'yellow' },
    { label: 'Problems Solved', value: '47', icon: CheckCircle, color: 'green' },
    { label: 'Global Rank', value: '#156', icon: Trophy, color: 'purple' },
    { label: 'Current Streak', value: '7 days', icon: Zap, color: 'blue' }
  ];

  const skills = [
    { name: 'Python', level: 85, color: 'blue' },
    { name: 'JavaScript', level: 70, color: 'yellow' },
    { name: 'C++', level: 60, color: 'purple' },
    { name: 'Data Structures', level: 75, color: 'green' },
    { name: 'Algorithms', level: 65, color: 'red' }
  ];

  const recentActivity = [
    { id: 1, type: 'solved', title: 'Two Sum Problem', time: '2 hours ago', points: 10 },
    { id: 2, type: 'achievement', title: 'Earned "Speed Demon" badge', time: '5 hours ago', points: 50 },
    { id: 3, type: 'project', title: 'Created new project "Todo App"', time: '1 day ago', points: 0 },
    { id: 4, type: 'solved', title: 'Binary Search Implementation', time: '2 days ago', points: 25 }
  ];

  const achievements = [
    { id: 1, title: 'First Steps', description: 'Solve your first problem', earned: true, icon: '🎯' },
    { id: 2, title: 'Speed Demon', description: 'Solve 5 problems in one day', earned: true, icon: '⚡' },
    { id: 3, title: 'Week Warrior', description: 'Maintain 7-day streak', earned: true, icon: '🔥' },
    { id: 4, title: 'Century Club', description: 'Solve 100 problems', earned: false, icon: '💯' },
    { id: 5, title: 'Language Master', description: 'Master 3 languages', earned: false, icon: '🌟' },
    { id: 6, title: 'Code Legend', description: 'Reach level 50', earned: false, icon: '👑' }
  ];

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
