import { useState, useEffect } from 'react';
import {
  BookOpen,
  Edit,
  Eye,
  EyeOff,
  Loader2,
  Save,
  X,
  RotateCcw,
} from 'lucide-react';
import { Button } from '../ui/button';
import { useTheme } from '../../context/ThemeContext';
import {
  getTeacherTutorials,
  updateTutorial,
  toggleTutorialVisibility,
  resetTutorial,
  Tutorial,
} from '../../services/tutorialService';

export default function TutorialManagement() {
  const { theme } = useTheme();

  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingTutorial, setEditingTutorial] = useState<Tutorial | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [editedDescription, setEditedDescription] = useState('');

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

  const handleEdit = (tutorial: Tutorial) => {
    setEditingTutorial(tutorial);
    setEditedContent(tutorial.content);
    setEditedDescription(tutorial.description);
    setShowEditForm(true);
  };

  const handleSaveEdit = async () => {
    if (!editingTutorial) return;
    
    try {
      await updateTutorial(editingTutorial.id, {
        content: editedContent,
        description: editedDescription,
      });
      await loadTutorials();
      closeEditForm();
    } catch (error) {
      console.error('Error updating tutorial:', error);
      alert('Failed to update tutorial');
    }
  };

  const handleToggleVisibility = async (tutorial: Tutorial) => {
    try {
      await toggleTutorialVisibility(tutorial.id);
      await loadTutorials();
    } catch (error) {
      console.error('Error toggling visibility:', error);
    }
  };

  const handleReset = async (tutorial: Tutorial) => {
    if (!confirm('Are you sure you want to reset this tutorial to default? All custom changes will be lost.')) {
      return;
    }
    
    try {
      await resetTutorial(tutorial.id);
      await loadTutorials();
    } catch (error) {
      console.error('Error resetting tutorial:', error);
      alert('Failed to reset tutorial');
    }
  };

  const closeEditForm = () => {
    setEditingTutorial(null);
    setEditedContent('');
    setEditedDescription('');
    setShowEditForm(false);
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

      {/* Tutorial Edit Modal */}
      {showEditForm && editingTutorial && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl ${
              theme === 'dark' ? 'bg-gray-900' : 'bg-white'
            }`}
          >
            <div className={`sticky top-0 border-b p-6 ${theme === 'dark' ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">
                  Edit Tutorial: {editingTutorial.title}
                </h3>
                <Button variant="ghost" size="sm" onClick={closeEditForm}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <p className="text-sm text-gray-400 mt-2">
                {editingTutorial.language} • {editingTutorial.difficulty}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  rows={3}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Content (Markdown supported)
                </label>
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  rows={20}
                  className={`w-full px-4 py-2 rounded-lg border font-mono text-sm ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="Write your tutorial content here using Markdown..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={handleSaveEdit} className="bg-green-600 hover:bg-green-700 flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
                <Button variant="outline" onClick={closeEditForm}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                            onClick={() => handleEdit(tutorial)}
                            title="Edit tutorial content"
                          >
                            <Edit className="w-4 h-4 text-blue-500" />
                          </Button>
                          {tutorial.isCustom && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReset(tutorial)}
                              title="Reset to default"
                            >
                              <RotateCcw className="w-4 h-4 text-orange-500" />
                            </Button>
                          )}
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
