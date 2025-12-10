import express from 'express';
import { CollaborationSession } from '../models/CollaborationSession.js';
import { CollaborationMessage } from '../models/CollaborationMessage.js';
import { authMiddleware } from '../middleware/auth.js';

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

export default router;
