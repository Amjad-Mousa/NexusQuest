import api from './api';

export interface Notification {
  _id: string;
  userId: string;
  type: 'quiz_completed' | 'task_assigned' | 'achievement' | 'message' | 'system' | 'forum_answer' | 'forum_accepted';
  message: string;
  read: boolean;
  readAt?: string;
  relatedTask?: string;
  metadata?: {
    quizId?: string;
    taskId?: string;
    questionId?: string;
    answerId?: string;
    points?: number;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsResponse {
  success: boolean;
  data: Notification[];
  unreadCount: number;
}

export interface UnreadNotificationsResponse {
  success: boolean;
  data: Notification[];
  count: number;
}

// Get all notifications
export const getAllNotifications = async (): Promise<NotificationsResponse> => {
  try {
    const response = await api.get('/api/notifications/all');
    return response.data;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return { success: false, data: [], unreadCount: 0 };
  }
};

// Get unread notifications
export const getUnreadNotifications = async (): Promise<UnreadNotificationsResponse> => {
  try {
    const response = await api.get('/api/notifications/unread');
    return response.data;
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    return { success: false, data: [], count: 0 };
  }
};

// Mark notification as read
export const markAsRead = async (id: string): Promise<{ success: boolean }> => {
  try {
    const response = await api.put('/api/notifications/read', { id });
    return response.data;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { success: false };
  }
};

// Mark notification as unread
export const markAsUnread = async (id: string): Promise<{ success: boolean }> => {
  try {
    const response = await api.put('/api/notifications/unread', { id });
    return response.data;
  } catch (error) {
    console.error('Error marking notification as unread:', error);
    return { success: false };
  }
};

// Mark all notifications as read
export const markAllAsRead = async (): Promise<{ success: boolean; modifiedCount?: number }> => {
  try {
    const response = await api.put('/api/notifications/read-all');
    return { success: true, modifiedCount: response.data.data?.modifiedCount };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return { success: false };
  }
};

// Get notification icon based on type
export const getNotificationIcon = (type: Notification['type']): string => {
  switch (type) {
    case 'quiz_completed':
      return '📝';
    case 'task_assigned':
      return '📋';
    case 'achievement':
      return '🏆';
    case 'message':
      return '💬';
    case 'forum_answer':
      return '💡';
    case 'forum_accepted':
      return '✅';
    case 'system':
    default:
      return '🔔';
  }
};

// Get notification color based on type
export const getNotificationColor = (type: Notification['type']): string => {
  switch (type) {
    case 'quiz_completed':
      return '#4CAF50';
    case 'task_assigned':
      return '#2196F3';
    case 'achievement':
      return '#FFD700';
    case 'message':
      return '#9C27B0';
    case 'forum_answer':
      return '#FF9800';
    case 'forum_accepted':
      return '#00BCD4';
    case 'system':
    default:
      return '#607D8B';
  }
};
