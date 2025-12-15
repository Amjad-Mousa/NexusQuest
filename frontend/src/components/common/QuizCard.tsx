import { Clock, Calendar, CheckCircle2, Play, Trophy } from 'lucide-react';
import { DifficultyBadge } from './DifficultyBadge';
import { getQuizStatusColor } from '../../utils/styleHelpers';
import { formatDateTime } from '../../utils/dateHelpers';
import type { Quiz } from '../../services/quizService';

interface QuizCardProps {
  quiz: Quiz;
  onClick: () => void;
  theme: 'dark' | 'light';
}

export function QuizCard({ quiz, onClick, theme }: QuizCardProps) {
  const submissionStatus = quiz.submission?.status;
  const isCompleted = quiz.status === 'ended' || submissionStatus === 'passed';
  const hasGrade = quiz.submission?.teacherGrade !== undefined;

  return (
    <div
      onClick={onClick}
      className={`group rounded-2xl p-5 cursor-pointer transition-all duration-300 border ${
        theme === 'dark'
          ? 'bg-gray-900/50 border-gray-800 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/5'
          : 'bg-white border-gray-200 hover:border-purple-300 shadow-sm hover:shadow-md'
      } hover:-translate-y-1`}
    >
      {/* Status Badge */}
      <div className="flex justify-between items-start mb-3">
        <span className={`text-xs px-2 py-1 rounded-full border ${getQuizStatusColor(quiz.status)}`}>
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
        <DifficultyBadge difficulty={quiz.difficulty} />
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
}
