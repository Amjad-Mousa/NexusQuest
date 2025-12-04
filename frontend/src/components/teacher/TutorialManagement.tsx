import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Eye,
  EyeOff,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../ui/button';
import { useTheme } from '../../context/ThemeContext';
import {
  getTeacherTutorials,
  toggleTutorialVisibility,
  Tutorial,
} from '../../services/tutorialService';

export default function TutorialManagement() {
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTutorials();
  }, []);

  const loadTutorials = async () => {
    try {
      setLoading(true);
      const data = await getTeacherTutorials();
      setTutorials(data);
    } catch (error) {
      console.error('Error loading tutorials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (tutorial: Tutorial) => {
    navigate(`/tutorials/${tutorial.id}`);
  };

  const handleToggleVisibility = async (tutorial: Tutorial) => {
    try {
      console.log('Toggling visibility for:', tutorial.id, 'Current:', tutorial.isPublished);
      const updated = await toggleTutorialVisibility(tutorial.id);
      console.log('After toggle:', updated.isPublished);
      await loadTutorials();
    } catch (error) {
      console.error('Error toggling visibility:', error);
    }
  };





  const groupedTutorials = tutorials.reduce((acc, tutorial) => {
    if (!acc[tutorial.language]) {
      acc[tutorial.language] = [];
    }
    acc[tutorial.language].push(tutorial);
    return acc;
  }, {} as Record<string, Tutorial[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-blue-500" />
          <h2 className="text-2xl font-bold">Tutorial Management</h2>
        </div>
        <p className="text-sm text-gray-400">
          Edit and manage pre-built tutorials
        </p>
      </div>



      {/* Tutorials List */}
      {tutorials.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-400">Loading tutorials...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTutorials).map(([language, langTutorials]) => (
            <div key={language}>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="text-blue-500">{language}</span>
                <span className="text-sm text-gray-400">({langTutorials.length})</span>
              </h3>

              <div className="space-y-3">
                {langTutorials
                  .sort((a, b) => a.order - b.order)
                  .map((tutorial) => (
                    <div
                      key={tutorial.id}
                      className={`p-4 rounded-xl border ${
                        theme === 'dark'
                          ? 'bg-gray-900 border-gray-800'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-lg">{tutorial.title}</h4>
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                tutorial.isPublished
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-gray-500/20 text-gray-400'
                              }`}
                            >
                              {tutorial.isPublished ? 'Visible' : 'Hidden'}
                            </span>
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                tutorial.difficulty === 'beginner'
                                  ? 'bg-green-500/20 text-green-400'
                                  : tutorial.difficulty === 'intermediate'
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}
                            >
                              {tutorial.difficulty}
                            </span>
                            {tutorial.isCustom && (
                              <span className="px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-400">
                                Customized
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-400 mb-2">{tutorial.description}</p>
                          <div className="text-xs text-gray-500">
                            Order: {tutorial.order}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleVisibility(tutorial)}
                            title={tutorial.isPublished ? 'Hide from students' : 'Show to students'}
                          >
                            {tutorial.isPublished ? (
                              <Eye className="w-4 h-4 text-green-500" />
                            ) : (
                              <EyeOff className="w-4 h-4 text-gray-500" />
                            )}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleView(tutorial)}
                            title="View tutorial"
                          >
                            <ExternalLink className="w-4 h-4 text-blue-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
