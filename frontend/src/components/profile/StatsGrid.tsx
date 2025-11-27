import { LucideIcon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface Stat {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
}

interface StatsGridProps {
  stats: Stat[];
}

export function getStatColor(color: string): string {
  const colors: Record<string, string> = {
    yellow: 'from-yellow-500 to-orange-500',
    green: 'from-green-500 to-emerald-500',
    purple: 'from-purple-500 to-pink-500',
    blue: 'from-blue-500 to-cyan-500',
    red: 'from-red-500 to-rose-500'
  };
  return colors[color] || colors.blue;
}

export function StatsGrid({ stats }: StatsGridProps) {
  const { theme } = useTheme();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => (
        <div key={index} className={`${theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} border rounded-xl p-6 hover:shadow-lg transition-shadow`}>
          <div className="flex items-center justify-between mb-3">
            <div className={`w-12 h-12 bg-gradient-to-br ${getStatColor(stat.color)} rounded-xl flex items-center justify-center`}>
              <stat.icon className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-1`}>
            {stat.value}
          </h3>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}

