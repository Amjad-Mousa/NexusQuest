import { Target, Clock, Award, Settings, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { useTheme } from '../../context/ThemeContext';
import { getStatColor } from './StatsGrid';

interface Skill {
  name: string;
  level: number;
  color: string;
}

interface Activity {
  id: number;
  type: string;
  title: string;
  time: string;
  points: number;
}

interface Achievement {
  id: number;
  title: string;
  description: string;
  earned: boolean;
  icon: string;
}

interface ProfileTabsProps {
  activeTab: 'overview' | 'activity' | 'achievements' | 'settings';
  onTabChange: (tab: 'overview' | 'activity' | 'achievements' | 'settings') => void;
  skills: Skill[];
  recentActivity: Activity[];
  achievements: Achievement[];
  showSettings?: boolean;
}

export function ProfileTabs({ activeTab, onTabChange, skills, recentActivity, achievements, showSettings = true }: ProfileTabsProps) {
  const { theme } = useTheme();

  const tabs = (showSettings
    ? (['overview', 'activity', 'achievements', 'settings'] as const)
    : (['overview', 'activity', 'achievements'] as const)
  );

  return (
    <div className={`${theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} border rounded-xl mb-6`}>
      <div className="flex border-b border-gray-800">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === tab
                ? theme === 'dark' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-blue-600 border-b-2 border-blue-600'
                : theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
                <Target className="w-5 h-5 text-blue-500" />Skills
              </h3>
              <div className="space-y-4">
                {skills.map((skill, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{skill.name}</span>
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{skill.level}%</span>
                    </div>
                    <div className={`w-full h-2 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                      <div className={`h-full bg-gradient-to-r ${getStatColor(skill.color)} rounded-full transition-all`} style={{ width: `${skill.level}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div>
            <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
              <Clock className="w-5 h-5 text-blue-500" />Recent Activity
            </h3>
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className={`${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'} border rounded-lg p-4 hover:border-blue-500/30 transition-all`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-1`}>{activity.title}</p>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{activity.time}</p>
                    </div>
                    {activity.points > 0 && (
                      <span className="px-2 py-1 bg-yellow-500/20 text-yellow-500 text-xs font-semibold rounded">+{activity.points} XP</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'achievements' && (
          <div>
            <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
              <Award className="w-5 h-5 text-blue-500" />Achievements
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.map((achievement) => (
                <div key={achievement.id} className={`${achievement.earned ? theme === 'dark' ? 'bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30' : 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300' : theme === 'dark' ? 'bg-gray-800/30 border-gray-700' : 'bg-gray-50 border-gray-200'} border rounded-lg p-4 ${achievement.earned ? '' : 'opacity-50'}`}>
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{achievement.icon}</div>
                    <div className="flex-1">
                      <h4 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-1`}>{achievement.title}</h4>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{achievement.description}</p>
                    </div>
                    {achievement.earned && <CheckCircle className="w-5 h-5 text-green-500" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showSettings && activeTab === 'settings' && (
          <div className="space-y-6">
            <div>
              <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
                <Settings className="w-5 h-5 text-blue-500" />Account Settings
              </h3>
              <div className="space-y-4">
                <div className={`${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'} border rounded-lg p-4`}>
                  <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>Email Notifications</h4>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-3`}>Receive updates about your progress</p>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" defaultChecked />
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Enable notifications</span>
                  </label>
                </div>
                <div className={`${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'} border rounded-lg p-4`}>
                  <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>Privacy</h4>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-3`}>Control who can see your profile</p>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" defaultChecked />
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Make profile public</span>
                  </label>
                </div>
                <Button className="w-full bg-red-600 hover:bg-red-700 text-white">Delete Account</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

