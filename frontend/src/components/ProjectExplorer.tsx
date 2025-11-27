import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderTree, ChevronRight, ChevronLeft, ChevronDown, FolderOpen, FolderPlus, FilePlus, Trash2, File, Folder, X } from 'lucide-react';
import type { Theme, User, Project, ProjectFile, Language, TreeNode } from '../types';

interface ProjectExplorerProps {
  theme: Theme;
  user: User | null;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  currentProject: Project | null;
  currentFile: ProjectFile | null;
  showNewFileInput: string | null;
  newFileName: string;
  newFileLanguage: Language;
  expandedFolders: Set<string>;
  setShowNewFileInput: (value: string | null) => void;
  setNewFileName: (name: string) => void;
  setNewFileLanguage: (lang: Language) => void;
  setExpandedFolders: (folders: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  onOpenFile: (file: ProjectFile) => void;
  onDeleteProject: (projectId: string, projectName: string) => void;
  onAddFile: (fileName: string, folderPath?: string) => void;
  onDeleteFile: (fileId: string, fileName: string) => void;
  onCloseProject: () => void;
}

export function ProjectExplorer({
  theme,
  user,
  isOpen,
  setIsOpen,
  currentProject,
  currentFile,
  showNewFileInput,
  newFileName,
  newFileLanguage,
  expandedFolders,
  setShowNewFileInput,
  setNewFileName,
  setNewFileLanguage,
  setExpandedFolders,
  onOpenFile,
  onDeleteProject,
  onAddFile,
  onDeleteFile,
  onCloseProject,
}: ProjectExplorerProps) {
  const navigate = useNavigate();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Build tree structure from flat file list
  const buildTree = (files: ProjectFile[]): TreeNode[] => {
    const root: TreeNode[] = [];
    const folders = new Map<string, TreeNode>();

    const sortedFiles = [...files].sort((a, b) => {
      const aDepth = a.name.split('/').length;
      const bDepth = b.name.split('/').length;
      if (aDepth !== bDepth) return aDepth - bDepth;
      return a.name.localeCompare(b.name);
    });

    sortedFiles.forEach(file => {
      const parts = file.name.split('/');
      if (parts.length === 1) {
        root.push({ name: file.name, path: file.name, isFolder: false, file, children: [] });
      } else {
        let currentPath = '';
        let currentLevel = root;
        for (let i = 0; i < parts.length - 1; i++) {
          const folderName = parts[i];
          currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
          let folder = folders.get(currentPath);
          if (!folder) {
            folder = { name: folderName, path: currentPath, isFolder: true, children: [] };
            folders.set(currentPath, folder);
            currentLevel.push(folder);
          }
          currentLevel = folder.children;
        }
        currentLevel.push({ name: parts[parts.length - 1], path: file.name, isFolder: false, file, children: [] });
      }
    });

    const sortNodes = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => {
        if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      nodes.forEach(n => sortNodes(n.children));
    };
    sortNodes(root);
    return root;
  };

  const renderNode = (node: TreeNode, depth: number = 0): JSX.Element => {
    if (node.isFolder) {
      const isExpanded = expandedFolders.has(node.path);
      return (
        <div key={node.path}>
          <div
            className={`flex items-center gap-1 px-1 py-0.5 rounded cursor-pointer group hover:bg-blue-500/10`}
            style={{ paddingLeft: `${depth * 12}px` }}
            onClick={() => {
              setExpandedFolders(prev => {
                const next = new Set(prev);
                if (next.has(node.path)) next.delete(node.path);
                else next.add(node.path);
                return next;
              });
            }}
          >
            {isExpanded ? <ChevronDown className="w-3 h-3 text-gray-500" /> : <ChevronRight className="w-3 h-3 text-gray-500" />}
            {isExpanded ? <FolderOpen className="w-3 h-3 text-yellow-500" /> : <Folder className="w-3 h-3 text-yellow-500" />}
            <span className={`flex-1 truncate ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{node.name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); setShowNewFileInput(`folder:${node.path}`); setExpandedFolders(prev => new Set(prev).add(node.path)); }}
              className="hidden group-hover:block p-0.5 rounded hover:bg-gray-600/50 text-gray-400"
              title="New File in Folder"
            >
              <FilePlus className="w-2.5 h-2.5" />
            </button>
          </div>
          {isExpanded && node.children.map(child => renderNode(child, depth + 1))}
        </div>
      );
    } else {
      const file = node.file!;
      return (
        <div
          key={file._id}
          className={`flex items-center gap-1 px-1 py-0.5 rounded cursor-pointer group ${
            currentFile?._id === file._id
              ? theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'
              : 'hover:bg-blue-500/10'
          }`}
          style={{ paddingLeft: `${depth * 12 + 16}px` }}
          onClick={() => onOpenFile(file)}
        >
          <File className="w-3 h-3 text-blue-400" />
          <span className={`flex-1 truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{node.name}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteFile(file._id, file.name); }}
            className="hidden group-hover:block p-0.5 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400"
            title="Delete File"
          >
            <Trash2 className="w-2.5 h-2.5" />
          </button>
        </div>
      );
    }
  };

