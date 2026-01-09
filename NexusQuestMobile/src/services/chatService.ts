import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

// Production server URL
const API_URL = 'https://muhjah.com/nexusquest';
const SOCKET_ORIGIN = new URL(API_URL).origin;

let socket: Socket | null = null;

export interface ChatMessage {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: string;
  readAt?: string | null;
}

export interface Conversation {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'teacher';
  lastMessageAt: string;
}

export async function connectChat(): Promise<Socket | null> {
  try {
    const token = await AsyncStorage.getItem('nexusquest-token');
    if (!token) return null;

    if (socket?.connected) return socket;

    socket = io(SOCKET_ORIGIN + '/chat', {
      path: '/nexusquest/socket.io',
      auth: { token },
      withCredentials: true,
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    return socket;
  } catch (error) {
    console.error('Failed to connect chat:', error);
    return null;
  }
}

export function getChatSocket(): Socket | null {
  return socket;
}

export function disconnectChat(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export async function fetchConversations(): Promise<Conversation[]> {
  try {
    const response = await api.get('/api/chat/conversations');
    if (response.data.success) {
      return response.data.conversations || [];
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch conversations:', error);
    return [];
  }
}

export async function fetchConversation(otherUserId: string): Promise<ChatMessage[]> {
  try {
    const response = await api.get(`/api/chat/${otherUserId}/messages`);
    if (response.data.success) {
      return response.data.messages.map((m: any) => ({
        id: m._id || m.id,
        senderId: m.sender?.toString?.() || m.senderId,
        recipientId: m.recipient?.toString?.() || m.recipientId,
        content: m.content,
        createdAt: m.createdAt,
        readAt: m.readAt,
      }));
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch conversation:', error);
    return [];
  }
}

export function sendDirectMessage(toUserId: string, content: string): void {
  if (!socket) return;
  if (!content.trim()) return;

  socket.emit('dm:send', { toUserId, content });
}

export function emitTyping(toUserId: string): void {
  if (!socket) return;
  socket.emit('typing', { toUserId });
}

export function emitStopTyping(toUserId: string): void {
  if (!socket) return;
  socket.emit('stop-typing', { toUserId });
}
