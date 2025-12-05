import { Router } from 'express';
import mongoose from 'mongoose';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';

const router = Router();

router.get('/conversations', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const currentUserId = req.userId;

        if (!currentUserId) {
            res.status(401).json({
                success: false,
                error: 'Unauthorized',
            });
            return;
        }

        const currentObjectId = new mongoose.Types.ObjectId(currentUserId);

        const pipeline = [
            {
                $match: {
                    $or: [
                        { sender: currentObjectId },
                        { recipient: currentObjectId },
                    ],
                },
            },
            {
                $addFields: {
                    otherUserId: {
                        $cond: [
                            { $eq: ['$sender', currentObjectId] },
                            '$recipient',
                            '$sender',
                        ],
                    },
                },
            },
            {
                $group: {
                    _id: '$otherUserId',
                    lastMessageAt: { $max: '$createdAt' },
                },
            },
            { $sort: { lastMessageAt: -1 } },
        ];

        const results = await Message.aggregate(pipeline);
        const userIds = results.map((r) => r._id);

        const users = await User.find({ _id: { $in: userIds } }, {
            name: 1,
            email: 1,
            role: 1,
        }).lean();

        const usersById = new Map<string, any>();
        for (const u of users) {
            usersById.set(u._id.toString(), u);
        }

        const conversations = results
            .map((r) => {
                const u = usersById.get(r._id.toString());
                if (!u) return null;
                return {
                    id: u._id,
                    name: u.name,
                    email: u.email,
                    role: u.role,
                    lastMessageAt: r.lastMessageAt,
                };
            })
            .filter(Boolean);

        res.json({
            success: true,
            conversations,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to load conversations',
        });
    }
});

router.get('/:userId/messages', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const otherUserId = req.params.userId;
        const currentUserId = req.userId;

        if (!currentUserId) {
            res.status(401).json({
                success: false,
                error: 'Unauthorized',
            });
            return;
        }

        const messages = await Message.find({
            $or: [
                { sender: currentUserId, recipient: otherUserId },
                { sender: otherUserId, recipient: currentUserId },
            ],
        })
            .sort({ createdAt: 1 })
            .lean();

        res.json({
            success: true,
            messages,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to load messages',
        });
    }
});

export default router;