  return (
    <div
      className={`transition-all duration-200 flex flex-col border rounded-xl shadow-2xl overflow-hidden ${
        theme === 'dark' ? 'border-gray-700 bg-gray-900/70' : 'border-gray-200 bg-white/90'
      }`}
      style={{ width: isOpen ? 220 : 32 }}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between px-2 py-1 border-b cursor-pointer ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <div className="flex items-center gap-1">
            <FolderTree className="w-3 h-3 text-blue-400" />
            <span className={`text-[11px] font-semibold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>Project Explorer</span>
          </div>
        ) : (
          <FolderTree className="w-3 h-3 mx-auto text-blue-400" />
        )}
        <button type="button" className={`p-0.5 rounded hover:bg-gray-700/40 ${!isOpen && 'hidden'}`}>
          {isOpen ? <ChevronRight className="w-3 h-3 text-gray-400" /> : <ChevronLeft className="w-3 h-3 text-gray-400" />}
        </button>
      </div>

      {isOpen && (
        <div className="flex-1 overflow-auto text-[11px] py-1">
          {/* Header with All Projects button */}
          <div className="px-2 pb-1 flex items-center justify-between">
            <span className="font-semibold text-gray-400 uppercase tracking-wide text-[10px]">
              {currentProject ? 'Current Project' : 'Project'}
            </span>
            {user && (
              <button onClick={() => navigate('/projects')} className="p-0.5 rounded hover:bg-gray-700/50 text-gray-400 hover:text-gray-200" title="All Projects">
                <FolderPlus className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="space-y-0.5 px-1">
            {!user ? (
              <div className={`px-2 py-4 text-center ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                <p>Login to see your projects</p>
              </div>
            ) : !currentProject ? (
              <div className={`px-2 py-4 text-center ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                <p>No project open</p>
                <button onClick={() => navigate('/projects')} className={`mt-2 text-[11px] px-3 py-1 rounded ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>
                  Open Project
                </button>
              </div>
            ) : (
              <div className="relative">
                {/* Project Header */}
                <div
                  className={`flex items-center gap-1 px-1 py-0.5 rounded group cursor-pointer ${theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'}`}
                  onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY }); }}
                >
                  <ChevronDown className="w-3 h-3 text-gray-500" />
                  <FolderOpen className="w-3 h-3 text-yellow-500" />
                  <span className={`flex-1 truncate font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>{currentProject.name}</span>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => setShowNewFileInput(currentProject._id)} className="p-0.5 rounded hover:bg-gray-600/50 text-gray-400" title="New File"><FilePlus className="w-3 h-3" /></button>
                    <button onClick={() => { const name = prompt('Enter folder name:'); if (name?.trim()) { setShowNewFileInput(`folder:${name.trim()}`); setExpandedFolders(prev => new Set(prev).add(name.trim())); } }} className="p-0.5 rounded hover:bg-gray-600/50 text-gray-400" title="New Folder"><FolderPlus className="w-3 h-3" /></button>
                    <button onClick={() => onDeleteProject(currentProject._id, currentProject.name)} className="p-0.5 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400" title="Delete Project"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>

                {/* Context Menu */}
                {contextMenu && (
                  <>
                    <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} />
                    <div className={`fixed z-50 py-1 rounded-md shadow-lg border min-w-[120px] ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`} style={{ left: contextMenu.x, top: contextMenu.y }}>
                      <button onClick={() => { onCloseProject(); setContextMenu(null); }} className={`w-full px-3 py-1.5 text-left text-[11px] flex items-center gap-2 ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}>
                        <X className="w-3 h-3" />Close Project
                      </button>
                    </div>
                  </>
                )}

                {/* Files Tree */}
                <div className="ml-4 space-y-0.5 mt-0.5">
                  {buildTree(currentProject.files).map(node => renderNode(node))}

                  {/* New File Input */}
                  {(showNewFileInput === currentProject._id || showNewFileInput?.startsWith('folder:')) && (
                    <div className="py-0.5" style={{ paddingLeft: showNewFileInput?.startsWith('folder:') ? '16px' : '0px' }}>
                      <form onSubmit={(e) => { e.preventDefault(); if (newFileName.trim()) { const folderPath = showNewFileInput?.startsWith('folder:') ? showNewFileInput.replace('folder:', '') : undefined; onAddFile(newFileName, folderPath); } }} className="space-y-1">
                        <input type="text" value={newFileName} onChange={(e) => setNewFileName(e.target.value)} placeholder="filename..." className={`w-full px-2 py-0.5 text-[11px] rounded border ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} autoFocus onKeyDown={(e) => { if (e.key === 'Escape') { setNewFileName(''); setNewFileLanguage('python'); setShowNewFileInput(null); } }} />
                        <select value={newFileLanguage} onChange={(e) => setNewFileLanguage(e.target.value as Language)} className={`w-full px-2 py-0.5 text-[11px] rounded border ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}>
                          <option value="python">Python 🐍</option>
                          <option value="javascript">JavaScript 📜</option>
                          <option value="java">Java ☕</option>
                          <option value="cpp">C++ ⚡</option>
                        </select>
                        <button type="submit" className={`w-full px-2 py-0.5 text-[11px] rounded ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>Add File</button>
                      </form>
                    </div>
                  )}

                  {currentProject.files.length === 0 && !showNewFileInput && (
                    <div className={`px-2 py-1 text-[10px] ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>No files yet</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

