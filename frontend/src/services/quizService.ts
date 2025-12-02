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

export interface StudentInfo {
    _id: string;
    name: string;
    email: string;
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
    assignedTo?: StudentInfo[]; // Empty array = all students
    status: QuizStatus;
    submission?: QuizSubmissionInfo | null;
    createdAt: string;
    updatedAt: string;
}

export interface QuizSubmissionInfo {
    status: 'started' | 'submitted' | 'passed';
    score: number;
    totalTests: number;
    pointsAwarded: number;
    startedAt: string;
    submittedAt?: string;
    teacherGrade?: number;
    teacherFeedback?: string;
    gradedAt?: string;
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
    assignedTo?: string[]; // Array of student IDs
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
    canRetry?: boolean;
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

export async function getStudentsList(): Promise<StudentInfo[]> {
    const res = await authFetch(`${API_URL}/api/quizzes/students/list`);
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

export interface QuizSubmissionDetail {
    _id: string | null;
    user: { _id: string; name: string; email: string };
    code: string;
    status: string;
    score: number;
    totalTests: number;
    pointsAwarded: number;
    startedAt: string | null;
    submittedAt?: string | null;
    teacherGrade?: number;
    attempted?: boolean;
    teacherFeedback?: string;
    gradedAt?: string;
    gradedBy?: { _id: string; name: string };
}

export interface QuizResultsResponse {
    quiz: {
        _id: string;
        title: string;
        description: string;
        language: string;
        totalTests: number;
        points: number;
    };
    submissions: QuizSubmissionDetail[];
}

export async function getQuizResults(id: string): Promise<QuizResultsResponse> {
    const res = await authFetch(`${API_URL}/api/quizzes/${id}/results`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
}

export async function gradeSubmission(
    quizId: string,
    submissionId: string,
    grade: number,
    feedback: string
): Promise<{
    submission: {
        _id: string;
        teacherGrade: number;
        teacherFeedback: string;
        gradedAt: string;
        pointsAwarded: number;
        previousPoints: number;
        pointsDiff: number;
    };
    message: string;
}> {
    const res = await authFetch(`${API_URL}/api/quizzes/${quizId}/submission/${submissionId}/grade`, {
        method: 'POST',
        body: JSON.stringify({ grade, feedback }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
}

// Grade a student who didn't attempt (by user ID)
export async function gradeStudentByUserId(
    quizId: string,
    userId: string,
    grade: number,
    feedback: string
): Promise<{
    submission: {
        _id: string;
        teacherGrade: number;
        teacherFeedback: string;
        gradedAt: string;
        pointsAwarded: number;
    };
    message: string;
}> {
    const res = await authFetch(`${API_URL}/api/quizzes/${quizId}/grade-student/${userId}`, {
        method: 'POST',
        body: JSON.stringify({ grade, feedback }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
}
