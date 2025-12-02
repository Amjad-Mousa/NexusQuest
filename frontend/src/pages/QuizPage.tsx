import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Play, CheckCircle2, XCircle, Loader2, AlertTriangle, Trophy, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useTheme } from '../context/ThemeContext';
import { Quiz, getQuiz, startQuiz, submitQuiz, QuizSubmitResponse } from '../services/quizService';

export default function QuizPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [started, setStarted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizSubmitResponse | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Load quiz data
  const loadQuiz = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getQuiz(id);
      setQuiz(data);
      setCode(data.starterCode || '');

      // Check if already started
      if (data.submission) {
        setStarted(true);
        // Only show final result if passed OR quiz has ended
        const quizEnded = new Date(data.endTime) < new Date();
        if (data.submission.status === 'passed' || quizEnded) {
          setResult({
            total: data.submission.totalTests,
            passed: data.submission.score,
            results: [],
            allPassed: data.submission.status === 'passed',
            pointsAwarded: data.submission.pointsAwarded,
            submission: data.submission,
          });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  // Timer countdown
  useEffect(() => {
    if (!quiz || !started || result) return;

    const endTime = new Date(quiz.endTime).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimeRemaining(remaining);

      if (remaining === 0) {
        // Auto-submit when time runs out
        handleSubmit();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [quiz, started, result]);

  const handleStart = async () => {
    if (!id) return;
    try {
      const { alreadyStarted } = await startQuiz(id);
      setStarted(true);
      if (!alreadyStarted) {
        // Reload to get fresh data
        await loadQuiz();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start quiz');
    }
  };

  const handleSubmit = async () => {
    if (!id || submitting) return;
    try {
      setSubmitting(true);
      const submitResult = await submitQuiz(id, code);
      
      // If all passed or canRetry is false, show final result
      if (submitResult.allPassed || !submitResult.canRetry) {
        setResult(submitResult);
      } else {
        // Show temporary result but allow retry
        setResult(submitResult);
        // Clear result after showing feedback so they can retry
        setTimeout(() => {
          setResult(null);
        }, 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = (): string => {
    if (timeRemaining <= 60) return 'text-red-500 bg-red-500/20';
    if (timeRemaining <= 300) return 'text-yellow-500 bg-yellow-500/20';
    return 'text-green-500 bg-green-500/20';
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <p className="text-red-400 mb-4">{error || 'Quiz not found'}</p>
          <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const isScheduled = quiz.status === 'scheduled';
  const isEnded = quiz.status === 'ended';
  const isActive = quiz.status === 'active';

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`border-b sticky top-0 z-50 ${theme === 'dark' ? 'border-gray-800 bg-gray-900/95' : 'border-gray-200 bg-white/95'} backdrop-blur-sm`}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/quizzes')}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <div>
                <h1 className="font-bold text-lg">{quiz.title}</h1>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    quiz.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                    quiz.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {quiz.difficulty}
                  </span>
                  <span>{quiz.points} pts</span>
                  <span>{quiz.language}</span>
                </div>
              </div>
            </div>

            {/* Timer */}
            {started && !result && isActive && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold ${getTimerColor()}`}>
                <Clock className="w-5 h-5" />
                {formatTime(timeRemaining)}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Quiz Status Messages */}
        {isScheduled && (
          <div className={`rounded-xl p-8 text-center mb-6 ${theme === 'dark' ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
            <Clock className="w-16 h-16 mx-auto mb-4 text-blue-400" />
            <h2 className="text-2xl font-bold mb-2">Quiz Not Started Yet</h2>
            <p className="text-gray-400 mb-4">
              This quiz will start on {new Date(quiz.startTime).toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">
              Duration: {quiz.duration} minutes
            </p>
          </div>
        )}

        {isEnded && !result && (
          <div className={`rounded-xl p-8 text-center mb-6 ${theme === 'dark' ? 'bg-gray-800/50 border border-gray-700' : 'bg-gray-100 border border-gray-200'}`}>
            <XCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-bold mb-2">Quiz Has Ended</h2>
            <p className="text-gray-400">
              This quiz ended on {new Date(quiz.endTime).toLocaleString()}
            </p>
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div className={`rounded-xl p-8 text-center mb-6 ${
            result.allPassed
              ? theme === 'dark' ? 'bg-green-900/20 border border-green-500/30' : 'bg-green-50 border border-green-200'
              : theme === 'dark' ? 'bg-orange-900/20 border border-orange-500/30' : 'bg-orange-50 border border-orange-200'
          }`}>
            {result.allPassed ? (
              <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
            ) : (
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-orange-400" />
            )}
            <h2 className="text-2xl font-bold mb-2">
              {result.allPassed ? 'Perfect Score! 🎉' : result.canRetry ? 'Keep Trying!' : 'Quiz Submitted'}
            </h2>
            <p className="text-lg mb-4">
              You passed {result.passed} out of {result.total} test cases
            </p>
            
            {/* Show retry message if can retry */}
            {result.canRetry && isActive && (
              <div className={`mb-4 p-3 rounded-lg ${theme === 'dark' ? 'bg-blue-900/30 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
                <p className="text-blue-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  You can try again! Fix your code and resubmit.
                </p>
              </div>
            )}

            {/* Show grade status for ended quizzes or when submission has grade */}
            {(isEnded || quiz?.submission?.teacherGrade !== undefined) && (
              <div className={`mb-4 p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-100'}`}>
                {quiz?.submission?.teacherGrade !== undefined ? (
                  <div>
                    <p className="text-xl font-bold text-green-400 mb-2">
                      📊 Teacher Grade: {quiz.submission.teacherGrade}%
                    </p>
                    <p className={`text-lg ${quiz.submission.pointsAwarded > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                      +{quiz.submission.pointsAwarded} points earned
                    </p>
                    {quiz.submission.teacherFeedback && (
                      <div className={`mt-4 p-3 rounded-lg text-left ${theme === 'dark' ? 'bg-gray-900/50' : 'bg-white'}`}>
                        <p className={`text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          💬 Teacher Feedback:
                        </p>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {quiz.submission.teacherFeedback}
                        </p>
                      </div>
                    )}
                  </div>
                ) : isEnded ? (
                  <div>
                    <p className="text-lg text-yellow-400 mb-1">⏳ Pending Teacher Review</p>
                    <p className="text-sm text-gray-400">Your submission is being reviewed by the teacher.</p>
                  </div>
                ) : null}
              </div>
            )}

            {/* Points for active quiz with all passed */}
            {!isEnded && result.allPassed && (
              <p className={`text-xl font-bold ${result.pointsAwarded > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                +{result.pointsAwarded} points earned
              </p>
            )}

            {/* Test Results */}
            {result.results.length > 0 && (
              <div className="mt-6 text-left max-w-2xl mx-auto">
                <h3 className="font-semibold mb-3">Test Results:</h3>
                <div className="space-y-2">
                  {result.results.map((r, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg flex items-center gap-3 ${
                        r.passed
                          ? theme === 'dark' ? 'bg-green-900/30' : 'bg-green-100'
                          : theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'
                      }`}
                    >
                      {r.passed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">Test {i + 1}</span>
                        {r.error && (
                          <p className="text-sm text-red-400 truncate">{r.error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={() => navigate('/quizzes')} className="mt-6">
              Back to Quizzes
            </Button>
          </div>
        )}

        {/* Start Quiz Button */}
        {isActive && !started && !result && (
          <div className={`rounded-xl p-8 text-center mb-6 ${theme === 'dark' ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <Play className="w-16 h-16 mx-auto mb-4 text-blue-400" />
            <h2 className="text-2xl font-bold mb-2">Ready to Start?</h2>
            <p className="text-gray-400 mb-2">{quiz.description}</p>
            <p className="text-sm text-gray-500 mb-6">
              Duration: {quiz.duration} minutes • Ends at {new Date(quiz.endTime).toLocaleTimeString()}
            </p>
            <Button onClick={handleStart} className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3">
              <Play className="w-5 h-5 mr-2" /> Start Quiz
            </Button>
          </div>
        )}

        {/* Code Editor */}
        {started && !result && isActive && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Problem Description */}
            <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'}`}>
              <h2 className="text-xl font-bold mb-4">Problem</h2>
              <div className={`prose max-w-none ${theme === 'dark' ? 'prose-invert' : ''}`}>
                <p className="whitespace-pre-wrap">{quiz.description}</p>
              </div>
            </div>

            {/* Code Editor */}
            <div className={`rounded-xl overflow-hidden ${theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'}`}>
              <div className={`px-4 py-3 border-b ${theme === 'dark' ? 'border-gray-800 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Your Solution ({quiz.language})</span>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || !code.trim()}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Submit
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={`w-full h-[500px] p-4 font-mono text-sm resize-none outline-none ${
                  theme === 'dark'
                    ? 'bg-gray-950 text-white'
                    : 'bg-white text-gray-900'
                }`}
                placeholder="Write your code here..."
                disabled={submitting}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
