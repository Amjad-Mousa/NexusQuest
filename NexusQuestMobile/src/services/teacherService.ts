import api from './api';

export interface StudentStats {
  id: string;
  name: string;
  email: string;
  completedTutorials: number;
  completedQuizzes: number;
  averageScore: number;
  lastActive: string;
}

export interface TeacherStats {
  totalStudents: number;
  activeStudents: number;
  totalQuizzes: number;
  pendingSubmissions: number;
  averageClassScore: number;
}

export interface QuizSubmission {
  id: string;
  studentId: string;
  studentName: string;
  quizId: string;
  quizTitle: string;
  score: number;
  maxScore: number;
  submittedAt: string;
  needsGrading: boolean;
}

export const getTeacherStats = async (): Promise<TeacherStats> => {
  try {
    const response = await api.get('/api/teacher/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching teacher stats:', error);
    throw error;
  }
};

export const getStudentsList = async (): Promise<StudentStats[]> => {
  try {
    const response = await api.get('/api/teacher/students');
    return response.data;
  } catch (error) {
    console.error('Error fetching students list:', error);
    throw error;
  }
};

export const getPendingSubmissions = async (): Promise<QuizSubmission[]> => {
  try {
    const response = await api.get('/api/teacher/submissions/pending');
    return response.data;
  } catch (error) {
    console.error('Error fetching pending submissions:', error);
    throw error;
  }
};

export const gradeSubmission = async (submissionId: string, grade: number, feedback: string): Promise<void> => {
  try {
    await api.post(`/api/teacher/submissions/${submissionId}/grade`, {
      grade,
      feedback
    });
  } catch (error) {
    console.error('Error grading submission:', error);
    throw error;
  }
};

export const getStudentDetails = async (studentId: string): Promise<any> => {
  try {
    const response = await api.get(`/api/teacher/students/${studentId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching student details:', error);
    throw error;
  }
};
