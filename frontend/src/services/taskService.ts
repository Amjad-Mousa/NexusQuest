import { getStoredToken } from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9876';

export type TaskDifficulty = 'easy' | 'medium' | 'hard';
export type TaskLanguage = 'python' | 'javascript' | 'java' | 'cpp';

export interface TestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

export interface Task {
  _id: string;
  title: string;
  description: string;
  points: number;
  difficulty: TaskDifficulty;
  language: TaskLanguage;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  starterCode?: string;
  solution?: string; // Only visible to the teacher who created the task
  testCases?: TestCase[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  points: number;
  difficulty: TaskDifficulty;
  language?: TaskLanguage;
  starterCode?: string;
  solution?: string;
  testCases?: TestCase[];
}

async function authFetch(url: string, options: RequestInit = {}) {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  return fetch(url, { ...options, headers });
}

export async function getTasks(filters?: { difficulty?: TaskDifficulty; language?: TaskLanguage }): Promise<Task[]> {
  const params = new URLSearchParams();
  if (filters?.difficulty) params.append('difficulty', filters.difficulty);
  if (filters?.language) params.append('language', filters.language);

  const res = await authFetch(`${API_URL}/api/tasks?${params.toString()}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function getMyTasks(): Promise<Task[]> {
  const res = await authFetch(`${API_URL}/api/tasks/my-tasks`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function getTask(id: string): Promise<Task> {
  const res = await authFetch(`${API_URL}/api/tasks/${id}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const res = await authFetch(`${API_URL}/api/tasks`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function updateTask(id: string, input: Partial<CreateTaskInput>): Promise<Task> {
  const res = await authFetch(`${API_URL}/api/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function deleteTask(id: string): Promise<void> {
  const res = await authFetch(`${API_URL}/api/tasks/${id}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
}

// Task Progress Types and Functions
export type TaskStatus = 'started' | 'completed';

export interface TaskProgress {
  _id: string;
  userId: string;
  taskId: Task;
  status: TaskStatus;
  code: string;
  startedAt: string;
  completedAt?: string;
}

export async function getMyProgress(status?: TaskStatus): Promise<TaskProgress[]> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);

  const res = await authFetch(`${API_URL}/api/task-progress/my-progress?${params.toString()}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function getTaskProgress(taskId: string): Promise<TaskProgress | null> {
  const res = await authFetch(`${API_URL}/api/task-progress/${taskId}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function startTask(taskId: string): Promise<TaskProgress> {
  const res = await authFetch(`${API_URL}/api/task-progress/${taskId}/start`, {
    method: 'POST',
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function saveTaskCode(taskId: string, code: string): Promise<TaskProgress> {
  const res = await authFetch(`${API_URL}/api/task-progress/${taskId}/save`, {
    method: 'PUT',
    body: JSON.stringify({ code }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function completeTask(taskId: string, code: string): Promise<TaskProgress> {
  const res = await authFetch(`${API_URL}/api/task-progress/${taskId}/complete`, {
    method: 'PUT',
    body: JSON.stringify({ code }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}
