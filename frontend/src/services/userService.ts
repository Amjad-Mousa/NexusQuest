import { getStoredToken } from './authService';

const API_URL = 'http://localhost:9876';

export interface ChatUser {
    id: string;
    name: string;
    email: string;
    role: string;
    lastMessageAt?: string;
}

export async function fetchUsers(): Promise<ChatUser[]> {
    const token = getStoredToken();
    if (!token) return [];

    const response = await fetch(`${API_URL}/api/auth/users`, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        return [];
    }

    const data = await response.json();
    if (!data.success || !Array.isArray(data.users)) {
        return [];
    }

    return data.users as ChatUser[];
}

export async function fetchConversations(): Promise<ChatUser[]> {
    const token = getStoredToken();
    if (!token) return [];

    const response = await fetch(`${API_URL}/api/chat/conversations`, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        return [];
    }

    const data = await response.json();
    if (!data.success || !Array.isArray(data.conversations)) {
        return [];
    }

    return data.conversations as ChatUser[];
}

