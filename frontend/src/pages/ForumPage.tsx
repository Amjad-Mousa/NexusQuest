import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { getStoredUser } from '../services/authService';
import { getQuestions, getTags, Question } from '../services/forumService';
import { NotificationsBell } from '../components/NotificationsBell';
import { UserSidePanel } from '../components/UserSidePanel';
import { Button } from '../components/ui/button';
import {
  MessageSquare,
  Plus,
  Search,
  Filter,
  Eye,
  ThumbsUp,
  CheckCircle,
  Clock,
  User,
  ArrowLeft,
  Tag,
  MessageCircle,
} from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';

export default function ForumPage() {
  usePageTitle('Forum');
  const navigate = useNavigate();
  const { theme } = useTheme();
  const storedUser = getStoredUser();
  const [showSidebar, setShowSidebar] = useState(false);
  const [avatarImage, setAvatarImage] = useState<string | null>(null);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'unanswered'>('newest');
  const [tags, setTags] = useState<{ _id: string; count: number }[]>([]);
  const [selectedTag, setSelectedTag] = useState('');

  useEffect(() => {
    loadQuestions();
  }, [page, languageFilter, sortBy, selectedTag]);

  useEffect(() => {
    loadTags();
    loadUserAvatar();
  }, []);

  const loadUserAvatar = async () => {
    try {
      const token = localStorage.getItem('nexusquest-token');
      const response = await fetch('http://localhost:9876/api/auth/me', {
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

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const response = await getQuestions({
        page,
        limit: 10,
        language: languageFilter !== 'all' ? languageFilter : undefined,
        sort: sortBy,
        tag: selectedTag || undefined,
        search: searchQuery || undefined,
      });
      if (response.success) {
        setQuestions(response.questions);
        setTotalPages(response.pagination.pages);
      }
    } catch (error) {
      console.error('Failed to load questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      const response = await getTags();
      if (response.success) {
        setTags(response.tags);
      }
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadQuestions();
  };

  const handleLogout = () => {
    localStorage.removeItem('nexusquest-token');
    localStorage.removeItem('nexusquest-user');
    navigate('/login');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
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

  return (
    <div
      className={`min-h-screen relative ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white'
          : 'bg-gradient-to-br from-gray-100 via-white to-gray-100 text-gray-900'
      }`}
    >
      {/* Subtle Background Elements */}
      {theme === 'dark' && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl" />
        </div>
      )}
      {/* Header */}
      <header
        className={`border-b sticky top-0 z-50 ${
          theme === 'dark'
            ? 'border-gray-800/50 bg-gray-950/80'
            : 'border-gray-200 bg-white/80'
        } backdrop-blur-xl shadow-sm`}
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className={`flex items-center gap-2 ${
                theme === 'dark'
                  ? 'text-gray-400 hover:text-white'
                  : 'text-gray-600 hover:text-gray-900'
              } transition-colors`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gradient-to-br from-purple-500 via-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-500 bg-clip-text text-transparent">
                Q&A Forum
              </span>
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

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Main Content */}
          <div className="flex-1">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2">Community Forum</h1>
                <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                  Ask questions, share knowledge, help others
                </p>
              </div>
              <Button
                onClick={() => navigate('/forum/ask')}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300 hover:scale-105"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ask Question
              </Button>
            </div>

            {/* Search and Filters */}
            <div
              className={`rounded-2xl p-5 mb-6 transition-all duration-300 ${
                theme === 'dark'
                  ? 'bg-gray-900/50 border border-gray-800 hover:border-gray-700'
                  : 'bg-white border border-gray-200 shadow-sm hover:shadow-md'
              }`}
            >
              <form onSubmit={handleSearch} className="flex gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search questions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                        : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                    } outline-none focus:ring-2 focus:ring-purple-500/50`}
                  />
                </div>
                <Button type="submit" variant="outline">
                  Search
                </Button>
              </form>

              <div className="flex flex-wrap gap-3 items-center">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={languageFilter}
                  onChange={(e) => {
                    setLanguageFilter(e.target.value);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg border text-sm ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="all">All Languages</option>
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="general">General</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as any);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg border text-sm ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="newest">Newest</option>
                  <option value="popular">Most Viewed</option>
                  <option value="unanswered">Unanswered</option>
                </select>

                {selectedTag && (
                  <button
                    onClick={() => {
                      setSelectedTag('');
                      setPage(1);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 text-sm"
                  >
                    <Tag className="w-3 h-3" />
                    {selectedTag}
                    <span className="ml-1">×</span>
                  </button>
                )}
              </div>
            </div>

            {/* Questions List */}
            {loading ? (
              <div className="text-center py-16">
                <div className="animate-spin w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-500">Loading questions...</p>
              </div>
            ) : questions.length === 0 ? (
              <div
                className={`text-center py-16 rounded-2xl border ${
                  theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No questions yet</h3>
                <p className="text-gray-500 mb-6">Be the first to ask a question!</p>
                <Button 
                  onClick={() => navigate('/forum/ask')}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-500/25"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ask Question
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((question) => (
                  <div
                    key={question._id}
                    onClick={() => navigate(`/forum/question/${question._id}`)}
                    className={`group rounded-2xl p-5 cursor-pointer transition-all duration-300 ${
                      theme === 'dark'
                        ? 'bg-gray-900/50 border border-gray-800 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/5'
                        : 'bg-white border border-gray-200 hover:border-purple-300 shadow-sm hover:shadow-md'
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
                            className={`font-semibold text-lg hover:text-purple-400 transition-colors line-clamp-2 ${
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
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTag(tag);
                                setPage(1);
                              }}
                              className={`px-2 py-0.5 rounded text-xs cursor-pointer ${
                                theme === 'dark'
                                  ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              #{tag}
                            </span>
                          ))}
                          <div className="flex-1" />
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>{question.author.name}</span>
                            <Clock className="w-3 h-3" />
                            <span>{formatDate(question.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block w-72">
            {/* Popular Tags */}
            <div
              className={`rounded-2xl p-5 mb-6 transition-all duration-300 ${
                theme === 'dark'
                  ? 'bg-gray-900/50 border border-gray-800 hover:border-gray-700'
                  : 'bg-white border border-gray-200 shadow-sm hover:shadow-md'
              }`}
            >
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Popular Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {tags.slice(0, 10).map((tag) => (
                  <button
                    key={tag._id}
                    onClick={() => {
                      setSelectedTag(tag._id);
                      setPage(1);
                    }}
                    className={`px-2 py-1 rounded text-sm ${
                      selectedTag === tag._id
                        ? 'bg-purple-500/20 text-purple-400'
                        : theme === 'dark'
                        ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    #{tag._id}
                    <span className="ml-1 text-xs opacity-60">({tag.count})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div
              className={`rounded-2xl p-5 transition-all duration-300 ${
                theme === 'dark'
                  ? 'bg-gray-900/50 border border-gray-800 hover:border-gray-700'
                  : 'bg-white border border-gray-200 shadow-sm hover:shadow-md'
              }`}
            >
              <h3 className="font-semibold mb-3">Quick Links</h3>
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/forum/my-questions')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                    theme === 'dark'
                      ? 'hover:bg-gray-800 text-gray-300'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  📝 My Questions
                </button>
                <button
                  onClick={() => {
                    setSortBy('unanswered');
                    setPage(1);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                    theme === 'dark'
                      ? 'hover:bg-gray-800 text-gray-300'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  ❓ Unanswered
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
