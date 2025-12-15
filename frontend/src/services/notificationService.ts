import { getStoredToken } from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9876';

export type NotificationType =
    | 'task_completed'
    | 'points_earned'
    | 'grade_updated'
    | 'reminder'
    | 'new_quiz'
    | 'collaboration_invite';

export interface NotificationItem {
    _id: string;
    userId: string;
    type: NotificationType;
    message: string;
    relatedTask?: string;
    metadata?: Record<string, any>;
    read: boolean;
    createdAt: string;
    updatedAt: string;
    readAt?: string;
}

export interface AllNotificationsResponse {
    items: NotificationItem[];
    unreadCount: number;
}

export interface UnreadNotificationsResponse {
    items: NotificationItem[];
    count: number;
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

export async function getAllNotifications(): Promise<AllNotificationsResponse> {
    const res = await authFetch(`${API_URL}/api/notifications/all`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to load notifications');
    return {
        items: data.data as NotificationItem[],
        unreadCount: data.unreadCount ?? 0,
    };
}

export async function getUnreadNotifications(): Promise<UnreadNotificationsResponse> {
    const res = await authFetch(`${API_URL}/api/notifications/unread`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to load unread notifications');
    return {
        items: data.data as NotificationItem[],
        count: data.count ?? (Array.isArray(data.data) ? data.data.length : 0),
    };
}

export async function createNotification(input: {
    type: NotificationType;
    message: string;
    relatedTask?: string;
    metadata?: Record<string, any>;
}): Promise<NotificationItem> {
    const res = await authFetch(`${API_URL}/api/notifications/create`, {
        method: 'POST',
        body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to create notification');
    return data.data;
}

export async function markNotificationRead(id: string): Promise<NotificationItem> {
    const res = await authFetch(`${API_URL}/api/notifications/read`, {
        method: 'PUT',
        body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to mark notification as read');
    return data.data;
}

export async function markNotificationUnread(id: string): Promise<NotificationItem> {
    const res = await authFetch(`${API_URL}/api/notifications/unread`, {
        method: 'PUT',
        body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to mark notification as unread');
    return data.data;
}

export async function markAllNotificationsRead(): Promise<number> {
    const res = await authFetch(`${API_URL}/api/notifications/read-all`, {
        method: 'PUT',
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to mark all notifications as read');
    return data.data.modifiedCount ?? 0;
}
