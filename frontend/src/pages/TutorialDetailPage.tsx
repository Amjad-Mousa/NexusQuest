import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Code, Loader2, CheckCircle, Play } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useTheme } from '../context/ThemeContext';
import { getTutorial, Tutorial, completeTutorial, startTutorial } from '../services/tutorialService';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { usePageTitle } from '../hooks/usePageTitle';

// Helper function to convert YouTube URL to embed URL
const getYouTubeEmbedUrl = (url: string): string => {
  if (!url) return '';
  
  // Handle different YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
  }
  
  // If already an embed URL or unrecognized format, return as-is
  return url;
};

export default function TutorialDetailPage() {
  usePageTitle('Tutorial');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    loadTutorial();
    // Mark tutorial as started when user opens it
    if (id) {
      startTutorial(id).catch(console.error);
    }
  }, [id]);

  const loadTutorial = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getTutorial(id);
      setTutorial(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load tutorial');
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-500/20 text-green-400';
      case 'intermediate':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'advanced':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !tutorial) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <div className="text-center">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-400 mb-4">{error || 'Tutorial not found'}</p>
          <Button onClick={() => navigate('/tutorials')}>Back to Tutorials</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`border-b sticky top-0 z-50 ${theme === 'dark' ? 'border-gray-800 bg-gray-900/95' : 'border-gray-200 bg-white/95'} backdrop-blur-sm`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigate('/tutorials')}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Tutorials
            </Button>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getDifficultyColor(tutorial.difficulty)}`}>
                {tutorial.difficulty}
              </span>
              <span className={`px-3 py-1 rounded-lg text-sm font-medium ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                {tutorial.language}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Tutorial Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">{tutorial.title}</h1>
          <p className="text-lg text-gray-400 mb-6">{tutorial.description}</p>

          {/* Meta Info */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              <span>{tutorial.language}</span>
            </div>
          </div>
        </div>

        {/* Tutorial Content - Sections */}
        <div className="space-y-8">
          {tutorial.sections.map((section, index) => (
            <div
              key={section.id || index}
              className={`rounded-xl p-8 ${
                theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'
              }`}
            >
              {section.title && (
                <h2 className="text-2xl font-bold mb-4">{section.title}</h2>
              )}

              {/* Video Player */}
              {section.videoUrl && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3 text-red-500">
                    <Play className="w-5 h-5" />
                    <span className="font-medium">Video Tutorial</span>
                  </div>
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
                    <iframe
                      src={getYouTubeEmbedUrl(section.videoUrl)}
                      title={section.title || 'Tutorial Video'}
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              {/* Section Content */}
              <div
                className={`prose max-w-none ${
                  theme === 'dark' ? 'prose-invert prose-pre:bg-gray-950' : 'prose-pre:bg-gray-100'
                }`}
              >
                <ReactMarkdown
                  components={{
                    code({ className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      return match ? (
                        <SyntaxHighlighter
                          style={vscDarkPlus as any}
                          language={match[1]}
                          PreTag="div"
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {section.content}
                </ReactMarkdown>
              </div>

              {/* Code Example */}
              {section.codeExample && (
                <div className="mt-4">
                  <SyntaxHighlighter
                    style={vscDarkPlus as any}
                    language={section.language || tutorial.language}
                    PreTag="div"
                    className="rounded-lg"
                  >
                    {section.codeExample}
                  </SyntaxHighlighter>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Completion Button */}
        <div className="mt-8 flex justify-center gap-4">
          {!completed ? (
            <Button 
              onClick={async () => {
                if (!id) return;
                setCompleting(true);
                try {
                  await completeTutorial(id);
                  setCompleted(true);
                } catch (error) {
                  console.error('Failed to mark tutorial as complete:', error);
                } finally {
                  setCompleting(false);
                }
              }}
              disabled={completing}
              className="bg-green-600 hover:bg-green-700"
            >
              {completing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              {completing ? 'Completing...' : 'Mark as Complete'}
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Tutorial Completed!</span>
            </div>
          )}
          <Button onClick={() => navigate('/tutorials')} variant="outline">
            <BookOpen className="w-4 h-4 mr-2" />
            Back to All Tutorials
          </Button>
        </div>
      </div>
    </div>
  );
}
