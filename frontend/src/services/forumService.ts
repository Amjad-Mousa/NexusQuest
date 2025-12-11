const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9876';

export interface Author {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export interface Question {
  _id: string;
  title: string;
  content: string;
  author: Author;
  tags: string[];
  programmingLanguage: string;
  codeSnippet?: string;
  upvotes: string[];
  downvotes: string[];
  views: number;
  answersCount: number;
  isResolved: boolean;
  acceptedAnswer?: string;
  voteScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface Answer {
  _id: string;
  content: string;
  author: Author;
  question: string;
  codeSnippet?: string;
  upvotes: string[];
  downvotes: string[];
  isAccepted: boolean;
  voteScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuestionData {
  title: string;
  content: string;
  tags?: string[];
  language?: string;
  codeSnippet?: string;
}

export interface CreateAnswerData {
  content: string;
  codeSnippet?: string;
}

export interface QuestionsResponse {
  success: boolean;
  questions: Question[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const getAuthHeader = (): Record<string, string> => {
  const token = localStorage.getItem('nexusquest-token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Questions
export const getQuestions = async (params?: {
  page?: number;
  limit?: number;
  language?: string;
  tag?: string;
  resolved?: boolean;
  search?: string;
  sort?: 'newest' | 'popular' | 'unanswered';
}): Promise<QuestionsResponse> => {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.language) searchParams.set('language', params.language);
  if (params?.tag) searchParams.set('tag', params.tag);
  if (params?.resolved !== undefined) searchParams.set('resolved', params.resolved.toString());
  if (params?.search) searchParams.set('search', params.search);
  if (params?.sort) searchParams.set('sort', params.sort);

  const response = await fetch(`${API_URL}/api/forum/questions?${searchParams}`, {
    headers: { ...getAuthHeader() },
  });
  return response.json();
};

export const getQuestion = async (id: string): Promise<{ success: boolean; question: Question; answers: Answer[] }> => {
  const response = await fetch(`${API_URL}/api/forum/questions/${id}`, {
    headers: { ...getAuthHeader() },
  });
  return response.json();
};

export const createQuestion = async (data: CreateQuestionData): Promise<{ success: boolean; question: Question }> => {
  const response = await fetch(`${API_URL}/api/forum/questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });
  return response.json();
};

export const updateQuestion = async (id: string, data: Partial<CreateQuestionData>): Promise<{ success: boolean; question: Question }> => {
  const response = await fetch(`${API_URL}/api/forum/questions/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });
  return response.json();
};

export const deleteQuestion = async (id: string): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_URL}/api/forum/questions/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeader() },
  });
  return response.json();
};

export const voteQuestion = async (id: string, type: 'up' | 'down'): Promise<{ success: boolean; upvotes: number; downvotes: number; voteScore: number }> => {
  const response = await fetch(`${API_URL}/api/forum/questions/${id}/vote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({ type }),
  });
  return response.json();
};

// Answers
export const createAnswer = async (questionId: string, data: CreateAnswerData): Promise<{ success: boolean; answer: Answer }> => {
  const response = await fetch(`${API_URL}/api/forum/questions/${questionId}/answers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });
  return response.json();
};

export const updateAnswer = async (id: string, data: Partial<CreateAnswerData>): Promise<{ success: boolean; answer: Answer }> => {
  const response = await fetch(`${API_URL}/api/forum/answers/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });
  return response.json();
};

export const deleteAnswer = async (id: string): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_URL}/api/forum/answers/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeader() },
  });
  return response.json();
};

export const voteAnswer = async (id: string, type: 'up' | 'down'): Promise<{ success: boolean; upvotes: number; downvotes: number; voteScore: number }> => {
  const response = await fetch(`${API_URL}/api/forum/answers/${id}/vote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({ type }),
  });
  return response.json();
};

export const acceptAnswer = async (id: string): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_URL}/api/forum/answers/${id}/accept`, {
    method: 'POST',
    headers: { ...getAuthHeader() },
  });
  return response.json();
};

// Tags
export const getTags = async (): Promise<{ success: boolean; tags: { _id: string; count: number }[] }> => {
  const response = await fetch(`${API_URL}/api/forum/tags`, {
    headers: { ...getAuthHeader() },
  });
  return response.json();
};

// My Questions
export const getMyQuestions = async (): Promise<{ success: boolean; questions: Question[] }> => {
  const response = await fetch(`${API_URL}/api/forum/my-questions`, {
    headers: { ...getAuthHeader() },
  });
  return response.json();
};
