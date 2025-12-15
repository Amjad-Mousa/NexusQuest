import express from 'express';
import { CollaborationSession } from '../models/CollaborationSession.js';
import { CollaborationMessage } from '../models/CollaborationMessage.js';
import { authMiddleware } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { NotificationType } from '../enums/NotificationType.js';

const authenticateToken = authMiddleware;

const router = express.Router();

// Generate unique session ID
function generateSessionId(): string {
  return Math.random().toString(36).substring(2, 10);
}

// Create a new collaboration session
router.post('/sessions', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      description,
      language = 'javascript',
      isPublic = false,
      maxParticipants = 10,
      settings = {},
    } = req.body;

    const sessionId = generateSessionId();

    const authUser = (req as any).user;
    const userId = (req as any).userId || authUser?._id?.toString();
    const username = authUser?.name || authUser?.email || 'User';

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const session = await CollaborationSession.create({
      sessionId,
      name,
      description,
      owner: userId,
      language,
      isPublic,
      maxParticipants,
      settings: {
        allowChat: settings.allowChat !== false,
        allowVoice: settings.allowVoice || false,
        allowEdit: settings.allowEdit !== false,
        autoSave: settings.autoSave !== false,
      },
      participants: [
        {
          userId,
          username,
          role: 'owner',
          joinedAt: new Date(),
          isActive: true,
          color: '#FF6B6B',
        },
      ],
    });

    res.status(201).json({
      success: true,
      session: {
        sessionId: session.sessionId,
        name: session.name,
        description: session.description,
        language: session.language,
        isPublic: session.isPublic,
        maxParticipants: session.maxParticipants,
        settings: session.settings,
        owner: session.owner,
        createdAt: session.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating collaboration session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create collaboration session',
    });
  }
});

// Get session details
router.get('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await CollaborationSession.findOne({
      sessionId,
      isActive: true,
    }).populate('owner', 'username email');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Check if user has access
    const userId = (req as any).userId || (req as any).user?._id?.toString();
    const isParticipant = session.participants.some(
      p => p.userId.toString() === userId
    );
    const isOwner = session.owner.toString() === userId;

    if (!session.isPublic && !isParticipant && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    res.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        name: session.name,
        description: session.description,
        owner: session.owner,
        participants: session.participants.filter(p => p.isActive),
        code: session.code,
        language: session.language,
        isPublic: session.isPublic,
        maxParticipants: session.maxParticipants,
        settings: session.settings,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
      },
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch session',
    });
  }
});

// Get user's sessions
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId || (req as any).user?._id?.toString();
    const { active = 'true' } = req.query;

    const query: any = {
      $or: [
        { owner: userId },
        { 'participants.userId': userId },
      ],
    };

    if (active === 'true') {
      query.isActive = true;
    }

    const sessions = await CollaborationSession.find(query)
      .populate('owner', 'username email')
      .sort({ lastActivity: -1 })
      .limit(50);

    res.json({
      success: true,
      sessions: sessions.map(session => ({
        sessionId: session.sessionId,
        name: session.name,
        description: session.description,
        owner: session.owner,
        participantCount: session.participants.filter(p => p.isActive).length,
        language: session.language,
        isPublic: session.isPublic,
        maxParticipants: session.maxParticipants,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
      })),
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sessions',
    });
  }
});

// Get public sessions
router.get('/public-sessions', async (req, res) => {
  try {
    const sessions = await CollaborationSession.find({
      isPublic: true,
      isActive: true,
    })
      .populate('owner', 'username')
      .sort({ lastActivity: -1 })
      .limit(20);

    res.json({
      success: true,
      sessions: sessions.map(session => ({
        sessionId: session.sessionId,
        name: session.name,
        description: session.description,
        owner: session.owner,
        participantCount: session.participants.filter(p => p.isActive).length,
        language: session.language,
        maxParticipants: session.maxParticipants,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
      })),
    });
  } catch (error) {
    console.error('Error fetching public sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch public sessions',
    });
  }
});

// Update session settings
router.patch('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = (req as any).user.userId;

    const session = await CollaborationSession.findOne({
      sessionId,
      isActive: true,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Only owner can update settings
    if (session.owner.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only owner can update session settings',
      });
    }

    const { name, description, isPublic, maxParticipants, settings } = req.body;

    if (name) session.name = name;
    if (description !== undefined) session.description = description;
    if (isPublic !== undefined) session.isPublic = isPublic;
    if (maxParticipants) session.maxParticipants = maxParticipants;
    if (settings) {
      session.settings = { ...session.settings, ...settings };
    }

    await session.save();

    res.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        name: session.name,
        description: session.description,
        isPublic: session.isPublic,
        maxParticipants: session.maxParticipants,
        settings: session.settings,
      },
    });
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update session',
    });
  }
});

// End session
router.delete('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = (req as any).user.userId;

    const session = await CollaborationSession.findOne({
      sessionId,
      isActive: true,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Only owner can end session
    if (session.owner.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only owner can end session',
      });
    }

    session.isActive = false;
    await session.save();

    res.json({
      success: true,
      message: 'Session ended successfully',
    });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end session',
    });
  }
});

