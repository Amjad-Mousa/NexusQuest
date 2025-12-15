// LocalStorage helper utilities

export const getUnreadMessages = (): Record<string, number> => {
    try {
        const raw = localStorage.getItem('nexusquest-unread-users');
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
};

export const setUnreadMessages = (unreadMap: Record<string, number>): void => {
    try {
        localStorage.setItem('nexusquest-unread-users', JSON.stringify(unreadMap));
    } catch (error) {
        console.error('Failed to save unread messages:', error);
    }
};

export const incrementUnreadCount = (userId: string): void => {
    try {
        const map = getUnreadMessages();
        map[userId] = (map[userId] || 0) + 1;
        setUnreadMessages(map);
    } catch (error) {
        console.error('Failed to increment unread count:', error);
    }
};

export const clearUnreadCount = (userId: string): void => {
    try {
        const map = getUnreadMessages();
        delete map[userId];
        setUnreadMessages(map);
    } catch (error) {
        console.error('Failed to clear unread count:', error);
    }
};
