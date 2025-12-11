import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { getStoredUser } from '../services/authService';
import { createQuestion } from '../services/forumService';
import { Button } from '../components/ui/button';
import Editor from '@monaco-editor/react';
import {
  MessageSquare,
  ArrowLeft,
  Send,
  Code,
  Tag,
  X,
} from 'lucide-react';

export default function AskQuestionPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const storedUser = getStoredUser();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState('general');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag) && tags.length < 5) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }
    if (!content.trim()) {
      setError('Please enter your question');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const response = await createQuestion({
        title: title.trim(),
        content: content.trim(),
        language,
        tags,
        codeSnippet: codeSnippet || undefined,
      });

      if (response.success) {
        navigate(`/forum/question/${response.question._id}`);
      } else {
        setError('Failed to post question');
      }
    } catch (err) {
      console.error('Failed to create question:', err);
      setError('Failed to post question. Please try again.');
    } finally {
      setSubmitting(false);
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
          <h2 className="text-xl font-semibold mb-2">Please log in to ask a question</h2>
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
              <span className="text-xl font-bold">Ask a Question</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div
          className={`rounded-xl p-6 ${
            theme === 'dark'
              ? 'bg-gray-900/50 border border-gray-800'
              : 'bg-white border border-gray-200 shadow-sm'
          }`}
        >
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Title */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's your question? Be specific."
              className={`w-full px-4 py-3 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
              } outline-none focus:ring-2 focus:ring-purple-500/50`}
            />
          </div>

          {/* Content */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Details</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe your problem in detail. What have you tried? What error are you getting?"
              rows={8}
              className={`w-full px-4 py-3 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
              } outline-none focus:ring-2 focus:ring-purple-500/50`}
            />
          </div>

          {/* Language */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Programming Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-gray-50 border-gray-300 text-gray-900'
              } outline-none focus:ring-2 focus:ring-purple-500/50`}
            >
              <option value="general">General</option>
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
            </select>
          </div>

          {/* Code Snippet */}
          <div className="mb-6">
            <button
              onClick={() => setShowCodeEditor(!showCodeEditor)}
              className={`flex items-center gap-2 text-sm ${
                theme === 'dark'
                  ? 'text-gray-400 hover:text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Code className="w-4 h-4" />
              {showCodeEditor ? 'Hide Code Editor' : 'Add Code Snippet (optional)'}
            </button>

            {showCodeEditor && (
              <div className="mt-3 rounded-lg overflow-hidden border border-gray-700">
                <Editor
                  height="250px"
                  language={language === 'general' ? 'javascript' : language}
                  value={codeSnippet}
                  onChange={(value) => setCodeSnippet(value || '')}
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

          {/* Tags */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              <Tag className="w-4 h-4 inline mr-1" />
              Tags (up to 5)
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${
                    theme === 'dark'
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-purple-100 text-purple-600'
                  }`}
                >
                  #{tag}
                  <button onClick={() => handleRemoveTag(tag)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleAddTag}
              placeholder="Add tags (press Enter)"
              disabled={tags.length >= 5}
              className={`w-full px-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
              } outline-none focus:ring-2 focus:ring-purple-500/50 ${
                tags.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Send className="w-4 h-4 mr-2" />
              {submitting ? 'Posting...' : 'Post Question'}
            </Button>
            <Button variant="outline" onClick={() => navigate('/forum')}>
              Cancel
            </Button>
          </div>
        </div>

        {/* Tips */}
        <div
          className={`mt-6 rounded-xl p-4 ${
            theme === 'dark'
              ? 'bg-blue-900/20 border border-blue-500/30'
              : 'bg-blue-50 border border-blue-200'
          }`}
        >
          <h4 className="font-semibold mb-2 text-blue-400">Tips for a good question:</h4>
          <ul className="text-sm space-y-1 text-gray-400">
            <li>• Be specific and clear about your problem</li>
            <li>• Include relevant code snippets</li>
            <li>• Describe what you've already tried</li>
            <li>• Include any error messages you're seeing</li>
            <li>• Use appropriate tags to help others find your question</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
