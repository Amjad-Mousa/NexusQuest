import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, CheckCircle2, Clock, Award, MessageSquare, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useTheme } from '../context/ThemeContext';
import { getQuizResults, gradeSubmission, QuizResultsResponse, QuizSubmissionDetail } from '../services/quizService';

export default function QuizResultsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [results, setResults] = useState<QuizResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSubmission, setExpandedSubmission] = useState<string | null>(null);
  const [gradingSubmission, setGradingSubmission] = useState<string | null>(null);
  const [gradeValue, setGradeValue] = useState<number>(100);
  const [feedbackValue, setFeedbackValue] = useState<string>('');
  const [submittingGrade, setSubmittingGrade] = useState(false);

  useEffect(() => {
    loadResults();
  }, [id]);

  const loadResults = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getQuizResults(id);
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const handleGrade = async (submission: QuizSubmissionDetail) => {
    if (!id || submittingGrade) return;

    try {
      setSubmittingGrade(true);
      await gradeSubmission(id, submission._id, gradeValue, feedbackValue);
      
      // Reload results
      await loadResults();
      setGradingSubmission(null);
      setGradeValue(100);
      setFeedbackValue('');
    } catch (err: any) {
      alert(err.message || 'Failed to grade submission');
    } finally {
      setSubmittingGrade(false);
    }
  };

  const openGrading = (submission: QuizSubmissionDetail) => {
    setGradingSubmission(submission._id);
    setGradeValue(submission.teacherGrade ?? Math.round((submission.score / submission.totalTests) * 100));
    setFeedbackValue(submission.teacherFeedback || '');
    setExpandedSubmission(submission._id);
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Results not found'}</p>
          <Button onClick={() => navigate('/teacher')}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const { quiz, submissions } = results;
  const submittedCount = submissions.filter(s => s.status !== 'started').length;
  const gradedCount = submissions.filter(s => s.teacherGrade !== undefined).length;
  const avgScore = submittedCount > 0
    ? Math.round(submissions.filter(s => s.status !== 'started').reduce((sum, s) => sum + (s.score / s.totalTests) * 100, 0) / submittedCount)
    : 0;

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`border-b sticky top-0 z-50 ${theme === 'dark' ? 'border-gray-800 bg-gray-900/95' : 'border-gray-200 bg-white/95'} backdrop-blur-sm`}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/teacher')}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <div>
                <h1 className="font-bold text-lg">{quiz.title} - Results</h1>
                <p className="text-sm text-gray-400">{quiz.language} • {quiz.points} points</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className={`rounded-xl p-4 border ${theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20"><User className="w-5 h-5 text-blue-400" /></div>
              <div>
                <p className="text-sm text-gray-400">Submissions</p>
                <p className="text-2xl font-bold">{submittedCount}</p>
              </div>
            </div>
          </div>
          <div className={`rounded-xl p-4 border ${theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20"><CheckCircle2 className="w-5 h-5 text-green-400" /></div>
              <div>
                <p className="text-sm text-gray-400">Graded</p>
                <p className="text-2xl font-bold">{gradedCount}/{submittedCount}</p>
              </div>
            </div>
          </div>
          <div className={`rounded-xl p-4 border ${theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/20"><Award className="w-5 h-5 text-yellow-400" /></div>
              <div>
                <p className="text-sm text-gray-400">Avg Score</p>
                <p className="text-2xl font-bold">{avgScore}%</p>
              </div>
            </div>
          </div>
          <div className={`rounded-xl p-4 border ${theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20"><Clock className="w-5 h-5 text-purple-400" /></div>
              <div>
                <p className="text-sm text-gray-400">Test Cases</p>
                <p className="text-2xl font-bold">{quiz.totalTests}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Submissions List */}
        <div className={`rounded-xl border ${theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`}>
          <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
            <h2 className="font-semibold">Student Submissions</h2>
          </div>

          {submissions.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No submissions yet
            </div>
          ) : (
            <div className={`divide-y ${theme === 'dark' ? 'divide-gray-800' : 'divide-gray-200'}`}>
              {submissions.map(submission => {
                const isExpanded = expandedSubmission === submission._id;
                const isGrading = gradingSubmission === submission._id;
                const hasSubmitted = submission.status !== 'started';

                return (
                  <div key={submission._id} className="p-4">
                    {/* Submission Header */}
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedSubmission(isExpanded ? null : submission._id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                        }`}>
                          <User className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <h3 className="font-medium">{submission.user.name}</h3>
                          <p className="text-sm text-gray-400">{submission.user.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Status */}
                        {hasSubmitted ? (
                          <div className="flex items-center gap-3">
                            <span className={`text-sm px-2 py-1 rounded ${
                              submission.status === 'passed'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-orange-500/20 text-orange-400'
                            }`}>
                              {submission.score}/{submission.totalTests} tests
                            </span>
                            {submission.teacherGrade !== undefined ? (
                              <span className="text-sm px-2 py-1 rounded bg-blue-500/20 text-blue-400">
                                Grade: {submission.teacherGrade}%
                              </span>
                            ) : (
                              <span className="text-sm px-2 py-1 rounded bg-yellow-500/20 text-yellow-400">
                                Not graded
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm px-2 py-1 rounded bg-gray-500/20 text-gray-400">
                            In Progress
                          </span>
                        )}
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && hasSubmitted && (
                      <div className="mt-4 space-y-4">
                        {/* Code Display */}
                        <div>
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                            Student's Code
                            <span className="text-xs text-gray-400">({quiz.language})</span>
                          </h4>
                          <pre className={`p-4 rounded-lg text-sm font-mono overflow-x-auto max-h-80 ${
                            theme === 'dark' ? 'bg-gray-950 border border-gray-800' : 'bg-gray-100 border border-gray-200'
                          }`}>
                            {submission.code || '(No code submitted)'}
                          </pre>
                        </div>

                        {/* Grading Section */}
                        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                          {isGrading ? (
                            <div className="space-y-4">
                              <div className="flex items-center gap-4">
                                <label className="text-sm font-medium">Grade (0-100):</label>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={gradeValue}
                                  onChange={(e) => setGradeValue(Math.min(100, Math.max(0, Number(e.target.value))))}
                                  className={`w-24 px-3 py-2 rounded-lg border ${
                                    theme === 'dark'
                                      ? 'bg-gray-900 border-gray-700 text-white'
                                      : 'bg-white border-gray-300 text-gray-900'
                                  }`}
                                />
                                <span className="text-sm text-gray-400">
                                  = {Math.round((gradeValue / 100) * quiz.points)} points
                                </span>
                              </div>
                              <div>
                                <label className="text-sm font-medium mb-2 block">Feedback:</label>
                                <textarea
                                  value={feedbackValue}
                                  onChange={(e) => setFeedbackValue(e.target.value)}
                                  placeholder="Optional feedback for the student..."
                                  className={`w-full px-3 py-2 rounded-lg border min-h-[100px] ${
                                    theme === 'dark'
                                      ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500'
                                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                                  }`}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleGrade(submission)}
                                  disabled={submittingGrade}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  {submittingGrade ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                                  ) : (
                                    <><CheckCircle2 className="w-4 h-4 mr-2" /> Save Grade</>
                                  )}
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setGradingSubmission(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div>
                                {submission.teacherGrade !== undefined ? (
                                  <div>
                                    <p className="font-medium">
                                      Grade: {submission.teacherGrade}% ({submission.pointsAwarded} points)
                                    </p>
                                    {submission.teacherFeedback && (
                                      <p className="text-sm text-gray-400 mt-1 flex items-start gap-2">
                                        <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                        {submission.teacherFeedback}
                                      </p>
                                    )}
                                    <p className="text-xs text-gray-500 mt-2">
                                      Graded on {new Date(submission.gradedAt!).toLocaleString()}
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-gray-400">Not graded yet</p>
                                )}
                              </div>
                              <Button onClick={() => openGrading(submission)}>
                                {submission.teacherGrade !== undefined ? 'Edit Grade' : 'Grade'}
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Submission Info */}
                        <div className="text-xs text-gray-500">
                          Submitted: {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : 'N/A'}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
