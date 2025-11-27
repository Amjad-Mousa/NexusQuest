import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Code2, User } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ProfileHeaderProps {
  user: { name: string; email: string } | null;
  avatarImage: string | null;
  onShowSidePanel: () => void;
}

export function ProfileHeader({ user, avatarImage, onShowSidePanel }: ProfileHeaderProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();

  return (
    <header className={`border-b sticky top-0 z-50 ${
      theme === 'dark' 
        ? 'border-gray-800 bg-gray-950/80' 
        : 'border-gray-200 bg-white/80'
    } backdrop-blur-md`}>
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className={`${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
            ← Back
          </button>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Code2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">
              NexusQuest
            </span>
          </div>
        </div>
        <Button
          onClick={onShowSidePanel}
          variant="outline"
          className={`flex items-center gap-2 ${
            theme === 'dark'
              ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
              : 'border-gray-300 text-gray-700 hover:bg-gray-100'
          }`}
        >
          {avatarImage ? (
            <img 
              src={avatarImage} 
              alt="Avatar" 
              className="w-6 h-6 rounded-full object-cover" 
            />
          ) : (
            <User className="w-4 h-4" />
          )}
          {user?.name}
        </Button>
      </div>
    </header>
  );
}

