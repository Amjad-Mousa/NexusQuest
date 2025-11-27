import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as projectService from '../services/projectService';
import type { Project, ProjectFile } from '../services/projectService';
import type { Language, User } from '../types';
import { defaultPythonCode } from '../constants/defaultCode';

interface UseProjectOptions {
  user: User | null;
  onCodeChange: (code: string) => void;
  onLanguageChange: (language: Language) => void;
}

export function useProject({ user, onCodeChange, onLanguageChange }: UseProjectOptions) {
  const navigate = useNavigate();
  const { projectId: urlProjectId } = useParams<{ projectId?: string }>();

  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentFile, setCurrentFile] = useState<ProjectFile | null>(null);
  const [showNewFileInput, setShowNewFileInput] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [newFileLanguage, setNewFileLanguage] = useState<Language>('python');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Load projects
  const loadProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      return [];
    }
    try {
      const data = await projectService.getProjects();
      setProjects(data);
      return data;
    } catch (error) {
      console.error('Failed to load projects:', error);
      return [];
    }
  }, [user]);

  // Initialize session (load project from URL or localStorage)
  useEffect(() => {
    const initSession = async () => {
      const projectsData = await loadProjects();

      if (user && projectsData && projectsData.length > 0) {
        const targetProjectId = urlProjectId || localStorage.getItem('nexusquest-last-project');
        const lastFileId = localStorage.getItem('nexusquest-last-file');

        if (targetProjectId) {
          const project = projectsData.find((p: Project) => p._id === targetProjectId);
          if (project) {
            setCurrentProject(project);

            if (lastFileId && !urlProjectId) {
              const file = project.files.find((f: ProjectFile) => f._id === lastFileId);
              if (file) {
                setCurrentFile(file);
                onCodeChange(file.content);
                onLanguageChange(file.language as Language);
                return;
              }
            }
            if (project.files.length > 0) {
              const firstFile = project.files[0];
              setCurrentFile(firstFile);
              onCodeChange(firstFile.content);
              onLanguageChange(firstFile.language as Language);
            }
          } else if (urlProjectId) {
            navigate('/');
          }
        }
      } else if (urlProjectId && !user) {
        navigate('/login');
      }
    };

    initSession();
  }, [user, urlProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save current project/file to localStorage
  useEffect(() => {
    if (currentProject) {
      localStorage.setItem('nexusquest-last-project', currentProject._id);
    } else {
      localStorage.removeItem('nexusquest-last-project');
    }
  }, [currentProject]);

  useEffect(() => {
    if (currentFile) {
      localStorage.setItem('nexusquest-last-file', currentFile._id);
    } else {
      localStorage.removeItem('nexusquest-last-file');
    }
  }, [currentFile]);

  // Clear project state when user logs out
  useEffect(() => {
    if (!user) {
      setCurrentProject(null);
      setCurrentFile(null);
      setProjects([]);
      onCodeChange(defaultPythonCode);
      onLanguageChange('python');
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Open a file
  const openFile = useCallback((file: ProjectFile) => {
    setCurrentFile(file);
    onCodeChange(file.content);
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'py') onLanguageChange('python');
    else if (ext === 'js') onLanguageChange('javascript');
    else if (ext === 'java') onLanguageChange('java');
    else if (ext === 'cpp' || ext === 'cc' || ext === 'h' || ext === 'hpp') onLanguageChange('cpp');
  }, [onCodeChange, onLanguageChange]);

  // Close project
  const closeProject = useCallback(() => {
    setCurrentProject(null);
    setCurrentFile(null);
    onCodeChange(defaultPythonCode);
    onLanguageChange('python');
    localStorage.removeItem('nexusquest-last-project');
    localStorage.removeItem('nexusquest-last-file');
    navigate('/');
  }, [navigate, onCodeChange, onLanguageChange]);

  // Delete project
  const deleteProject = useCallback(async (projectId: string, projectName: string) => {
    if (confirm(`Delete project "${projectName}"?`)) {
      try {
        await projectService.deleteProject(projectId);
        if (currentProject?._id === projectId) {
          closeProject();
        }
        loadProjects();
      } catch (err) {
        console.error('Failed to delete project:', err);
      }
    }
  }, [currentProject, closeProject, loadProjects]);

  // Add file to project
  const addFileToProject = useCallback(async (fileName: string, folderPath?: string) => {
    if (!currentProject || !fileName.trim()) return;

    try {
      const extensions: Record<Language, string> = {
        python: '.py', javascript: '.js', java: '.java', cpp: '.cpp'
      };
      let name = fileName.trim();
      const ext = extensions[newFileLanguage];
      const hasExtension = ['.py', '.js', '.java', '.cpp', '.h', '.hpp'].some(e => name.endsWith(e));
      if (!hasExtension && ext) name += ext;
      if (folderPath) name = `${folderPath}/${name}`;

      await projectService.addFile(currentProject._id, name, '', newFileLanguage);
      setNewFileName('');
      setNewFileLanguage('python');
      setShowNewFileInput(null);

      // Refresh current project
      const updatedProject = await projectService.getProject(currentProject._id);
      setCurrentProject(updatedProject);
      loadProjects();
    } catch (err) {
      console.error('Failed to add file:', err);
      alert('Failed to add file');
    }
  }, [currentProject, newFileLanguage, loadProjects]);

  // Delete file
  const deleteFile = useCallback(async (fileId: string, fileName: string) => {
    if (!currentProject) return;
    if (confirm(`Delete file "${fileName}"?`)) {
      try {
        await projectService.deleteFile(currentProject._id, fileId);
        if (currentFile?._id === fileId) {
          setCurrentFile(null);
        }
        // Refresh current project
        const updatedProject = await projectService.getProject(currentProject._id);
        setCurrentProject(updatedProject);
        loadProjects();
      } catch (err) {
        console.error('Failed to delete file:', err);
      }
    }
  }, [currentProject, currentFile, loadProjects]);

  return {
    // State
    projects,
    currentProject,
    currentFile,
    showNewFileInput,
    newFileName,
    newFileLanguage,
    expandedFolders,

    // Setters
    setCurrentProject,
    setCurrentFile,
    setShowNewFileInput,
    setNewFileName,
    setNewFileLanguage,
    setExpandedFolders,

    // Actions
    loadProjects,
    openFile,
    closeProject,
    deleteProject,
    addFileToProject,
    deleteFile,
  };
}

