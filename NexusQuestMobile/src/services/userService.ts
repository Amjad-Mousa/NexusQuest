import api from './api';
import { getStoredToken } from './authService';

export interface ChatUser {
    id: string;
    name: string;
    email: string;
    role: 'user' | 'teacher';
    avatarImage?: string;
}

export async function fetchUsers(): Promise<ChatUser[]> {
    try {
        const token = await getStoredToken();
        if (!token) return [];

        const response = await api.get('/api/auth/users', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (response.data.success && Array.isArray(response.data.users)) {
            return response.data.users as ChatUser[];
        }

        return [];
    } catch (error) {
        console.error('Failed to fetch users:', error);
        return [];
    }
}
