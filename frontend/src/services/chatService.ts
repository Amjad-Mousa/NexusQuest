import { io, Socket } from 'socket.io-client';
import { getStoredToken } from './authService';
import { getApiUrl } from '../utils/apiHelpers';

const API_URL = getApiUrl();

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

    // Reuse existing socket if present; ensure it's connected
    if (socket) {
        if (!socket.connected) {
            try { socket.connect(); } catch {}
        }
        return socket;
    }

    const SOCKET_ORIGIN = new URL(API_URL).origin;
    socket = io(SOCKET_ORIGIN + '/chat', {
        path: '/nexusquest/socket.io',
        auth: { token },
        withCredentials: true,
        transports: ['polling', 'websocket'], // polling first for better compatibility
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        autoConnect: false, // explicitly control connection
        forceNew: true, // do not share manager/engine with other namespaces
    });

    // Explicitly connect only when ChatPage mounts
    socket.connect();

    // Add connection logging
    socket.on('connect', () => {
        console.log('Chat socket connected:', socket?.id);
    });

    socket.on('connect_error', (error) => {
        console.error('Chat socket connection error:', error.message);
    });

    socket.on('disconnect', (reason) => {
        console.log('Chat socket disconnected:', reason);
    });

    return socket;
}

export function getChatSocket(): Socket | null {
    return socket;
}

export function disconnectChat(): void {
    if (socket) {
        try {
            // prevent reconnection attempts and clear listeners
            const mgr = (socket as any).io;
            if (mgr && mgr.opts) {
                mgr.opts.reconnection = false;
                mgr.backoff && typeof mgr.backoff.reset === 'function' && mgr.backoff.reset();
            }
            socket.off();
            // removeAllListeners for compatibility with event emitter
            // @ts-ignore
            if (typeof (socket as any).removeAllListeners === 'function') {
                (socket as any).removeAllListeners();
            }
            // close namespace and underlying engine
            socket.disconnect();
            if (typeof (socket as any).close === 'function') {
                (socket as any).close();
            }
            // also close manager engine and remove all sockets to force teardown
            if (mgr) {
                try {
                    mgr.removeAllListeners && mgr.removeAllListeners();
                    // close engine if open
                    mgr.engine && typeof mgr.engine.close === 'function' && mgr.engine.close();
                } catch {}
            }
        } finally {
            socket = null;
        }
    }
}

export async function fetchConversation(otherUserId: string): Promise<ChatMessage[]> {
    const token = getStoredToken();
    if (!token) return [];

    try {
        const response = await fetch(`${API_URL}/api/chat/${otherUserId}/messages`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            console.error('Failed to fetch conversation:', response.status);
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
    } catch (error) {
        console.error('Error fetching conversation:', error);
        return [];
    }
}

export function sendDirectMessage(toUserId: string, content: string): void {
    if (!socket) {
        console.error('Socket not connected. Call connectChat() first.');
        return;
    }
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
