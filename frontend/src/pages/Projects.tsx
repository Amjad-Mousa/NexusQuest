import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { FolderOpen, Plus, Trash2, Code, Calendar, FileCode, Home, ArrowRight, User } from 'lucide-react';
import * as projectService from '../services/projectService';
import type { Project } from '../services/projectService';
import { useTheme } from '../context/ThemeContext';
import { UserSidebar } from '../components/UserSidebar';

interface ProjectsProps {
  user: { name: string; email: string } | null;
  onLogout: () => void;
}

export function Projects({ user, onLogout }: ProjectsProps) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectLanguage, setNewProjectLanguage] = useState('python');
  const [creating, setCreating] = useState(false);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadProjects();
  }, [user, navigate]);

  const loadProjects = async () => {
    try {
      const data = await projectService.getProjects();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    
    setCreating(true);
    try {
      const project = await projectService.createProject(newProjectName.trim(), '', newProjectLanguage);
      setProjects([project, ...projects]);
      setNewProjectName('');
      setShowNewProject(false);
      // Navigate to the new project
      navigate(`/project/${project._id}`);
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Delete project "${projectName}"? This cannot be undone.`)) return;
    
    try {
      await projectService.deleteProject(projectId);
      setProjects(projects.filter(p => p._id !== projectId));
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const getLanguageIcon = (language: string) => {
    const icons: Record<string, string> = {
      python: '🐍',
      javascript: '⚡',
      java: '☕',
      cpp: '⚙️'
    };
    return icons[language] || '📄';
  };

  const getLanguageColor = (language: string) => {
    const colors: Record<string, string> = {
      python: 'from-blue-500 to-yellow-500',
      javascript: 'from-yellow-400 to-yellow-600',
      java: 'from-red-500 to-orange-500',
      cpp: 'from-blue-600 to-purple-600'
    };
    return colors[language] || 'from-gray-500 to-gray-600';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950' : 'bg-gradient-to-br from-gray-100 via-white to-gray-100'}`}>
      {/* User Sidebar */}
      <UserSidebar 
        user={user} 
        onLogout={onLogout} 
        isOpen={showSidePanel} 
        onClose={() => setShowSidePanel(false)} 
      />

      {/* Header */}
      <header className={`border-b ${theme === 'dark' ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white/80'} backdrop-blur-sm sticky top-0 z-10`}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
              <Home className="w-5 h-5" />
              <span className="text-sm">Home</span>
            </Link>
            <span className={theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}>/</span>
            <h1 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
              <FolderOpen className="w-5 h-5 text-yellow-500" />
              My Projects
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowNewProject(true)}
              className="h-9 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
            <Button
              onClick={() => setShowSidePanel(true)}
              className={`h-9 px-3 ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'}`}
            >
              <User className="w-4 h-4 mr-2" />
              {user?.name}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* New Project Modal */}
        {showNewProject && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-6 w-full max-w-md border shadow-2xl`}>
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>Create New Project</h2>
              <form onSubmit={handleCreateProject}>
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Project Name</label>
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className={`w-full px-4 py-2 ${theme === 'dark' ? 'bg-gray-900/50 border-gray-600 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      placeholder="My Awesome Project"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Language</label>
                    <select
                      value={newProjectLanguage}
                      onChange={(e) => setNewProjectLanguage(e.target.value)}
                      className={`w-full px-4 py-2 ${theme === 'dark' ? 'bg-gray-900/50 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                      <option value="python">🐍 Python</option>
                      <option value="javascript">⚡ JavaScript</option>
                      <option value="java">☕ Java</option>
                      <option value="cpp">⚙️ C++</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <Button
                    type="button"
                    onClick={() => setShowNewProject(false)}
                    className={`flex-1 h-10 ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={creating || !newProjectName.trim()}
                    className="flex-1 h-10 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  >
                    {creating ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Empty State */}
        {projects.length === 0 ? (
          <div className="text-center py-16">
            <div className={`w-20 h-20 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} rounded-2xl flex items-center justify-center mx-auto mb-6`}>
              <FolderOpen className={`w-10 h-10 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
            </div>
            <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>No projects yet</h2>
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-6`}>Create your first project to get started</p>
            <Button
              onClick={() => setShowNewProject(true)}
              className="h-10 px-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </div>
        ) : (
          /* Projects Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div
                key={project._id}
                className={`group ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md'} backdrop-blur-sm rounded-xl border transition-all overflow-hidden`}
              >
                {/* Project Header with gradient */}
                <div className={`h-2 bg-gradient-to-r ${getLanguageColor(project.language)}`} />

                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getLanguageIcon(project.language)}</span>
                      <div>
                        <h3 className={`font-semibold ${theme === 'dark' ? 'text-white group-hover:text-blue-400' : 'text-gray-900 group-hover:text-blue-600'} transition-colors`}>
                          {project.name}
                        </h3>
                        <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'} capitalize`}>{project.language}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project._id, project.name);
                      }}
                      className={`p-2 rounded-lg ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all`}
                      title="Delete project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className={`flex items-center gap-4 text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'} mb-4`}>
                    <span className="flex items-center gap-1">
                      <FileCode className="w-3 h-3" />
                      {project.files.length} file{project.files.length !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(project.updatedAt)}
                    </span>
                  </div>

                  <Button
                    onClick={() => navigate(`/project/${project._id}`)}
                    className={`w-full h-9 ${theme === 'dark' ? 'bg-gray-700/50 hover:bg-blue-600 text-gray-300' : 'bg-gray-100 hover:bg-blue-600 text-gray-700'} hover:text-white transition-all group/btn`}
                  >
                    <Code className="w-4 h-4 mr-2" />
                    Open Project
                    <ArrowRight className="w-4 h-4 ml-2 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

