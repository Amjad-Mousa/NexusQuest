import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { getStoredUser } from '../services/authService';
import { getApiUrl } from '../utils/apiHelpers';
import {
  getQuestion,
  createAnswer,
  voteQuestion,
  voteAnswer,
  acceptAnswer,
  deleteQuestion,
  deleteAnswer,
  Question,
  Answer,
} from '../services/forumService';
import { NotificationsBell } from '../components/NotificationsBell';
import { UserSidePanel } from '../components/UserSidePanel';
import { Button } from '../components/ui/button';
import Editor from '@monaco-editor/react';
import {
  MessageSquare,
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  CheckCircle,
  Clock,
  User,
  Edit,
  Trash2,
  Send,
  Code,
} from 'lucide-react';

export default function QuestionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const storedUser = getStoredUser();
  const [showSidebar, setShowSidebar] = useState(false);
  const [avatarImage, setAvatarImage] = useState<string | null>(null);

  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [answerContent, setAnswerContent] = useState('');
  const [answerCode, setAnswerCode] = useState('');
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      loadQuestion();
    }
    loadUserAvatar();
  }, [id]);

  const loadUserAvatar = async () => {
    try {
      const token = localStorage.getItem('nexusquest-token');
      const response = await fetch(`${getApiUrl()}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success && data.user) {
        setAvatarImage(data.user.avatarImage || null);
      }
    } catch (error) {
      console.error('Failed to load user avatar:', error);
    }
  };

  const loadQuestion = async () => {
    try {
      setLoading(true);
      const response = await getQuestion(id!);
      if (response.success) {
        setQuestion(response.question);
        setAnswers(response.answers);
      }
    } catch (error) {
      console.error('Failed to load question:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVoteQuestion = async (type: 'up' | 'down') => {
    if (!question) return;
    try {
      const response = await voteQuestion(question._id, type);
      if (response.success) {
        setQuestion({
          ...question,
          voteScore: response.voteScore,
        });
      }
    } catch (error) {
      console.error('Failed to vote:', error);
    }
  };

  const handleVoteAnswer = async (answerId: string, type: 'up' | 'down') => {
    try {
      const response = await voteAnswer(answerId, type);
      if (response.success) {
        setAnswers(
          answers.map((a) =>
            a._id === answerId
              ? {
                  ...a,
                  voteScore: response.voteScore,
                }
              : a
          )
        );
      }
    } catch (error) {
      console.error('Failed to vote:', error);
    }
  };

  const handleAcceptAnswer = async (answerId: string) => {
    try {
      const response = await acceptAnswer(answerId);
      if (response.success) {
        setAnswers(
          answers.map((a) => ({
            ...a,
            isAccepted: a._id === answerId,
          }))
        );
        if (question) {
          setQuestion({ ...question, isResolved: true, acceptedAnswer: answerId });
        }
      }
    } catch (error) {
      console.error('Failed to accept answer:', error);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answerContent.trim()) return;
    try {
      setSubmitting(true);
      const response = await createAnswer(id!, {
        content: answerContent,
        codeSnippet: answerCode || undefined,
      });
      if (response.success) {
        setAnswers([...answers, response.answer]);
        setAnswerContent('');
        setAnswerCode('');
        setShowCodeEditor(false);
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteQuestion = async () => {
    if (!question || !confirm('Are you sure you want to delete this question?')) return;
    try {
      const response = await deleteQuestion(question._id);
      if (response.success) {
        navigate('/forum');
      }
    } catch (error) {
      console.error('Failed to delete question:', error);
    }
  };

  const handleDeleteAnswer = async (answerId: string) => {
    if (!confirm('Are you sure you want to delete this answer?')) return;
    try {
      const response = await deleteAnswer(answerId);
      if (response.success) {
        setAnswers(answers.filter((a) => a._id !== answerId));
      }
    } catch (error) {
      console.error('Failed to delete answer:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('nexusquest-token');
    localStorage.removeItem('nexusquest-user');
    navigate('/login');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const renderContent = (content: string, codeSnippet?: string) => {
    return (
      <div>
        <div className="whitespace-pre-wrap">{content}</div>
        {codeSnippet && (
          <div className="mt-4 rounded-lg overflow-hidden border border-gray-700">
            <div className="bg-gray-800 px-3 py-1 text-xs text-gray-400">Code</div>
            <pre className="p-4 bg-gray-900 overflow-x-auto text-sm">
              <code>{codeSnippet}</code>
            </pre>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          theme === 'dark' ? 'bg-gray-950' : 'bg-gray-50'
        }`}
      >
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!question) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          theme === 'dark' ? 'bg-gray-950' : 'bg-gray-50'
        }`}
      >
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Question not found</h2>
          <Button onClick={() => navigate('/forum')}>Back to Forum</Button>
        </div>
      </div>
    );
  }

  const isAuthor = storedUser?.id === question.author._id;
  const isTeacher = storedUser?.role === 'teacher';

  return (
    <div
      className={`min-h-screen ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white'
          : 'bg-gradient-to-br from-gray-100 via-white to-gray-100 text-gray-900'
      }`}
    >
      {/* Header */}
      <header
        className={`border-b sticky top-0 z-50 ${
          theme === 'dark'
            ? 'border-gray-800 bg-gray-950/80'
            : 'border-gray-200 bg-white/80'
        } backdrop-blur-md`}
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/forum')}
              className={`flex items-center gap-2 ${
                theme === 'dark'
                  ? 'text-gray-400 hover:text-white'
                  : 'text-gray-600 hover:text-gray-900'
              } transition-colors`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold">Question</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <NotificationsBell theme={theme} />
            <Button
              onClick={() => setShowSidebar(true)}
              variant="outline"
              className={`flex items-center gap-2 ${
                theme === 'dark'
                  ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {avatarImage ? (
                <img
                  src={avatarImage}
                  alt="Avatar"
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <User className="w-4 h-4" />
              )}
              {storedUser?.name || 'Profile'}
            </Button>
          </div>
        </div>
      </header>

      {/* User Sidebar */}
      <UserSidePanel
        user={storedUser}
        onLogout={handleLogout}
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
      />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Question */}
        <div
          className={`rounded-xl p-6 mb-6 ${
            theme === 'dark'
              ? 'bg-gray-900/50 border border-gray-800'
              : 'bg-white border border-gray-200 shadow-sm'
          }`}
        >
          <div className="flex gap-4">
            {/* Voting */}
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => handleVoteQuestion('up')}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                }`}
              >
                <ThumbsUp className="w-5 h-5" />
              </button>
              <span
                className={`font-bold text-lg ${
                  question.voteScore > 0
                    ? 'text-green-400'
                    : question.voteScore < 0
                    ? 'text-red-400'
                    : ''
                }`}
              >
                {question.voteScore}
              </span>
              <button
                onClick={() => handleVoteQuestion('down')}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                }`}
              >
                <ThumbsDown className="w-5 h-5" />
              </button>
              {question.isResolved && (
                <CheckCircle className="w-6 h-6 text-green-400 mt-2" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-4">{question.title}</h1>

              <div className="mb-4">{renderContent(question.content, question.codeSnippet)}</div>

              <div className="flex flex-wrap gap-2 mb-4">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400`}
                >
                  {question.programmingLanguage}
                </span>
                {question.tags.map((tag) => (
                  <span
                    key={tag}
                    className={`px-2 py-0.5 rounded text-xs ${
                      theme === 'dark'
                        ? 'bg-gray-800 text-gray-400'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <User className="w-4 h-4" />
                  <span className="font-medium">{question.author.name}</span>
                  {question.author.role === 'teacher' && (
                    <span className="px-1.5 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400">
                      Teacher
                    </span>
                  )}
                  <Clock className="w-4 h-4 ml-2" />
                  <span>{formatDate(question.createdAt)}</span>
                </div>

                {(isAuthor || isTeacher) && (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/forum/edit/${question._id}`)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleDeleteQuestion}>
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Answers */}
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-4">
            {answers.length} {answers.length === 1 ? 'Answer' : 'Answers'}
          </h2>

          {answers.map((answer) => (
            <div
              key={answer._id}
              className={`rounded-xl p-6 mb-4 ${
                answer.isAccepted
                  ? theme === 'dark'
                    ? 'bg-green-900/20 border-2 border-green-500/30'
                    : 'bg-green-50 border-2 border-green-300'
                  : theme === 'dark'
                  ? 'bg-gray-900/50 border border-gray-800'
                  : 'bg-white border border-gray-200 shadow-sm'
              }`}
            >
              <div className="flex gap-4">
                {/* Voting */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => handleVoteAnswer(answer._id, 'up')}
                    className={`p-2 rounded-lg transition-colors ${
                      theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                    }`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </button>
                  <span
                    className={`font-bold ${
                      answer.voteScore > 0
                        ? 'text-green-400'
                        : answer.voteScore < 0
                        ? 'text-red-400'
                        : ''
                    }`}
                  >
                    {answer.voteScore}
                  </span>
                  <button
                    onClick={() => handleVoteAnswer(answer._id, 'down')}
                    className={`p-2 rounded-lg transition-colors ${
                      theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                    }`}
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </button>
                  {isAuthor && !question.isResolved && (
                    <button
                      onClick={() => handleAcceptAnswer(answer._id)}
                      className="p-2 rounded-lg hover:bg-green-500/20 text-gray-500 hover:text-green-400 transition-colors mt-2"
                      title="Accept this answer"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                  )}
                  {answer.isAccepted && <CheckCircle className="w-5 h-5 text-green-400 mt-2" />}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="mb-4">{renderContent(answer.content, answer.codeSnippet)}</div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <User className="w-4 h-4" />
                      <span className="font-medium">{answer.author.name}</span>
                      {answer.author.role === 'teacher' && (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400">
                          Teacher
                        </span>
                      )}
                      <Clock className="w-4 h-4 ml-2" />
                      <span>{formatDate(answer.createdAt)}</span>
                    </div>

                    {(storedUser?.id === answer.author._id || isTeacher) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAnswer(answer._id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Answer */}
        <div
          className={`rounded-xl p-6 ${
            theme === 'dark'
              ? 'bg-gray-900/50 border border-gray-800'
              : 'bg-white border border-gray-200 shadow-sm'
          }`}
        >
          <h3 className="text-lg font-semibold mb-4">Your Answer</h3>

          <textarea
            value={answerContent}
            onChange={(e) => setAnswerContent(e.target.value)}
            placeholder="Write your answer here..."
            rows={6}
            className={`w-full p-4 rounded-lg border mb-4 ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
            } outline-none focus:ring-2 focus:ring-purple-500/50`}
          />

          <div className="mb-4">
            <button
              onClick={() => setShowCodeEditor(!showCodeEditor)}
              className={`flex items-center gap-2 text-sm ${
                theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Code className="w-4 h-4" />
              {showCodeEditor ? 'Hide Code Editor' : 'Add Code Snippet'}
            </button>

            {showCodeEditor && (
              <div className="mt-3 rounded-lg overflow-hidden border border-gray-700">
                <Editor
                  height="200px"
                  language={question.programmingLanguage === 'general' ? 'javascript' : question.programmingLanguage}
                  value={answerCode}
                  onChange={(value) => setAnswerCode(value || '')}
                  theme={theme === 'dark' ? 'vs-dark' : 'light'}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                  }}
                />
              </div>
            )}
          </div>

          <Button
            onClick={handleSubmitAnswer}
            disabled={!answerContent.trim() || submitting}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <Send className="w-4 h-4 mr-2" />
            {submitting ? 'Posting...' : 'Post Answer'}
          </Button>
        </div>
      </div>
    </div>
  );
}
