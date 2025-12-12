import { Target, Clock, Award, Settings, CheckCircle, Plus, X } from 'lucide-react';
import { useState } from 'react';
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
  hidden?: boolean;
}

interface ProfileTabsProps {
  activeTab: 'overview' | 'activity' | 'achievements' | 'settings';
  onTabChange: (tab: 'overview' | 'activity' | 'achievements' | 'settings') => void;
  skills: Skill[];
  recentActivity: Activity[];
  achievements: Achievement[];
  showSettings?: boolean;
  isPublic?: boolean;
  onPrivacyChange?: (isPublic: boolean) => void;
  customSkills?: string[];
  onAddSkill?: (skill: string) => void;
  onRemoveSkill?: (skill: string) => void;
}

export function ProfileTabs({ activeTab, onTabChange, skills, recentActivity, achievements, showSettings = true, isPublic = true, onPrivacyChange, customSkills = [], onAddSkill, onRemoveSkill }: ProfileTabsProps) {
  const { theme } = useTheme();
  const [newSkill, setNewSkill] = useState('');
  const [addingSkill, setAddingSkill] = useState(false);

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
                
                {customSkills.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-700">
                    <h4 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-3 uppercase tracking-wide`}>
                      Additional Skills
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {customSkills.map((skill, index) => (
                        <div
                          key={index}
                          className={`px-3 py-1.5 rounded-full ${theme === 'dark' ? 'bg-blue-900/30 border-blue-700 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'} border text-sm font-medium`}
                        >
                          {skill}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
              {achievements.map((achievement) => {
                const isLocked = !achievement.earned && achievement.hidden;
                return (
                  <div key={achievement.id} className={`${achievement.earned ? theme === 'dark' ? 'bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30' : 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300' : theme === 'dark' ? 'bg-gray-800/30 border-gray-700' : 'bg-gray-50 border-gray-200'} border rounded-lg p-4 ${achievement.earned ? '' : 'opacity-50'}`}>
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">{isLocked ? '🔒' : achievement.icon}</div>
                      <div className="flex-1">
                        <h4 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-1`}>
                          {isLocked ? '???' : achievement.title}
                        </h4>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {isLocked ? 'Hidden achievement - unlock to reveal!' : achievement.description}
                        </p>
                      </div>
                      {achievement.earned && <CheckCircle className="w-5 h-5 text-green-500" />}
                    </div>
                  </div>
                );
              })}
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
                  <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>Privacy</h4>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-3`}>Control who can see your profile</p>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-blue-600 rounded cursor-pointer" 
                      checked={isPublic}
                      onChange={(e) => onPrivacyChange?.(e.target.checked)}
                    />
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Make profile public
                    </span>
                  </label>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} mt-2`}>
                    {isPublic ? 'Your profile is visible to everyone' : 'Your profile is private and only visible to you'}
                  </p>
                </div>

                <div className={`${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'} border rounded-lg p-4`}>
                  <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>Custom Skills</h4>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-3`}>Add languages, frameworks, and technologies you know</p>
                  
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && newSkill.trim()) {
                          setAddingSkill(true);
                          onAddSkill?.(newSkill.trim());
                          setNewSkill('');
                          setTimeout(() => setAddingSkill(false), 500);
                        }
                      }}
                      placeholder="e.g., React, Python, Docker..."
                      maxLength={50}
                      className={`flex-1 px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                    <button
                      onClick={() => {
                        if (newSkill.trim()) {
                          setAddingSkill(true);
                          onAddSkill?.(newSkill.trim());
                          setNewSkill('');
                          setTimeout(() => setAddingSkill(false), 500);
                        }
                      }}
                      disabled={!newSkill.trim() || addingSkill}
                      className={`px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2`}
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {customSkills.length === 0 ? (
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} italic`}>
                        No custom skills added yet. Add your first skill above!
                      </p>
                    ) : (
                      customSkills.map((skill, index) => (
                        <div
                          key={index}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${theme === 'dark' ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200'} border`}
                        >
                          <span className={`text-sm ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
                            {skill}
                          </span>
                          <button
                            onClick={() => onRemoveSkill?.(skill)}
                            className={`${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} transition-colors`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} mt-2`}>
                    {customSkills.length}/20 skills added
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

