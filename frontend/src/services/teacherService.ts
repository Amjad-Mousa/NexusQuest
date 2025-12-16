import { getApiUrl } from '../utils/apiHelpers';

const API_BASE = `${getApiUrl()}/api`;

export interface TeacherStats {
  totalTasks: number;
  totalStudents: number;
  averageScore: number;
  popularTask: string;
  totalAttempts: number;
  completedAttempts: number;
}

/**
 * Get teacher statistics from database
 */
import { getStoredToken } from './authService';

export const getTeacherStats = async (): Promise<TeacherStats> => {
  try {
    const token = getStoredToken();
    const response = await fetch(`${API_BASE}/auth/teacher/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch teacher stats');
    }

    return data.stats;
  } catch (error) {
    console.error('Error fetching teacher stats:', error);
    throw error;
  }
};
