const API_BASE = 'http://localhost:9876/api';

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
export const getTeacherStats = async (): Promise<TeacherStats> => {
  try {
    const token = localStorage.getItem('nexusquest-token');
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
