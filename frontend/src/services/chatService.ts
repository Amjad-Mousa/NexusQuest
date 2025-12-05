import { io, Socket } from 'socket.io-client';
import { getStoredToken } from './authService';

const API_URL = 'http://localhost:9876';

let socket: Socket | null = null;

export interface ChatMessage {
    id: string;
    senderId: string;
    recipientId: string;
    content: string;
    createdAt: string;
    readAt?: string | null;
}

export function connectChat(): Socket | null {
    const token = getStoredToken();
    if (!token) return null;

    if (socket) return socket;

    socket = io(API_URL, {
        auth: { token },
        withCredentials: true,
    });

    return socket;
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

export async function fetchConversation(otherUserId: string): Promise<ChatMessage[]> {
    const token = getStoredToken();
    if (!token) return [];

    const response = await fetch(`${API_URL}/api/chat/${otherUserId}/messages`, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        return [];
    }

    const data = await response.json();
    if (!data.success || !Array.isArray(data.messages)) {
        return [];
    }

    return data.messages.map((m: any) => ({
        id: m._id || m.id,
        senderId: m.sender?.toString?.() || m.senderId,
        recipientId: m.recipient?.toString?.() || m.recipientId,
        content: m.content,
        createdAt: m.createdAt,
        readAt: m.readAt,
    }));
}

export function sendDirectMessage(toUserId: string, content: string): void {
    if (!socket) return;
    if (!content.trim()) return;

    socket.emit('dm:send', { toUserId, content });
}

