import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { getStoredUser } from '../services/authService';
import { getMyQuestions, deleteQuestion, Question } from '../services/forumService';
import { Button } from '../components/ui/button';
import {
  MessageSquare,
  ArrowLeft,
  Eye,
  ThumbsUp,
  CheckCircle,
  Clock,
  Edit,
  Trash2,
  Plus,
} from 'lucide-react';

export default function MyQuestionsPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const storedUser = getStoredUser();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMyQuestions();
  }, []);

  const loadMyQuestions = async () => {
    try {
      setLoading(true);
      const response = await getMyQuestions();
      if (response.success) {
        setQuestions(response.questions);
      }
    } catch (error) {
      console.error('Failed to load questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      const response = await deleteQuestion(id);
      if (response.success) {
        setQuestions(questions.filter((q) => q._id !== id));
      }
    } catch (error) {
      console.error('Failed to delete question:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getLanguageColor = (lang: string) => {
    switch (lang) {
      case 'javascript':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'python':
        return 'bg-blue-500/20 text-blue-400';
      case 'java':
        return 'bg-orange-500/20 text-orange-400';
      case 'cpp':
        return 'bg-purple-500/20 text-purple-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (!storedUser) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          theme === 'dark' ? 'bg-gray-950' : 'bg-gray-50'
        }`}
      >
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Please log in</h2>
          <Button onClick={() => navigate('/login')}>Log In</Button>
        </div>
      </div>
    );
  }

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
              <span className="text-xl font-bold">My Questions</span>
            </div>
          </div>
          <Button
            onClick={() => navigate('/forum/ask')}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ask Question
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500">Loading your questions...</p>
          </div>
        ) : questions.length === 0 ? (
          <div
            className={`text-center py-12 rounded-xl ${
              theme === 'dark' ? 'bg-gray-900/50' : 'bg-white'
            }`}
          >
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-500" />
            <h3 className="text-lg font-semibold mb-2">No questions yet</h3>
            <p className="text-gray-500 mb-4">You haven't asked any questions yet.</p>
            <Button onClick={() => navigate('/forum/ask')}>
              <Plus className="w-4 h-4 mr-2" />
              Ask Your First Question
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((question) => (
              <div
                key={question._id}
                className={`rounded-xl p-5 ${
                  theme === 'dark'
                    ? 'bg-gray-900/50 border border-gray-800'
                    : 'bg-white border border-gray-200 shadow-sm'
                }`}
              >
                <div className="flex gap-4">
                  {/* Stats */}
                  <div className="flex flex-col items-center gap-2 text-center min-w-[60px]">
                    <div
                      className={`flex items-center gap-1 ${
                        question.voteScore > 0
                          ? 'text-green-400'
                          : question.voteScore < 0
                          ? 'text-red-400'
                          : 'text-gray-500'
                      }`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span className="font-semibold">{question.voteScore}</span>
                    </div>
                    <div
                      className={`flex items-center gap-1 ${
                        question.answersCount > 0
                          ? question.isResolved
                            ? 'text-green-400'
                            : 'text-blue-400'
                          : 'text-gray-500'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>{question.answersCount}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-500 text-sm">
                      <Eye className="w-3 h-3" />
                      <span>{question.views}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-2">
                      {question.isResolved && (
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      )}
                      <h3
                        onClick={() => navigate(`/forum/question/${question._id}`)}
                        className={`font-semibold text-lg hover:text-purple-400 transition-colors cursor-pointer line-clamp-2 ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        {question.title}
                      </h3>
                    </div>

                    <p
                      className={`text-sm mb-3 line-clamp-2 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}
                    >
                      {question.content.replace(/```[\s\S]*?```/g, '[code]').slice(0, 200)}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${getLanguageColor(
                          question.programmingLanguage
                        )}`}
                      >
                        {question.programmingLanguage}
                      </span>
                      {question.tags.slice(0, 3).map((tag) => (
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
                      <div className="flex-1" />
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(question.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/forum/edit/${question._id}`)}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(question._id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
