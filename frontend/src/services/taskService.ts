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

export async function getMyProgress(status?: string): Promise<TaskProgress[]> {
  const token = localStorage.getItem('nexusquest-token');
  if (!token) return [];

  const url = status
    ? `${API_URL}/api/task-progress/my-progress?status=${status}`
    : `${API_URL}/api/task-progress/my-progress`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch progress');
  }

  const data = await response.json();
  return data.data || [];
}

export async function getUserProgress(userId: string, status?: string): Promise<TaskProgress[]> {
  const token = localStorage.getItem('nexusquest-token');
  if (!token) return [];

  const url = status
    ? `${API_URL}/api/task-progress/user/${userId}?status=${status}`
    : `${API_URL}/api/task-progress/user/${userId}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user progress');
  }

  const data = await response.json();
  return data.data || [];
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

// Run all test cases for a task against submitted code
export interface TaskTestResultItem {
  index: number;
  passed: boolean;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  error?: string;
}

export interface TaskTestResultsSummary {
  total: number;
  passed: number;
  results: TaskTestResultItem[];
  completed: boolean; // true if all tests passed and task was marked completed
}

export async function runTaskTests(taskId: string, code: string): Promise<TaskTestResultsSummary> {
  const res = await authFetch(`${API_URL}/api/tasks/${taskId}/run-tests`, {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data as TaskTestResultsSummary;
}

// Get current user stats (totalPoints, etc.)
export interface UserStats {
  totalPoints: number;
  completedTasks: number;
  startedTasks: number;
}

export async function syncUserPoints(): Promise<number> {
  const res = await authFetch(`${API_URL}/api/auth/sync-points`, {
    method: 'POST',
  });
  const data = await res.json();
  return data.success ? data.totalPoints : 0;
}

export async function getUserStats(): Promise<UserStats> {
  // Get completed tasks count
  const completedProgress = await getMyProgress('completed');
  const startedProgress = await getMyProgress('started');

  // Sync points first if user has completed tasks but might have 0 points (migration)
  const token = getStoredToken();
  let res = await fetch(`${API_URL}/api/auth/me`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  let data = await res.json();

  // If user has completed tasks but 0 points, sync them
  if (data.success && completedProgress.length > 0 && (data.user?.totalPoints || 0) === 0) {
    await syncUserPoints();
    // Re-fetch user data after sync
    res = await fetch(`${API_URL}/api/auth/me`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    data = await res.json();
  }

  return {
    totalPoints: data.success ? (data.user?.totalPoints || 0) : 0,
    completedTasks: completedProgress.length,
    startedTasks: startedProgress.length,
  };
}
