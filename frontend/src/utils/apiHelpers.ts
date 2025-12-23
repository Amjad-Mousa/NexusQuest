// API request utilities

import { getStoredToken } from '../services/authService';

/**
 * Get standard authentication headers for API requests
 */
export function getAuthHeaders(): HeadersInit {
    const token = getStoredToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

/**
 * Get API URL from environment or use default
 */
export function getApiUrl(): string {
    return import.meta.env.VITE_API_URL || 'https://muhjah.com/nexusquest';
}

/**
 * Make an authenticated API request
 */
export async function apiRequest<T>(
    endpoint: string,
    options?: RequestInit
): Promise<T> {
    const url = `${getApiUrl()}${endpoint}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            ...getAuthHeaders(),
            ...options?.headers,
        },
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
    }

    return data;
}

/**
 * Handle API response with standard error handling
 */
export async function handleApiResponse<T>(
    response: Response
): Promise<T> {
    const data = await response.json();

    if (!data.success) {
        throw new Error(data.error || 'Request failed');
    }

    return data;
}
