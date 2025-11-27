// Re-export types from projectService
export type { Project, ProjectFile, RunProjectResult } from '../services/projectService';

// Language type
export type Language = 'python' | 'java' | 'javascript' | 'cpp';

// Theme type
export type Theme = 'dark' | 'light';

// Console output type
export interface ConsoleOutput {
  type: 'output' | 'error' | 'info' | 'input';
  message: string;
  timestamp: Date;
}

// User type
export interface User {
  name: string;
  email: string;
}

// App props passed to main components
export interface AppProps {
  user: User | null;
  onLogout: () => void;
}

// Tree node for project explorer
export interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  file?: import('../services/projectService').ProjectFile;
  children: TreeNode[];
}

