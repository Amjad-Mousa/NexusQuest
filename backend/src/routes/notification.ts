import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { Notification } from '../models/Notification.js';

const router = Router();

// All notification routes require authentication
router.use(authMiddleware);

// Get all notifications for current user (newest first)
router.get('/all', async (req: AuthRequest, res: Response) => {
    try {
        const [notifications, unreadCount] = await Promise.all([
            Notification.find({ userId: req.userId }).sort({ createdAt: -1 }),
            Notification.countDocuments({ userId: req.userId, read: false }),
        ]);

        res.json({ success: true, data: notifications, unreadCount });
    } catch (error) {
        console.error('Failed to get notifications:', error);
        res.status(500).json({ success: false, error: 'Failed to get notifications' });
    }
});

// Get only unread notifications
router.get('/unread', async (req: AuthRequest, res: Response) => {
    try {
        const notifications = await Notification.find({
            userId: req.userId,
            read: false,
        }).sort({ createdAt: -1 });

        res.json({ success: true, data: notifications, count: notifications.length });
    } catch (error) {
        console.error('Failed to get unread notifications:', error);
        res.status(500).json({ success: false, error: 'Failed to get unread notifications' });
    }
});

// Create a notification for the current user
router.post('/create', async (req: AuthRequest, res: Response) => {
    try {
        const { type, message, relatedTask, metadata } = req.body;

        if (!type || !message) {
            return res.status(400).json({ success: false, error: 'type and message are required' });
        }

        const payload: any = {
            userId: req.userId,
            type,
            message,
            read: false,
        };

        if (relatedTask) {
            payload.relatedTask = relatedTask;
        }

        if (metadata) {
            payload.metadata = metadata;
        }

        const notification = await Notification.create(payload);

        res.json({ success: true, data: notification });
    } catch (error) {
        console.error('Failed to create notification:', error);
        res.status(500).json({ success: false, error: 'Failed to create notification' });
    }
});

// Mark a single notification as read
router.put('/read', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.body as { id?: string };

        if (!id) {
            return res.status(400).json({ success: false, error: 'Notification id is required' });
        }

        const notification = await Notification.findOneAndUpdate(
            { _id: id, userId: req.userId },
            { read: true, readAt: new Date() },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, error: 'Notification not found' });
        }

        res.json({ success: true, data: notification });
    } catch (error) {
        console.error('Failed to update notification:', error);
        res.status(500).json({ success: false, error: 'Failed to update notification' });
    }
});

// Mark a single notification as unread
router.put('/unread', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.body as { id?: string };

        if (!id) {
            return res.status(400).json({ success: false, error: 'Notification id is required' });
        }

        const notification = await Notification.findOneAndUpdate(
            { _id: id, userId: req.userId },
            { read: false, readAt: undefined },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, error: 'Notification not found' });
        }

        res.json({ success: true, data: notification });
    } catch (error) {
        console.error('Failed to update notification:', error);
        res.status(500).json({ success: false, error: 'Failed to update notification' });
    }
});

// Mark all notifications for current user as read
router.put('/read-all', async (req: AuthRequest, res: Response) => {
    try {
        const result = await Notification.updateMany(
            { userId: req.userId, read: false },
            { $set: { read: true, readAt: new Date() } }
        );

        res.json({ success: true, data: { modifiedCount: result.modifiedCount } });
    } catch (error) {
        console.error('Failed to mark all notifications as read:', error);
        res.status(500).json({ success: false, error: 'Failed to mark all notifications as read' });
    }
});

export default router;
