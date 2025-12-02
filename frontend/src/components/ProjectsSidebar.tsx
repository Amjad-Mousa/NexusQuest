import { useState , useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, X, FolderOpen, Trophy, Settings, ChevronRight, Moon, Sun, Minus, Plus, LogOut, Play } from 'lucide-react';
import type { Theme, User as UserType } from '../types';
import { Button } from './ui/button';
import * as projectService from '../services/projectService';
import type { Project } from '../services/projectService';

interface ProjectsSidebarProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}



export function ProjectsSidebar({ 
  theme,
  setTheme 
}: ProjectsSidebarProps) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
      loadProjects();
    }, []);

  const loadProjects = async () => {
        try {
          const data = await projectService.getProjects();
          setProjects(data);
        } catch (error) {
          console.error('Failed to load projects:', error);
        }
      };
  

  return (
    <div>
      {/* Projects Section */}
      <div className={`${theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} border rounded-xl p-6 mb-6`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
            <FolderOpen className="w-5 h-5 text-blue-400" />
            My Projects
          </h2>
          <Button
            onClick={() => navigate('/projects')}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            View All
          </Button>
        </div>

        <div className="space-y-3">
          {projects.map((project) => (
            <div
              key={project._id}
              onClick={() => navigate(`/project/${project._id}`)}
              className={`${theme === 'dark' ? 'bg-gray-800/50 border-gray-700 hover:border-blue-500/30' : 'bg-gray-50 border-gray-200 hover:border-blue-400'} border rounded-lg p-4 transition-all cursor-pointer`}
            >
              <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-1`}>{project.name}</h3>
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded ${
                  project.language === 'Python' ? 'bg-blue-500/20 text-blue-400' :
                  project.language === 'JavaScript' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-purple-500/20 text-purple-400'
                }`}>
                  {project.language}
                </span>
                <span className="text-xs text-gray-400">{project.updatedAt}</span>
              </div>
            </div>
          ))}
        </div>

        <Button
          onClick={() => navigate('/projects')}
          className="w-full mt-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
        >
          <Play className="w-4 h-4 mr-2 inline" />
          Create New Project
        </Button>
      </div>
    </div>
  );
}