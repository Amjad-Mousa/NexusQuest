import api from './api';

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
  views: number;
  upvotes: string[];
  downvotes: string[];
  answersCount: number;
  isResolved: boolean;
  acceptedAnswer?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Answer {
  _id: string;
  content: string;
  codeSnippet?: string;
  author: Author;
  question: string;
  upvotes: string[];
  downvotes: string[];
  isAccepted: boolean;
  createdAt: string;
  updatedAt: string;
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

export interface QuestionDetailResponse {
  success: boolean;
  question: Question;
  answers: Answer[];
}

// Get all questions with filters
export const getQuestions = async (params?: {
  page?: number;
  limit?: number;
  language?: string;
  tag?: string;
  resolved?: string;
  search?: string;
  sort?: string;
}): Promise<QuestionsResponse> => {
  try {
    const response = await api.get('/api/forum/questions', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching questions:', error);
    return {
      success: false,
      questions: [],
      pagination: { page: 1, limit: 10, total: 0, pages: 0 },
    };
  }
};

// Get single question with answers
export const getQuestion = async (id: string): Promise<QuestionDetailResponse | null> => {
  try {
    const response = await api.get(`/api/forum/questions/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching question:', error);
    return null;
  }
};

// Create question
export const createQuestion = async (data: {
  title: string;
  content: string;
  tags?: string[];
  language?: string;
  codeSnippet?: string;
}): Promise<{ success: boolean; question?: Question; message?: string }> => {
  try {
    const response = await api.post('/api/forum/questions', data);
    return response.data;
  } catch (error: any) {
    console.error('Error creating question:', error);
    return { success: false, message: error.response?.data?.message || 'Failed to create question' };
  }
};

// Update question
export const updateQuestion = async (
  id: string,
  data: {
    title?: string;
    content?: string;
    tags?: string[];
    language?: string;
    codeSnippet?: string;
  }
): Promise<{ success: boolean; question?: Question; message?: string }> => {
  try {
    const response = await api.put(`/api/forum/questions/${id}`, data);
    return response.data;
  } catch (error: any) {
    console.error('Error updating question:', error);
    return { success: false, message: error.response?.data?.message || 'Failed to update question' };
  }
};

// Delete question
export const deleteQuestion = async (id: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await api.delete(`/api/forum/questions/${id}`);
    return response.data;
  } catch (error: any) {
    console.error('Error deleting question:', error);
    return { success: false, message: error.response?.data?.message || 'Failed to delete question' };
  }
};

// Vote on question
export const voteQuestion = async (
  id: string,
  type: 'up' | 'down'
): Promise<{ success: boolean; upvotes?: number; downvotes?: number; voteScore?: number }> => {
  try {
    const response = await api.post(`/api/forum/questions/${id}/vote`, { type });
    return response.data;
  } catch (error) {
    console.error('Error voting on question:', error);
    return { success: false };
  }
};

// Create answer
export const createAnswer = async (
  questionId: string,
  data: { content: string; codeSnippet?: string }
): Promise<{ success: boolean; answer?: Answer; message?: string }> => {
  try {
    const response = await api.post(`/api/forum/questions/${questionId}/answers`, data);
    return response.data;
  } catch (error: any) {
    console.error('Error creating answer:', error);
    return { success: false, message: error.response?.data?.message || 'Failed to create answer' };
  }
};

// Vote on answer
export const voteAnswer = async (
  id: string,
  type: 'up' | 'down'
): Promise<{ success: boolean; upvotes?: number; downvotes?: number; voteScore?: number }> => {
  try {
    const response = await api.post(`/api/forum/answers/${id}/vote`, { type });
    return response.data;
  } catch (error) {
    console.error('Error voting on answer:', error);
    return { success: false };
  }
};

// Accept answer
export const acceptAnswer = async (
  answerId: string
): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await api.post(`/api/forum/answers/${answerId}/accept`);
    return response.data;
  } catch (error: any) {
    console.error('Error accepting answer:', error);
    return { success: false, message: error.response?.data?.message || 'Failed to accept answer' };
  }
};
