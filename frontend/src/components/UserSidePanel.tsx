import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, X, FolderOpen, Trophy, Settings, ChevronRight, Moon, Sun, Minus, Plus, LogOut } from 'lucide-react';
import type { Theme, User as UserType } from '../types';

interface UserSidePanelProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  user: UserType | null;
  avatarImage: string | null;
  fontSize: number;
  setFontSize: (size: number) => void;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export function UserSidePanel({
  theme,
  setTheme,
  user,
  avatarImage,
  fontSize,
  setFontSize,
  isOpen,
  onClose,
  onLogout,
}: UserSidePanelProps) {
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      
      {/* Panel */}
      <div className={`fixed top-0 right-0 h-full w-80 z-50 shadow-2xl transform transition-transform duration-300 ${
        theme === 'dark' ? 'bg-gray-900 border-l border-gray-800' : 'bg-white border-l border-gray-200'
      }`}>
        {/* Header */}
        <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {avatarImage ? (
                <img src={avatarImage} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">{user?.name?.charAt(0).toUpperCase()}</span>
                </div>
              )}
              <div>
                <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{user?.name}</p>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{user?.email}</p>
              </div>
            </div>
            <button onClick={onClose} className={`p-1 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="p-2">
          <button onClick={() => { onClose(); navigate('/profile'); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}>
            <User className="w-5 h-5" /><span>Profile</span>
          </button>

          <button onClick={() => { onClose(); navigate('/projects'); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}>
            <FolderOpen className="w-5 h-5" /><span>Projects</span>
          </button>

          <button onClick={() => { onClose(); navigate('/tournaments'); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}>
            <Trophy className="w-5 h-5" /><span>Tournaments</span>
          </button>

          {/* Settings Section */}
          <div className="mt-2">
            <button onClick={() => setShowSettings(!showSettings)} className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}>
              <div className="flex items-center gap-3"><Settings className="w-5 h-5" /><span>Settings</span></div>
              <ChevronRight className={`w-4 h-4 transition-transform ${showSettings ? 'rotate-90' : ''}`} />
            </button>

            {showSettings && (
              <div className={`mt-1 ml-4 mr-2 p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-100'}`}>
                {/* Dark Mode Toggle */}
                <div className="flex items-center justify-between py-2">
                  <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Dark Mode</span>
                  <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className={`relative w-11 h-6 rounded-full transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform flex items-center justify-center ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`}>
                      {theme === 'dark' ? <Moon className="w-2.5 h-2.5 text-blue-600" /> : <Sun className="w-2.5 h-2.5 text-yellow-500" />}
                    </div>
                  </button>
                </div>

                {/* Font Size Control */}
                <div className="flex items-center justify-between py-2">
                  <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Font Size</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setFontSize(Math.max(10, fontSize - 2))} className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}>
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className={`w-8 text-center text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{fontSize}</span>
                    <button onClick={() => setFontSize(Math.min(24, fontSize + 2))} className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}>
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Logout */}
        <div className={`absolute bottom-0 left-0 right-0 p-4 border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
          <button onClick={() => { onClose(); onLogout(); navigate('/'); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-red-500/10 text-red-400' : 'hover:bg-red-50 text-red-600'}`}>
            <LogOut className="w-5 h-5" /><span>Sign out</span>
          </button>
        </div>
      </div>
    </>
  );
}
