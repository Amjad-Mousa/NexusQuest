import { getStoredToken } from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9876';

export type QuizDifficulty = 'easy' | 'medium' | 'hard';
export type QuizLanguage = 'python' | 'javascript' | 'java' | 'cpp';
export type QuizStatus = 'scheduled' | 'active' | 'ended';

export interface TestCase {
    input: string;
    expectedOutput: string;
    isHidden: boolean;
}

export interface Quiz {
    _id: string;
    title: string;
    description: string;
    points: number;
    difficulty: QuizDifficulty;
    language: QuizLanguage;
    createdBy: {
        _id: string;
        name: string;
        email: string;
    };
    starterCode?: string;
    solution?: string;
    testCases?: TestCase[];
    startTime: string;
    endTime: string;
    duration: number;
    status: QuizStatus;
    submission?: QuizSubmissionInfo | null;
    createdAt: string;
    updatedAt: string;
}

export interface QuizSubmissionInfo {
    status: 'started' | 'submitted' | 'passed' | 'failed';
    score: number;
    totalTests: number;
    pointsAwarded: number;
    startedAt: string;
    submittedAt?: string;
}

export interface CreateQuizInput {
    title: string;
    description: string;
    points: number;
    difficulty: QuizDifficulty;
    language?: QuizLanguage;
    starterCode?: string;
    solution?: string;
    testCases: TestCase[];
    startTime: string;
    endTime: string;
    duration: number;
}

export interface QuizTestResult {
    index: number;
    passed: boolean;
    input: string;
    actualOutput: string;
    error?: string;
}

export interface QuizSubmitResponse {
    total: number;
    passed: number;
    results: QuizTestResult[];
    allPassed: boolean;
    pointsAwarded: number;
    submission: QuizSubmissionInfo;
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

export async function getQuizzes(): Promise<Quiz[]> {
    const res = await authFetch(`${API_URL}/api/quizzes`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
}

export async function getMyQuizzes(): Promise<Quiz[]> {
    const res = await authFetch(`${API_URL}/api/quizzes/my-quizzes`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
}

export async function getQuiz(id: string): Promise<Quiz> {
    const res = await authFetch(`${API_URL}/api/quizzes/${id}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
}

export async function createQuiz(input: CreateQuizInput): Promise<Quiz> {
    const res = await authFetch(`${API_URL}/api/quizzes`, {
        method: 'POST',
        body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
}

export async function updateQuiz(id: string, input: Partial<CreateQuizInput>): Promise<Quiz> {
    const res = await authFetch(`${API_URL}/api/quizzes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
}

export async function deleteQuiz(id: string): Promise<void> {
    const res = await authFetch(`${API_URL}/api/quizzes/${id}`, {
        method: 'DELETE',
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
}

export async function startQuiz(id: string): Promise<{ submission: QuizSubmissionInfo; alreadyStarted: boolean }> {
    const res = await authFetch(`${API_URL}/api/quizzes/${id}/start`, {
        method: 'POST',
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
}

export async function submitQuiz(id: string, code: string): Promise<QuizSubmitResponse> {
    const res = await authFetch(`${API_URL}/api/quizzes/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
}

export async function getQuizResults(id: string): Promise<{
    quiz: { _id: string; title: string; totalTests: number; points: number };
    submissions: Array<{
        user: { _id: string; name: string; email: string };
        status: string;
        score: number;
        totalTests: number;
        pointsAwarded: number;
        startedAt: string;
        submittedAt?: string;
    }>;
}> {
    const res = await authFetch(`${API_URL}/api/quizzes/${id}/results`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
}
