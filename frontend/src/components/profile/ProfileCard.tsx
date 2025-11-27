import { Button } from '../ui/button';
import { Mail, Calendar, MapPin, Edit, Camera, Github, Linkedin, Globe } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ProfileData {
  joinDate: string;
  location: string;
  bio: string;
  level: number;
  experience: number;
  nextLevelXP: number;
  github: string;
  linkedin: string;
  website: string;
}

interface ProfileCardProps {
  user: { name: string; email: string } | null;
  avatarImage: string | null;
  coverImage: string | null;
  profileData: ProfileData;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCoverChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEditProfile: () => void;
}

export function ProfileCard({ 
  user, 
  avatarImage, 
  coverImage, 
  profileData, 
  onAvatarChange, 
  onCoverChange, 
  onEditProfile 
}: ProfileCardProps) {
  const { theme } = useTheme();

  return (
    <div className={`${theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200 shadow-lg'} border rounded-2xl overflow-hidden mb-8`}>
      {/* Cover Image */}
      <div className="h-32 relative overflow-hidden">
        {coverImage ? (
          <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600" />
        )}
        <input type="file" id="cover-upload" accept="image/*" onChange={onCoverChange} className="hidden" />
        <label htmlFor="cover-upload" className={`absolute bottom-4 right-4 z-20 cursor-pointer ${theme === 'dark' ? 'bg-gray-900 hover:bg-gray-800' : 'bg-white hover:bg-gray-100'} rounded-lg p-3 shadow-xl transition-all hover:scale-110`}>
          <Camera className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`} />
        </label>
      </div>

      <div className="px-8 pb-6 relative">
        {/* Avatar */}
        <div className="flex items-end justify-between -mt-12 mb-4">
          <div className="relative z-10">
            {avatarImage ? (
              <img src={avatarImage} alt="Avatar" className={`w-24 h-24 rounded-2xl object-cover shadow-xl border-4 ${theme === 'dark' ? 'border-gray-900' : 'border-white'}`} />
            ) : (
              <div className={`w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-4xl font-bold text-white shadow-xl border-4 ${theme === 'dark' ? 'border-gray-900' : 'border-white'}`}>
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <input type="file" id="avatar-upload" accept="image/*" onChange={onAvatarChange} className="hidden" />
            <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 rounded-full p-2 shadow-lg transition-colors cursor-pointer">
              <Camera className="w-3 h-3 text-white" />
            </label>
          </div>
          <Button onClick={onEditProfile} className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white">
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        </div>

        {/* User Info */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{user?.name}</h1>
            <span className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm font-semibold rounded-full">Level {profileData.level}</span>
          </div>
          <div className={`flex flex-wrap items-center gap-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-3`}>
            <span className="flex items-center gap-1"><Mail className="w-4 h-4" />{user?.email}</span>
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />Joined {profileData.joinDate}</span>
            <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{profileData.location}</span>
          </div>
          <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-4`}>{profileData.bio}</p>

          {/* Social Links */}
          <div className="flex gap-3">
            <a href={`https://${profileData.github}`} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
              <Github className="w-4 h-4" /><span className="text-sm">GitHub</span>
            </a>
            <a href={`https://${profileData.linkedin}`} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
              <Linkedin className="w-4 h-4" /><span className="text-sm">LinkedIn</span>
            </a>
            <a href={`https://${profileData.website}`} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
              <Globe className="w-4 h-4" /><span className="text-sm">Website</span>
            </a>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Experience Points</span>
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{profileData.experience} / {profileData.nextLevelXP} XP</span>
          </div>
          <div className={`w-full h-3 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} rounded-full overflow-hidden`}>
            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all" style={{ width: `${(profileData.experience / profileData.nextLevelXP) * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

