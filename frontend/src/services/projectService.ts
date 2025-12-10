const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9876';

export interface ProjectFile {
  _id: string;
  name: string;
  content: string;
  language: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  _id: string;
  name: string;
  description?: string;
  language: string;
  files: ProjectFile[];
  dependencies?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('nexusquest-token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// Get all projects
export async function getProjects(): Promise<Project[]> {
  const response = await fetch(`${API_URL}/api/projects`, {
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

// Get a single project
export async function getProject(projectId: string): Promise<Project> {
  const response = await fetch(`${API_URL}/api/projects/${projectId}`, {
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

// Create a new project
export async function createProject(
  name: string,
  description?: string,
  language?: string
): Promise<Project> {
  const response = await fetch(`${API_URL}/api/projects`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, description, language }),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

// Update a project
export async function updateProject(
  projectId: string,
  updates: { name?: string; description?: string; language?: string; dependencies?: Record<string, string> }
): Promise<Project> {
  const response = await fetch(`${API_URL}/api/projects/${projectId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

// Delete a project
export async function deleteProject(projectId: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/projects/${projectId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
}

// Add a file to a project
export async function addFile(
  projectId: string,
  name: string,
  content?: string,
  language?: string
): Promise<ProjectFile> {
  const response = await fetch(`${API_URL}/api/projects/${projectId}/files`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, content, language }),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

// Update a file
export async function updateFile(
  projectId: string,
  fileId: string,
  updates: { name?: string; content?: string; language?: string }
): Promise<ProjectFile> {
  const response = await fetch(
    `${API_URL}/api/projects/${projectId}/files/${fileId}`,
    {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    }
  );
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

// Delete a file
export async function deleteFile(
  projectId: string,
  fileId: string
): Promise<void> {
  const response = await fetch(
    `${API_URL}/api/projects/${projectId}/files/${fileId}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }
  );
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
}

// Run a project with multiple files
export interface RunProjectResult {
  success: boolean;
  output: string;
  error: string;
  executionTime: number;
}

export async function runProject(
  files: { name: string; content: string; language: string }[],
  mainFile: string,
  language: string,
  input?: string
): Promise<RunProjectResult> {
  const response = await fetch(`${API_URL}/api/run-project`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files, mainFile, language, input }),
  });
  return response.json();
}
