// User-related utility functions

import { getStoredToken } from '../services/authService';
import { getApiUrl } from './apiHelpers';

/**
 * Fetch current user's avatar image
 */
export async function fetchUserAvatar(): Promise<string | null> {
    try {
        const token = getStoredToken();
        if (!token) return null;

        const response = await fetch(`${getApiUrl()}/api/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (data.success && data.user) {
            return data.user.avatarImage || null;
        }
        return null;
    } catch (error) {
        console.error('Failed to load user avatar:', error);
        return null;
    }
}

/**
 * Fetch current user data
 */
export async function fetchCurrentUser(): Promise<{
    avatarImage: string | null;
    totalPoints?: number;
} | null> {
    try {
        const token = getStoredToken();
        if (!token) return null;

        const response = await fetch(`${getApiUrl()}/api/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (data.success && data.user) {
            return {
                avatarImage: data.user.avatarImage || null,
                totalPoints: data.user.totalPoints
            };
        }
        return null;
    } catch (error) {
        console.error('Failed to load user data:', error);
        return null;
    }
}
