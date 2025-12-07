import api from './api';
import { Quiz } from '../types/quiz';

export const quizService = {
  // Get all quizzes (public endpoint)
  async getAllQuizzes(language?: string, difficulty?: string): Promise<Quiz[]> {
    try {
      const params: any = {};
      if (language) params.language = language;
      if (difficulty) params.difficulty = difficulty;

      const response = await api.get('/api/quizzes/public', { params });
      
      // The backend already adds status, so just return the data
      return response.data || [];
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      return [];
    }
  },

  // Get quiz by ID
  async getQuizById(quizId: string): Promise<Quiz> {
    try {
      const response = await api.get(`/api/quizzes/public/${quizId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching quiz:', error);
      throw error;
    }
  },

  // Get available languages
  async getLanguages(): Promise<string[]> {
    try {
      const response = await api.get('/api/quizzes/languages');
      return response.data;
    } catch (error) {
      console.error('Error fetching languages:', error);
      return ['python', 'javascript', 'java', 'cpp'];
    }
  },

  // Create a new quiz (teacher only)
  async createQuiz(input: any): Promise<Quiz> {
    try {
      const response = await api.post('/api/quizzes', input);
      if (response.data && (response.data.success || response.data._id)) {
        // Some APIs return {success, data}, some just the object
        return response.data.data || response.data;
      } else {
        throw new Error(response.data?.error || 'Failed to create quiz');
      }
    } catch (error: any) {
      throw new Error(error?.response?.data?.error || error.message || 'Failed to create quiz');
    }
  },
};

// Helper function to determine quiz status
function getQuizStatus(startTime: string, endTime: string): 'scheduled' | 'active' | 'ended' {
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (now < start) return 'scheduled';
  if (now > end) return 'ended';
  return 'active';
}

export default quizService;
