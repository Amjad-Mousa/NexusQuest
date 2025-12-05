import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchUserProfile, type UserProfile } from '../services/userService';
import { getStoredUser } from '../services/authService';

export function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = getStoredUser();
    if (!currentUser) {
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
        }
      } catch (e) {
        console.error('Failed to load user profile', e);
        setError('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <p className="text-sm text-gray-400">Loading profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white px-4">
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

  const initials = profile.name ? profile.name.charAt(0).toUpperCase() : '?';

  return (
    <div className="min-h-screen flex flex-col bg-gray-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 px-6 py-4 border-b border-gray-800/50 flex items-center justify-between bg-gray-900/95 backdrop-blur-xl shadow-lg">
        <button
          type="button"
          className="text-sm text-gray-400 hover:text-white transition-colors font-medium"
          onClick={() => navigate(-1)}
        >
          2 Back
        </button>
        <h1 className="text-base font-semibold truncate max-w-xs sm:max-w-md">{profile.name}</h1>
        <div className="w-16" />
      </header>

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 w-full max-w-4xl mx-auto space-y-8">
        <section className="rounded-2xl border border-gray-800/60 bg-gradient-to-br from-gray-900/90 to-gray-900/60 p-6 shadow-xl">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-600/30 flex items-center justify-center text-emerald-300 text-2xl font-semibold border border-emerald-500/40 overflow-hidden">
              {profile.avatarImage ? (
                <img
                  src={profile.avatarImage}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold truncate">{profile.name}</h2>
              <p className="text-sm text-gray-400 truncate">{profile.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span className="px-2 py-0.5 rounded-full bg-gray-800/80 border border-gray-700">
                  Role: {profile.role}
                </span>
                {typeof profile.totalPoints === 'number' && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/40">
                    {profile.totalPoints} pts
                  </span>
                )}
                {profile.createdAt && (
                  <span className="px-2 py-0.5 rounded-full bg-gray-800/80 border border-gray-700">
                    Joined {new Date(profile.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default UserProfilePage;
