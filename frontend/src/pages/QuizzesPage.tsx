import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Calendar, ArrowLeft, Trophy, CheckCircle2, Play } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useTheme } from '../context/ThemeContext';
import { Quiz, getQuizzes } from '../services/quizService';

export default function QuizzesPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      const data = await getQuizzes();
      setQuizzes(data);
    } catch (error) {
      console.error('Failed to load quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'ended': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500/20 text-green-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400';
      case 'hard': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSubmissionStatus = (quiz: Quiz) => {
    if (!quiz.submission) return null;
    return quiz.submission.status;
  };

  // Separate quizzes into active/upcoming and completed
  const activeQuizzes = quizzes.filter(q => q.status === 'active' || q.status === 'scheduled');
  const completedQuizzes = quizzes.filter(q => q.status === 'ended' || q.submission?.status === 'passed');

  // Sort active: active first, then scheduled
  const sortedActiveQuizzes = [...activeQuizzes].sort((a, b) => {
    const order = { active: 0, scheduled: 1, ended: 2 };
    return (order[a.status] || 3) - (order[b.status] || 3);
  });

  // Sort completed by end time (most recent first)
  const sortedCompletedQuizzes = [...completedQuizzes].sort((a, b) => {
    return new Date(b.endTime).getTime() - new Date(a.endTime).getTime();
  });

  const renderQuizCard = (quiz: Quiz) => {
    const submissionStatus = getSubmissionStatus(quiz);
    const isCompleted = quiz.status === 'ended' || submissionStatus === 'passed';
    const hasGrade = quiz.submission?.teacherGrade !== undefined;

    return (
      <div
        key={quiz._id}
        onClick={() => navigate(`/quiz/${quiz._id}`)}
        className={`rounded-xl p-5 cursor-pointer transition-all border ${
          theme === 'dark'
            ? 'bg-gray-900 border-gray-800 hover:border-purple-500/50'
            : 'bg-white border-gray-200 hover:border-purple-300'
        }`}
      >
        {/* Status Badge */}
        <div className="flex justify-between items-start mb-3">
          <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(quiz.status)}`}>
            {quiz.status === 'active' ? '🔴 Live Now' : quiz.status}
          </span>
          {submissionStatus && (
            <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
              submissionStatus === 'passed'
                ? 'bg-green-500/20 text-green-400'
                : submissionStatus === 'submitted'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-gray-500/20 text-gray-400'
            }`}>
              {submissionStatus === 'passed' ? (
                <><CheckCircle2 className="w-3 h-3" /> Passed</>
              ) : submissionStatus === 'submitted' ? (
                hasGrade ? (
                  <><CheckCircle2 className="w-3 h-3" /> Graded</>
                ) : (
                  <><Clock className="w-3 h-3" /> Pending</>
                )
              ) : (
                <><Clock className="w-3 h-3" /> In Progress</>
              )}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-lg mb-2">{quiz.title}</h3>

        {/* Description */}
        <p className={`text-sm mb-4 line-clamp-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          {quiz.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(quiz.difficulty)}`}>
            {quiz.difficulty}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
            {quiz.language}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full ${theme === 'dark' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-600'}`}>
            {quiz.points} pts
          </span>
        </div>

        {/* Time Info */}
        <div className={`pt-3 border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDateTime(quiz.startTime)}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {quiz.duration} min
            </div>
          </div>
        </div>

        {/* Grade display for completed quizzes */}
        {isCompleted && quiz.submission && (
          <div className="mt-3 space-y-2">
            {hasGrade ? (
              <>
                <div className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                  theme === 'dark' ? 'bg-green-900/30' : 'bg-green-100'
                }`}>
                  <span className="text-sm font-medium text-green-400">
                    Grade: {quiz.submission.teacherGrade}%
                  </span>
                  <span className="text-sm text-green-400">
                    +{quiz.submission.pointsAwarded} pts
                  </span>
                </div>
                {quiz.submission.teacherFeedback && (
                  <div className={`py-2 px-3 rounded-lg text-sm ${
                    theme === 'dark' ? 'bg-gray-800/50 text-gray-300' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <span className="font-medium">Feedback: </span>
                    {quiz.submission.teacherFeedback}
                  </div>
                )}
              </>
            ) : quiz.submission.status === 'passed' ? (
              <div className={`flex items-center justify-center gap-2 py-2 rounded-lg ${
                theme === 'dark' ? 'bg-green-900/30' : 'bg-green-100'
              }`}>
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-green-400">
                  All tests passed! +{quiz.submission.pointsAwarded} pts
                </span>
              </div>
            ) : (
              <div className={`flex items-center justify-center gap-2 py-2 rounded-lg ${
                theme === 'dark' ? 'bg-yellow-900/30' : 'bg-yellow-100'
              }`}>
                <Clock className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-yellow-600">
                  Awaiting teacher grade ({quiz.submission.score}/{quiz.submission.totalTests} tests)
                </span>
              </div>
            )}
          </div>
        )}

        {/* Action hint for active quizzes */}
        {quiz.status === 'active' && !submissionStatus && (
          <div className="mt-3">
            <div className={`flex items-center justify-center gap-2 py-2 rounded-lg ${
              theme === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'
            }`}>
              <Play className="w-4 h-4" />
              <span className="text-sm font-medium">Start Now</span>
            </div>
          </div>
        )}

        {/* Continue hint for in-progress */}
        {quiz.status === 'active' && submissionStatus === 'started' && (
          <div className="mt-3">
            <div className={`flex items-center justify-center gap-2 py-2 rounded-lg ${
              theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
            }`}>
              <Play className="w-4 h-4" />
              <span className="text-sm font-medium">Continue</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`border-b ${theme === 'dark' ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <div className="flex items-center gap-2">
                <Clock className="w-6 h-6 text-purple-500" />
                <h1 className="text-xl font-bold">Quizzes</h1>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {quizzes.filter(q => q.status === 'active').length} active quizzes
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-8">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading quizzes...</div>
        ) : quizzes.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-500" />
            <h3 className="text-lg font-medium mb-2">No quizzes available</h3>
            <p className="text-gray-500">Check back later for upcoming quizzes</p>
          </div>
        ) : (
          <>
            {/* Active & Upcoming Quizzes */}
            {sortedActiveQuizzes.length > 0 && (
              <div>
                <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  <Play className="w-5 h-5 text-green-500" />
                  Active & Upcoming Quizzes
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {sortedActiveQuizzes.map(renderQuizCard)}
                </div>
              </div>
            )}

            {/* Completed Quizzes */}
            {sortedCompletedQuizzes.length > 0 && (
              <div>
                <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  <CheckCircle2 className="w-5 h-5 text-gray-500" />
                  Completed Quizzes
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {sortedCompletedQuizzes.map(renderQuizCard)}
                </div>
              </div>
            )}

            {/* Empty state if no quizzes in either section */}
            {sortedActiveQuizzes.length === 0 && sortedCompletedQuizzes.length === 0 && (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                <h3 className="text-lg font-medium mb-2">No quizzes available</h3>
                <p className="text-gray-500">Check back later for upcoming quizzes</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
