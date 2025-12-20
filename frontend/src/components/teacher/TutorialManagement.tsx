import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Loader2,
  ExternalLink,
  Plus,
  Edit,
  Trash2,
  X,
  Search,
  Filter,
  Video,
} from 'lucide-react';
import { Button } from '../ui/button';
import { useTheme } from '../../context/ThemeContext';
import {
  getTeacherTutorials,
  Tutorial,
  TutorialSection,
  saveTutorialCustomization,
  createCustomTutorial,
  deleteCustomTutorial,
} from '../../services/tutorialService';

export default function TutorialManagement() {
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTutorial, setEditingTutorial] = useState<Tutorial | null>(null);
  const [formData, setFormData] = useState<Partial<Tutorial>>({
    title: '',
    description: '',
    language: 'javascript',
    difficulty: 'beginner',
    order: 1,
    sections: [],
  });
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [customOnly, setCustomOnly] = useState(false);

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

  const handleCreate = () => {
    setEditingTutorial(null);
    setFormData({
      title: '',
      description: '',
      language: 'javascript',
      difficulty: 'beginner',
      order: tutorials.length + 1,
      sections: [],
    });
    setShowDialog(true);
  };

  const handleEdit = (tutorial: Tutorial) => {
    setEditingTutorial(tutorial);
    setFormData({
      title: tutorial.title,
      description: tutorial.description,
      language: tutorial.language,
      difficulty: tutorial.difficulty,
      order: tutorial.order,
      sections: tutorial.sections,
    });
    setShowDialog(true);
  };

  const handleDelete = async (tutorial: Tutorial) => {
    if (!tutorial.isCustom) {
      alert('Cannot delete default tutorials');
      return;
    }
    
    if (confirm(`Are you sure you want to delete "${tutorial.title}"?`)) {
      try {
        await deleteCustomTutorial(tutorial.id);
        await loadTutorials();
      } catch (error) {
        console.error('Error deleting tutorial:', error);
        alert('Failed to delete tutorial');
      }
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.description) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      if (editingTutorial) {
        // Update existing tutorial
        await saveTutorialCustomization(editingTutorial.id, formData);
      } else {
        // Create new tutorial
        const id = `custom-${Date.now()}`;
        await createCustomTutorial({
          id,
          title: formData.title!,
          description: formData.description!,
          language: formData.language!,
          difficulty: formData.difficulty!,
          order: formData.order!,
          sections: formData.sections || [],
        });
      }
      
      setShowDialog(false);
      await loadTutorials();
    } catch (error) {
      console.error('Error saving tutorial:', error);
      alert('Failed to save tutorial');
    }
  };

  const addSection = () => {
    const newSection: TutorialSection = {
      id: `section-${Date.now()}`,
      title: '',
      content: '',
      codeExample: '',
      language: formData.language,
    };
    setFormData({
      ...formData,
      sections: [...(formData.sections || []), newSection],
    });
  };

  const updateSection = (index: number, updates: Partial<TutorialSection>) => {
    const sections = [...(formData.sections || [])];
    sections[index] = { ...sections[index], ...updates };
    setFormData({ ...formData, sections });
  };

  const removeSection = (index: number) => {
    const sections = [...(formData.sections || [])];
    sections.splice(index, 1);
    setFormData({ ...formData, sections });
  };

  // Filter tutorials based on search and filters
  const filteredTutorials = tutorials.filter(tutorial => {
    // Text search (title, description, sections content)
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      tutorial.title.toLowerCase().includes(searchLower) ||
      tutorial.description.toLowerCase().includes(searchLower) ||
      tutorial.sections.some(section => 
        section.title.toLowerCase().includes(searchLower) ||
        section.content.toLowerCase().includes(searchLower)
      );
    
    // Language filter
    const matchesLanguage = selectedLanguage === 'all' || tutorial.language === selectedLanguage;
    
    // Difficulty filter
    const matchesDifficulty = selectedDifficulty === 'all' || tutorial.difficulty === selectedDifficulty;
    
    // Custom only filter
    const matchesCustom = !customOnly || tutorial.isCustom;
    
    return matchesSearch && matchesLanguage && matchesDifficulty && matchesCustom;
  });

  const groupedTutorials = filteredTutorials.reduce((acc, tutorial) => {
    if (!acc[tutorial.language]) {
      acc[tutorial.language] = [];
    }
    acc[tutorial.language].push(tutorial);
    return acc;
  }, {} as Record<string, Tutorial[]>);
  
  // Get unique languages and difficulties for filters
  const availableLanguages = [...new Set(tutorials.map(t => t.language))].sort();
  const availableDifficulties: Array<'beginner' | 'intermediate' | 'advanced'> = ['beginner', 'intermediate', 'advanced'];
  
  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedLanguage('all');
    setSelectedDifficulty('all');
    setCustomOnly(false);
  };
  
  // Check if any filters are active
  const hasActiveFilters = searchQuery || selectedLanguage !== 'all' || selectedDifficulty !== 'all' || customOnly;

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
        <Button onClick={handleCreate} className="bg-blue-500 hover:bg-blue-600">
          <Plus className="w-4 h-4 mr-2" />
          Create Tutorial
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tutorials by title, description, or content..."
            className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
              theme === 'dark'
                ? 'bg-gray-900 border-gray-800 focus:border-blue-500'
                : 'bg-white border-gray-200 focus:border-blue-500'
            } outline-none transition-colors`}
          />
        </div>

        {/* Filter Toggle and Active Filters */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-blue-500/20 text-blue-500' : ''}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            
            {hasActiveFilters && (
              <>
                <span className="text-sm text-gray-400">
                  {filteredTutorials.length} of {tutorials.length} tutorials
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-red-500 hover:text-red-400"
                >
                  Clear Filters
                </Button>
              </>
            )}
          </div>
          
          {/* Active Filter Tags */}
          <div className="flex items-center gap-2 flex-wrap">
            {searchQuery && (
              <span className="px-3 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400 flex items-center gap-2">
                Search: "{searchQuery}"
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchQuery('')} />
              </span>
            )}
            {selectedLanguage !== 'all' && (
              <span className="px-3 py-1 rounded-full text-xs bg-green-500/20 text-green-400 flex items-center gap-2">
                {selectedLanguage}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedLanguage('all')} />
              </span>
            )}
            {selectedDifficulty !== 'all' && (
              <span className="px-3 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400 flex items-center gap-2">
                {selectedDifficulty}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedDifficulty('all')} />
              </span>
            )}
            {customOnly && (
              <span className="px-3 py-1 rounded-full text-xs bg-purple-500/20 text-purple-400 flex items-center gap-2">
                Custom Only
                <X className="w-3 h-3 cursor-pointer" onClick={() => setCustomOnly(false)} />
              </span>
            )}
          </div>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div
            className={`p-4 rounded-lg border ${
              theme === 'dark'
                ? 'bg-gray-900 border-gray-800'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Language Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Language</label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  <option value="all">All Languages</option>
                  {availableLanguages.map(lang => (
                    <option key={lang} value={lang}>
                      {lang.charAt(0).toUpperCase() + lang.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Difficulty Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Difficulty</label>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  <option value="all">All Difficulties</option>
                  {availableDifficulties.map(diff => (
                    <option key={diff} value={diff}>
                      {diff.charAt(0).toUpperCase() + diff.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Only Toggle */}
              <div>
                <label className="block text-sm font-medium mb-2">Type</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customOnly}
                    onChange={(e) => setCustomOnly(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-sm">Show Custom Only</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>



      {/* Tutorials List */}
      {tutorials.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-400">Loading tutorials...</p>
        </div>
      ) : filteredTutorials.length === 0 ? (
        <div className="text-center py-12">
          <Search className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-400 mb-2">No tutorials found</p>
          <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="mt-4"
            >
              Clear All Filters
            </Button>
          )}
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
                            onClick={() => handleEdit(tutorial)}
                            title="Edit tutorial"
                          >
                            <Edit className="w-4 h-4 text-blue-500" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleView(tutorial)}
                            title="View tutorial"
                          >
                            <ExternalLink className="w-4 h-4 text-green-500" />
                          </Button>
                          {tutorial.isCustom && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDelete(tutorial)}
                              title="Delete tutorial"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
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

      {/* Edit/Create Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl p-6 ${
              theme === 'dark' ? 'bg-gray-900' : 'bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold">
                {editingTutorial ? 'Edit Tutorial' : 'Create New Tutorial'}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowDialog(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* Basic Info */}
              <div>
                <label className="block text-sm font-medium mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700'
                      : 'bg-gray-50 border-gray-300'
                  }`}
                  placeholder="Tutorial title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700'
                      : 'bg-gray-50 border-gray-300'
                  }`}
                  rows={3}
                  placeholder="Tutorial description"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Language</label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-gray-800 border-gray-700'
                        : 'bg-gray-50 border-gray-300'
                    }`}
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="csharp">C#</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Difficulty</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-gray-800 border-gray-700'
                        : 'bg-gray-50 border-gray-300'
                    }`}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Order</label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-gray-800 border-gray-700'
                        : 'bg-gray-50 border-gray-300'
                    }`}
                    min={1}
                  />
                </div>
              </div>

              {/* Sections */}
              <div className="border-t pt-4 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold">Sections</h4>
                  <Button onClick={addSection} size="sm" className="bg-blue-500 hover:bg-blue-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Section
                  </Button>
                </div>

                <div className="space-y-4">
                  {formData.sections?.map((section, index) => (
                    <div
                      key={section.id}
                      className={`p-4 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-gray-800 border-gray-700'
                          : 'bg-gray-50 border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium">Section {index + 1}</h5>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSection(index)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>

                      <div className="space-y-3">
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) => updateSection(index, { title: e.target.value })}
                          className={`w-full px-3 py-2 rounded border ${
                            theme === 'dark'
                              ? 'bg-gray-900 border-gray-600'
                              : 'bg-white border-gray-300'
                          }`}
                          placeholder="Section title"
                        />

                        <textarea
                          value={section.content}
                          onChange={(e) => updateSection(index, { content: e.target.value })}
                          className={`w-full px-3 py-2 rounded border ${
                            theme === 'dark'
                              ? 'bg-gray-900 border-gray-600'
                              : 'bg-white border-gray-300'
                          }`}
                          rows={3}
                          placeholder="Section content"
                        />

                        <textarea
                          value={section.codeExample || ''}
                          onChange={(e) => updateSection(index, { codeExample: e.target.value })}
                          className={`w-full px-3 py-2 rounded border font-mono text-sm ${
                            theme === 'dark'
                              ? 'bg-gray-900 border-gray-600'
                              : 'bg-white border-gray-300'
                          }`}
                          rows={4}
                          placeholder="Code example (optional)"
                        />

                        <div className="flex items-center gap-2">
                          <Video className="w-4 h-4 text-red-500" />
                          <input
                            type="text"
                            value={section.videoUrl || ''}
                            onChange={(e) => updateSection(index, { videoUrl: e.target.value })}
                            className={`flex-1 px-3 py-2 rounded border ${
                              theme === 'dark'
                                ? 'bg-gray-900 border-gray-600'
                                : 'bg-white border-gray-300'
                            }`}
                            placeholder="YouTube video URL (optional) - e.g., https://www.youtube.com/watch?v=..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Button variant="ghost" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} className="bg-blue-500 hover:bg-blue-600">
                  {editingTutorial ? 'Save Changes' : 'Create Tutorial'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
