import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Code, Filter, Loader2, Search } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useTheme } from '../context/ThemeContext';
import { getTutorials, getAvailableLanguages, Tutorial } from '../services/tutorialService';

export default function TutorialsPage() {
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tutorialsData, languagesData] = await Promise.all([
        getTutorials(),
        getAvailableLanguages(),
      ]);
      setTutorials(tutorialsData);
      setLanguages(languagesData);
    } catch (error) {
      console.error('Error loading tutorials:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group tutorials by language
  const groupedTutorials = tutorials.reduce((acc, tutorial) => {
    if (!acc[tutorial.language]) {
      acc[tutorial.language] = [];
    }
    acc[tutorial.language].push(tutorial);
    return acc;
  }, {} as Record<string, Tutorial[]>);

  // Filter tutorials
  const filteredLanguages = Object.keys(groupedTutorials).filter((lang) => {
    if (selectedLanguage !== 'all' && lang !== selectedLanguage) return false;
    return true;
  });

  const filterTutorials = (tutorials: Tutorial[]) => {
    return tutorials.filter((tutorial) => {
      if (selectedDifficulty !== 'all' && tutorial.difficulty !== selectedDifficulty) return false;
      if (searchQuery && !tutorial.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
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

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`border-b sticky top-0 z-50 ${theme === 'dark' ? 'border-gray-800 bg-gray-900/95' : 'border-gray-200 bg-white/95'} backdrop-blur-sm`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-blue-500" />
              <h1 className="text-2xl font-bold">Tutorials</h1>
            </div>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className={`rounded-xl p-6 mb-8 ${theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tutorials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            {/* Language Filter */}
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className={`px-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All Languages</option>
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>

            {/* Difficulty Filter */}
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className={`px-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All Difficulties</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        {/* Tutorials by Language */}
        {filteredLanguages.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-400 text-lg">No tutorials found</p>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredLanguages.map((language) => {
              const langTutorials = filterTutorials(groupedTutorials[language]);
              
              if (langTutorials.length === 0) return null;

              return (
                <div key={language}>
                  <div className="flex items-center gap-3 mb-4">
                    <Code className="w-6 h-6 text-blue-500" />
                    <h2 className="text-2xl font-bold">{language}</h2>
                    <span className="text-sm text-gray-400">
                      ({langTutorials.length} tutorial{langTutorials.length !== 1 ? 's' : ''})
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {langTutorials.map((tutorial) => (
                      <div
                        key={tutorial.id}
                        onClick={() => navigate(`/tutorials/${tutorial.id}`)}
                        className={`p-6 rounded-xl cursor-pointer transition-all hover:scale-105 ${
                          theme === 'dark'
                            ? 'bg-gray-900 border border-gray-800 hover:border-blue-500'
                            : 'bg-white border border-gray-200 hover:border-blue-500 hover:shadow-lg'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-semibold text-lg">{tutorial.title}</h3>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(tutorial.difficulty)}`}>
                            {tutorial.difficulty}
                          </span>
                        </div>

                        <p className="text-sm text-gray-400 line-clamp-2">
                          {tutorial.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
