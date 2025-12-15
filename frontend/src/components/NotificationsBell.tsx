import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, X, Users } from 'lucide-react';
import type { Theme } from '../types';
import {
    getAllNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    type NotificationItem,
    type AllNotificationsResponse,
} from '../services/notificationService';
import { collaborationService } from '../services/collaborationService';

interface NotificationsBellProps {
    theme: Theme;
}

export function NotificationsBell({ theme }: NotificationsBellProps) {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [processingInvite, setProcessingInvite] = useState<string | null>(null);

    useEffect(() => {
        loadNotifications();
    }, []);

    async function loadNotifications() {
        try {
            setLoading(true);
            const res: AllNotificationsResponse = await getAllNotifications();
            setNotifications(res.items);
            setUnreadCount(res.unreadCount);
        } catch (error) {
            console.error('Failed to load notifications:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleMarkRead(id: string) {
        try {
            const updated = await markNotificationRead(id);
            setNotifications(prev => prev.map(n => (n._id === id ? updated : n)));
            setUnreadCount(prev => (prev > 0 ? prev - 1 : 0));
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    }

    async function handleMarkAllRead() {
        try {
            await markAllNotificationsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true, readAt: new Date().toISOString() })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
        }
    }

    async function handleAcceptInvite(notification: NotificationItem) {
        const sessionId = notification.metadata?.sessionId;
        if (!sessionId) return;
        
        setProcessingInvite(notification._id);
        try {
            await collaborationService.acceptInvitation(sessionId, notification._id);
            // Mark as read
            setNotifications(prev => prev.map(n => 
                n._id === notification._id ? { ...n, read: true, readAt: new Date().toISOString() } : n
            ));
            setUnreadCount(prev => (prev > 0 ? prev - 1 : 0));
            setOpen(false);
            // Navigate to the collaboration session
            navigate(`/collaboration/${sessionId}`);
        } catch (error) {
            console.error('Failed to accept invitation:', error);
            alert('Failed to accept invitation. The session may no longer be available.');
        } finally {
            setProcessingInvite(null);
        }
    }

    async function handleRejectInvite(notification: NotificationItem) {
        const sessionId = notification.metadata?.sessionId;
        if (!sessionId) return;
        
        setProcessingInvite(notification._id);
        try {
            await collaborationService.rejectInvitation(sessionId, notification._id);
            // Mark as read and remove from list
            setNotifications(prev => prev.filter(n => n._id !== notification._id));
            setUnreadCount(prev => (prev > 0 ? prev - 1 : 0));
        } catch (error) {
            console.error('Failed to reject invitation:', error);
        } finally {
            setProcessingInvite(null);
        }
    }

    const containerBg = theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200';
    const textMuted = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={`relative p-1 rounded-full border ${
                    theme === 'dark'
                        ? 'border-gray-700 hover:bg-gray-800 text-gray-300'
                        : 'border-gray-200 hover:bg-gray-100 text-gray-700'
                } transition-colors`}
                aria-label="Notifications"
            >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">
                        {unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div
                    className={`absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto border rounded-xl shadow-lg z-40 ${containerBg}`}
                >
                    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700/40">
                        <span className="text-xs font-semibold">Notifications</span>
                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={handleMarkAllRead}
                                className="text-[10px] text-blue-400 hover:underline"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className="text-[11px]">
                        {loading && (
                            <div className={`px-3 py-2 ${textMuted}`}>Loading...</div>
                        )}

                        {!loading && notifications.length === 0 && (
                            <div className={`px-3 py-2 ${textMuted}`}>No notifications yet</div>
                        )}

                        {!loading && notifications.length > 0 && (
                            <ul>
                                {notifications.map((n) => (
                                    <li
                                        key={n._id}
                                        className={`px-3 py-2 border-t border-gray-800/40 ${
                                            n.read ? 'opacity-70' : 'bg-blue-500/5'
                                        } ${n.type !== 'collaboration_invite' ? 'cursor-pointer' : ''}`}
                                        onClick={() => {
                                            if (!n.read && n.type !== 'collaboration_invite') {
                                                handleMarkRead(n._id);
                                            }
                                        }}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                                {n.type === 'collaboration_invite' && (
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <Users className="w-3 h-3 text-blue-400" />
                                                        <span className="text-[10px] text-blue-400 font-medium">Collaboration Invite</span>
                                                    </div>
                                                )}
                                                <div className="text-xs font-medium">{n.message}</div>
                                                <div className={`text-[10px] ${textMuted}`}>
                                                    {new Date(n.createdAt).toLocaleString()}
                                                </div>
                                                
                                                {/* Accept/Reject buttons for collaboration invites */}
                                                {n.type === 'collaboration_invite' && !n.read && (
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleAcceptInvite(n);
                                                            }}
                                                            disabled={processingInvite === n._id}
                                                            className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors text-[10px] font-medium disabled:opacity-50"
                                                        >
                                                            <Check className="w-3 h-3" />
                                                            Accept
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRejectInvite(n);
                                                            }}
                                                            disabled={processingInvite === n._id}
                                                            className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-[10px] font-medium disabled:opacity-50"
                                                        >
                                                            <X className="w-3 h-3" />
                                                            Reject
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            {!n.read && n.type !== 'collaboration_invite' && (
                                                <span className="mt-0.5 inline-flex items-center rounded-full bg-blue-500/20 text-blue-400 text-[10px] px-2 py-0.5">
                                                    New
                                                </span>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
