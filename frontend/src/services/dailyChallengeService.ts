import { getStoredToken } from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9876';

export interface DailyChallenge {
    title: string;
    description: string;
    language: 'python' | 'javascript';
    starterCode: string;
    testInput: string;
    expectedOutput: string;
    points: number;
    index: number;
}

export interface TodayChallengeResponse {
    challenge: DailyChallenge;
    completed: boolean;
    completedAt: string | null;
    date: string;
}

export interface SubmitResult {
    passed: boolean;
    output: string;
    expected?: string;
    error?: string | null;
    pointsAwarded?: number;
    message: string;
}

export interface DailyChallengeStats {
    totalCompleted: number;
    currentStreak: number;
    recentCompletions: Array<{
        date: string;
        challengeIndex: number;
    }>;
}

async function authFetch(url: string, options: RequestInit = {}) {
    const token = getStoredToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };
    return fetch(url, { ...options, headers });
}

export async function getTodayChallenge(): Promise<TodayChallengeResponse> {
    const res = await authFetch(`${API_URL}/api/daily-challenge/today`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
}

export async function getUserDailyChallengeStats(userId: string): Promise<DailyChallengeStats> {
    const res = await authFetch(`${API_URL}/api/daily-challenge/stats/${userId}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
}

export async function submitDailyChallenge(code: string): Promise<SubmitResult> {
    const res = await authFetch(`${API_URL}/api/daily-challenge/submit`, {
        method: 'POST',
        body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
}

export async function getDailyChallengeStats(): Promise<DailyChallengeStats> {
    const res = await authFetch(`${API_URL}/api/daily-challenge/stats`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
}
