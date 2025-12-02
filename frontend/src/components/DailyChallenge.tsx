import { useState, useEffect, useCallback } from 'react';
import { Zap, CheckCircle2, Play, Loader2, Trophy, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import { getTodayChallenge, submitDailyChallenge, TodayChallengeResponse, SubmitResult } from '../services/dailyChallengeService';

interface DailyChallengeProps {
  theme: 'dark' | 'light';
  onPointsEarned?: (points: number) => void;
}

export function DailyChallenge({ theme, onPointsEarned }: DailyChallengeProps) {
  const [challengeData, setChallengeData] = useState<TodayChallengeResponse | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadChallenge = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTodayChallenge();
      setChallengeData(data);
      setCode(data.challenge.starterCode);
    } catch (err: any) {
      setError(err.message || 'Failed to load daily challenge');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChallenge();
  }, [loadChallenge]);

  const handleSubmit = async () => {
    if (!code.trim() || submitting) return;

    try {
      setSubmitting(true);
      setResult(null);
      const submitResult = await submitDailyChallenge(code);
      setResult(submitResult);

      if (submitResult.passed) {
        setChallengeData(prev => prev ? { ...prev, completed: true } : null);
        if (onPointsEarned && submitResult.pointsAwarded) {
          onPointsEarned(submitResult.pointsAwarded);
        }
      }
    } catch (err: any) {
      setResult({
        passed: false,
        output: '',
        message: err.message || 'Failed to submit',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={`rounded-xl p-6 border ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-orange-900/20 to-yellow-900/20 border-orange-500/30'
          : 'bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200'
      }`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
          <span className="ml-2 text-gray-400">Loading daily challenge...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-xl p-6 border ${
        theme === 'dark'
          ? 'bg-gray-900/50 border-gray-800'
          : 'bg-white border-gray-200'
      }`}>
        <div className="text-center py-4 text-red-400">{error}</div>
      </div>
    );
  }

  if (!challengeData) return null;

  const { challenge, completed } = challengeData;

  return (
    <div className={`rounded-xl p-6 border ${
      theme === 'dark'
        ? 'bg-gradient-to-br from-orange-900/20 to-yellow-900/20 border-orange-500/30'
        : 'bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            theme === 'dark' ? 'bg-orange-500/20' : 'bg-orange-100'
          }`}>
            <Zap className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h3 className={`font-bold text-lg ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Daily Challenge
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="w-3 h-3" />
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm px-3 py-1 rounded-full font-medium ${
            theme === 'dark'
              ? 'bg-yellow-500/20 text-yellow-400'
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            +{challenge.points} pts
          </span>
          {completed && (
            <span className={`flex items-center gap-1 text-sm px-3 py-1 rounded-full ${
              theme === 'dark'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-green-100 text-green-700'
            }`}>
              <CheckCircle2 className="w-4 h-4" /> Done!
            </span>
          )}
        </div>
      </div>

      {/* Challenge Info */}
      <div className="mb-4">
        <h4 className={`font-semibold mb-1 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          {challenge.title}
        </h4>
        <p className={`text-sm ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          {challenge.description}
        </p>
      </div>

      {completed ? (
        /* Completed State */
        <div className={`rounded-lg p-4 text-center ${
          theme === 'dark' ? 'bg-green-900/20' : 'bg-green-50'
        }`}>
          <Trophy className="w-10 h-10 mx-auto mb-2 text-yellow-400" />
          <p className={`font-medium ${
            theme === 'dark' ? 'text-green-400' : 'text-green-700'
          }`}>
            Challenge Completed! 🎉
          </p>
          <p className={`text-sm mt-1 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Come back tomorrow for a new challenge
          </p>
        </div>
      ) : (
        /* Code Editor */
        <>
          <div className="mb-3">
            <label className={`text-xs font-medium mb-1 block ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Your Solution ({challenge.language})
            </label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={`w-full h-32 p-3 rounded-lg font-mono text-sm resize-none ${
                theme === 'dark'
                  ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              } border outline-none focus:ring-2 focus:ring-orange-500/50`}
              placeholder="Write your code here..."
              disabled={submitting}
            />
          </div>

          {/* Result */}
          {result && (
            <div className={`rounded-lg p-3 mb-3 ${
              result.passed
                ? theme === 'dark' ? 'bg-green-900/20 border border-green-500/30' : 'bg-green-50 border border-green-200'
                : theme === 'dark' ? 'bg-red-900/20 border border-red-500/30' : 'bg-red-50 border border-red-200'
            }`}>
              <p className={`text-sm font-medium ${
                result.passed
                  ? theme === 'dark' ? 'text-green-400' : 'text-green-700'
                  : theme === 'dark' ? 'text-red-400' : 'text-red-700'
              }`}>
                {result.message}
              </p>
              {result.output && (
                <div className="mt-2">
                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Output:</span>
                  <pre className={`text-xs mt-1 p-2 rounded ${
                    theme === 'dark' ? 'bg-gray-900' : 'bg-white'
                  }`}>
                    {result.output}
                  </pre>
                </div>
              )}
              {!result.passed && result.expected && (
                <div className="mt-2">
                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Expected:</span>
                  <pre className={`text-xs mt-1 p-2 rounded ${
                    theme === 'dark' ? 'bg-gray-900' : 'bg-white'
                  }`}>
                    {result.expected}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={submitting || !code.trim()}
            className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Submit Solution
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
}