// Get session messages
router.get('/sessions/:sessionId/messages', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 50, before } = req.query;

    const query: any = { sessionId };
    if (before) {
      query.createdAt = { $lt: new Date(before as string) };
    }

    const messages = await CollaborationMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json({
      success: true,
      messages: messages.reverse(),
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
    });
  }
});

// Update participant role
router.patch('/sessions/:sessionId/participants/:userId', authenticateToken, async (req, res) => {
  try {
    const { sessionId, userId: targetUserId } = req.params;
    const { role } = req.body;
    const userId = (req as any).user.userId;

    const session = await CollaborationSession.findOne({
      sessionId,
      isActive: true,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Only owner can change roles
    if (session.owner.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only owner can change participant roles',
      });
    }

    const participant = session.participants.find(
      p => p.userId.toString() === targetUserId
    );

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found',
      });
    }

    participant.role = role;
    await session.save();

    res.json({
      success: true,
      message: 'Participant role updated',
    });
  } catch (error) {
    console.error('Error updating participant role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update participant role',
    });
  }
});

// Remove participant
router.delete('/sessions/:sessionId/participants/:userId', authenticateToken, async (req, res) => {
  try {
    const { sessionId, userId: targetUserId } = req.params;
    const userId = (req as any).user.userId;

    const session = await CollaborationSession.findOne({
      sessionId,
      isActive: true,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Only owner can remove participants
    if (session.owner.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only owner can remove participants',
      });
    }

    const participant = session.participants.find(
      p => p.userId.toString() === targetUserId
    );

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found',
      });
    }

    participant.isActive = false;
    await session.save();

    res.json({
      success: true,
      message: 'Participant removed',
    });
  } catch (error) {
    console.error('Error removing participant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove participant',
    });
  }
});

// Get all users for invite (excluding current user and already invited/participants)
router.get('/sessions/:sessionId/available-users', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = (req as any).userId || (req as any).user?._id?.toString();

    const session = await CollaborationSession.findOne({
      sessionId,
      isActive: true,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Only owner can invite
    if (session.owner.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only session owner can invite users',
      });
    }

    // Get participant user IDs
    const participantIds = session.participants.map(p => p.userId.toString());

    // Get pending invitations for this session
    const pendingInvites = await Notification.find({
      type: NotificationType.COLLABORATION_INVITE,
      read: false,
      'metadata.sessionId': sessionId,
    });
    const pendingUserIds = pendingInvites.map(n => n.userId.toString());

    // Get all users except current user, participants, and pending invites
    const excludeIds = [userId, ...participantIds, ...pendingUserIds];
    const users = await User.find({
      _id: { $nin: excludeIds },
    }).select('_id name email avatarImage level');

    res.json({
      success: true,
      users: users.map(u => ({
        id: u._id,
        name: u.name,
        email: u.email,
        avatarImage: u.avatarImage,
        level: u.level,
      })),
    });
  } catch (error) {
    console.error('Error fetching available users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
    });
  }
});

// Send invitation to users
router.post('/sessions/:sessionId/invite', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userIds } = req.body; // Array of user IDs to invite
    const userId = (req as any).userId || (req as any).user?._id?.toString();
    const inviterName = (req as any).user?.name || 'Someone';

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one user to invite',
      });
    }

    const session = await CollaborationSession.findOne({
      sessionId,
      isActive: true,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Only owner can invite
    if (session.owner.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only session owner can invite users',
      });
    }

    // Create notifications for each invited user
    const notifications = await Promise.all(
      userIds.map(async (targetUserId: string) => {
        return Notification.create({
          userId: targetUserId,
          type: NotificationType.COLLABORATION_INVITE,
          message: `${inviterName} invited you to join "${session.name}" collaboration session`,
          metadata: {
            sessionId: session.sessionId,
            sessionName: session.name,
            inviterId: userId,
            inviterName: inviterName,
          },
        });
      })
    );

    res.json({
      success: true,
      message: `Invitation sent to ${notifications.length} user(s)`,
      invitedCount: notifications.length,
    });
  } catch (error) {
    console.error('Error sending invitations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send invitations',
    });
  }
});

// Accept invitation
router.post('/sessions/:sessionId/accept-invite', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { notificationId } = req.body;
    const userId = (req as any).userId || (req as any).user?._id?.toString();
    const username = (req as any).user?.name || 'User';

    const session = await CollaborationSession.findOne({
      sessionId,
      isActive: true,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found or no longer active',
      });
    }

    // Check if session is full
    const activeParticipants = session.participants.filter(p => p.isActive);
    if (activeParticipants.length >= session.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: 'Session is full',
      });
    }

    // Mark notification as read
    if (notificationId) {
      await Notification.findByIdAndUpdate(notificationId, {
        read: true,
        readAt: new Date(),
      });
    }

    res.json({
      success: true,
      message: 'Invitation accepted',
      sessionId: session.sessionId,
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept invitation',
    });
  }
});

// Reject invitation
router.post('/sessions/:sessionId/reject-invite', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { notificationId } = req.body;

    // Mark notification as read (rejected)
    if (notificationId) {
      await Notification.findByIdAndUpdate(notificationId, {
        read: true,
        readAt: new Date(),
        'metadata.rejected': true,
      });
    }

    res.json({
      success: true,
      message: 'Invitation rejected',
    });
  } catch (error) {
    console.error('Error rejecting invitation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject invitation',
    });
  }
});

export default router;
