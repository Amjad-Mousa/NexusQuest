import api from './api';
import { getStoredToken } from './authService';

export interface UserStats {
    totalPoints: number;
    completedTasks: number;
    startedTasks: number;
    level: number;
    experience: number;
    nextLevelXP: number;
}

export interface LeaderboardEntry {
    userId: string;
    name: string;
    totalPoints: number;
    rank: number;
    avatarImage?: string;
}

export interface LeaderboardMe {
    rank: number;
    totalPoints: number;
    outOf: number;
}

export async function getUserStats(): Promise<UserStats> {
    try {
        const token = await getStoredToken();
        const response = await api.get('/api/auth/me', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (response.data.success && response.data.user) {
            const user = response.data.user;
            const totalPoints = user.totalPoints || 0;

            // Calculate level and XP (same formula as web)
            const level = Math.floor(totalPoints / 100) + 1;
            const experience = totalPoints % 100;
            const nextLevelXP = 100;

            return {
                totalPoints,
                completedTasks: 0, // Will be updated from task progress
                startedTasks: 0,
                level,
                experience,
                nextLevelXP,
            };
        }

        return {
            totalPoints: 0,
            completedTasks: 0,
            startedTasks: 0,
            level: 1,
            experience: 0,
            nextLevelXP: 100,
        };
    } catch (error) {
        console.error('Failed to get user stats:', error);
        return {
            totalPoints: 0,
            completedTasks: 0,
            startedTasks: 0,
            level: 1,
            experience: 0,
            nextLevelXP: 100,
        };
    }
}

export async function getMyLeaderboardRank(): Promise<LeaderboardMe | null> {
    try {
        const token = await getStoredToken();
        const response = await api.get('/api/auth/leaderboard/me', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (response.data.success && response.data.data) {
            return response.data.data as LeaderboardMe;
        }

        return null;
    } catch (error) {
        console.error('Failed to get leaderboard rank:', error);
        return null;
    }
}

export async function getTopLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
    try {
        const token = await getStoredToken();
        const response = await api.get(`/api/auth/leaderboard/top?limit=${limit}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (response.data.success && Array.isArray(response.data.data)) {
            return response.data.data as LeaderboardEntry[];
        }

        return [];
    } catch (error) {
        console.error('Failed to get leaderboard:', error);
        return [];
    }
}
