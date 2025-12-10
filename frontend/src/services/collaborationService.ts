import axios from 'axios';
import {
  CollaborationSession,
  CreateSessionData,
  CollaborationMessage,
} from '../types/collaboration';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9876';

const api = axios.create({
  baseURL: `${API_URL}/api/collaboration`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nexusquest-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const collaborationService = {
  // Create a new collaboration session
  async createSession(data: CreateSessionData): Promise<CollaborationSession> {
    const response = await api.post('/sessions', data);
    return response.data.session;
  },

  // Get session details
  async getSession(sessionId: string): Promise<CollaborationSession> {
    const response = await api.get(`/sessions/${sessionId}`);
    return response.data.session;
  },

  // Get user's sessions
  async getUserSessions(active: boolean = true): Promise<CollaborationSession[]> {
    const response = await api.get('/sessions', {
      params: { active: active.toString() },
    });
    return response.data.sessions;
  },

  // Get public sessions
  async getPublicSessions(): Promise<CollaborationSession[]> {
    const response = await api.get('/public-sessions');
    return response.data.sessions;
  },

  // Update session settings
  async updateSession(
    sessionId: string,
    updates: Partial<CreateSessionData>
  ): Promise<CollaborationSession> {
    const response = await api.patch(`/sessions/${sessionId}`, updates);
    return response.data.session;
  },

  // End session
  async endSession(sessionId: string): Promise<void> {
    await api.delete(`/sessions/${sessionId}`);
  },

  // Get session messages
  async getMessages(
    sessionId: string,
    limit: number = 50,
    before?: string
  ): Promise<CollaborationMessage[]> {
    const response = await api.get(`/sessions/${sessionId}/messages`, {
      params: { limit, before },
    });
    return response.data.messages;
  },

  // Update participant role
  async updateParticipantRole(
    sessionId: string,
    userId: string,
    role: 'owner' | 'editor' | 'viewer'
  ): Promise<void> {
    await api.patch(`/sessions/${sessionId}/participants/${userId}`, { role });
  },

  // Remove participant
  async removeParticipant(sessionId: string, userId: string): Promise<void> {
    await api.delete(`/sessions/${sessionId}/participants/${userId}`);
  },
};
