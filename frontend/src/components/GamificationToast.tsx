import { useEffect, useState } from 'react';
import { Trophy, Star, X } from 'lucide-react';

interface GamificationToastProps {
  type: 'levelup' | 'achievement';
  message: string;
  details?: string;
  icon?: string;
  onClose: () => void;
}

export function GamificationToast({ type, message, details, icon, onClose }: GamificationToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Slide in animation
    setTimeout(() => setIsVisible(true), 10);

    // Auto close after 5 seconds
    const timer = setTimeout(() => {
      handleClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const getGradient = () => {
    if (type === 'levelup') {
      return 'from-purple-500 via-pink-500 to-purple-600';
    }
    return 'from-yellow-500 via-amber-500 to-yellow-600';
  };

  const getIcon = () => {
    if (type === 'levelup') {
      return <Star className="w-8 h-8 text-white" />;
    }
    return <Trophy className="w-8 h-8 text-white" />;
  };

  return (
    <div
      className={`fixed top-20 right-4 z-[9999] transform transition-all duration-300 ${
        isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className={`bg-gradient-to-r ${getGradient()} rounded-2xl shadow-2xl p-6 min-w-[320px] max-w-md border-2 border-white/20`}>
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center animate-pulse">
              {icon ? (
                <span className="text-3xl">{icon}</span>
              ) : (
                getIcon()
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-white font-bold text-lg mb-1">
                  {type === 'levelup' ? '🎉 Level Up!' : '🏆 Achievement Unlocked!'}
                </h3>
                <p className="text-white/90 font-semibold text-base mb-1">
                  {message}
                </p>
                {details && (
                  <p className="text-white/70 text-sm">
                    {details}
                  </p>
                )}
              </div>
              <button
                onClick={handleClose}
                className="flex-shrink-0 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Progress bar animation */}
        <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/60 rounded-full animate-progress"
            style={{
              animation: 'progress 5s linear forwards'
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}

// Toast Container Component
interface ToastData {
  id: number;
  type: 'levelup' | 'achievement';
  message: string;
  details?: string;
  icon?: string;
}

export function GamificationToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    // Listen for gamification events
    const handleLevelUp = (event: CustomEvent) => {
      const { level } = event.detail;
      addToast({
        type: 'levelup',
        message: `You reached Level ${level}!`,
        details: 'Keep up the great work!',
      });
    };

    const handleAchievement = (event: CustomEvent) => {
      const { title, description, icon } = event.detail;
      addToast({
        type: 'achievement',
        message: title,
        details: description,
        icon: icon,
      });
    };

    window.addEventListener('gamification:levelup' as any, handleLevelUp);
    window.addEventListener('gamification:achievement' as any, handleAchievement);

    return () => {
      window.removeEventListener('gamification:levelup' as any, handleLevelUp);
      window.removeEventListener('gamification:achievement' as any, handleAchievement);
    };
  }, []);

  const addToast = (toast: Omit<ToastData, 'id'>) => {
    const id = Date.now();
    setToasts(prev => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="fixed top-0 right-0 z-[9999] pointer-events-none">
      <div className="flex flex-col gap-3 p-4 pointer-events-auto">
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            style={{
              marginTop: index * 10,
            }}
          >
            <GamificationToast
              type={toast.type}
              message={toast.message}
              details={toast.details}
              icon={toast.icon}
              onClose={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
