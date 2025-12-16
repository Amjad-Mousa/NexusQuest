import { getStoredToken } from './authService';
import { getApiUrl } from '../utils/apiHelpers';

const API_URL = getApiUrl();

export interface ChatUser {
    id: string;
    name: string;
    email: string;
    role: string;
    lastMessageAt?: string;
}

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarImage?: string | null;
    coverImage?: string | null;
    totalPoints?: number;
    createdAt?: string;
}

export interface LeaderboardMe {
    rank: number;
    totalUsers: number;
    totalPoints: number;
}
export interface LeaderboardUser extends LeaderboardMe { }

export interface LeaderboardEntry {
    id: string;
    name: string;
    email: string;
    totalPoints: number;
    rank: number;
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

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
    const token = getStoredToken();
    if (!token) return null;

    const response = await fetch(`${API_URL}/api/auth/users/${userId}`, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        return null;
    }

    const data = await response.json();
    if (!data.success || !data.user) {
        return null;
    }

    return data.user as UserProfile;
}

export async function getMyLeaderboardRank(): Promise<LeaderboardMe | null> {
    const token = getStoredToken();
    if (!token) return null;

    const response = await fetch(`${API_URL}/api/auth/leaderboard/me`, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        return null;
    }

    const data = await response.json();
    if (!data.success || !data.data) {
        return null;
    }

    return data.data as LeaderboardMe;
}

export async function getUserLeaderboardRank(userId: string): Promise<LeaderboardUser | null> {
    const token = getStoredToken();
    if (!token) return null;

    const response = await fetch(`${API_URL}/api/auth/leaderboard/user/${userId}`, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        return null;
    }

    const data = await response.json();
    if (!data.success || !data.data) {
        return null;
    }

    return data.data as LeaderboardUser;
}

export async function getTopLeaderboard(limit = 50, role?: 'user' | 'teacher'): Promise<LeaderboardEntry[]> {
    const token = getStoredToken();
    if (!token) return [];

    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (role) params.set('role', role);
    const url = `${API_URL}/api/auth/leaderboard/top?${params.toString()}`;
    const response = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        return [];
    }

    const data = await response.json();
    if (!data.success || !Array.isArray(data.data)) {
        return [];
    }

    return data.data as LeaderboardEntry[];
}
