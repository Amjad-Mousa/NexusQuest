import express, { Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';
import UserSkill from '../models/UserSkill.js';
import Achievement from '../models/Achievement.js';

const router = express.Router();

// XP required for each level (exponential growth)
const getXPForLevel = (level: number): number => {
    return Math.floor(100 * Math.pow(1.5, level - 1));
};

// Calculate level from total XP
const calculateLevel = (totalXP: number): number => {
    let level = 1;
    let xpNeeded = 0;

    while (xpNeeded <= totalXP) {
        xpNeeded += getXPForLevel(level);
        if (xpNeeded <= totalXP) {
            level++;
        }
    }

    return level;
};

/**
 * GET /api/gamification/profile
 * Get user's gamification profile (XP, level, skills, achievements)
 * Respects privacy settings - only shows public profiles to other users
 */
router.get('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;
        const { targetUserId } = req.query;

        // If viewing another user's profile, check privacy settings
        const viewingUserId = targetUserId ? targetUserId.toString() : userId;
        const isOwnProfile = viewingUserId === userId;

        const user = await User.findById(viewingUserId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }

        // Check privacy settings - if profile is private and not own profile, return limited info
        if (!user.isPublic && !isOwnProfile) {
            return res.status(403).json({
                success: false,
                error: 'This profile is private',
                profile: {
                    name: user.name,
                    isPublic: false,
                },
            });
        }

        const skills = await UserSkill.find({ userId: viewingUserId }).sort({ totalXp: -1 });
        const achievements = await Achievement.find({ userId: viewingUserId }).sort({ unlockedAt: -1 });

        // Calculate current level progress
        const currentLevel = user.level;
        const xpForCurrentLevel = getXPForLevel(currentLevel);
        const xpForNextLevel = getXPForLevel(currentLevel + 1);
        const xpProgress = user.xp;
        const xpNeeded = xpForNextLevel;

        res.json({
            success: true,
            profile: {
                name: user.name,
                xp: user.xp,
                totalXp: user.xp,
                level: user.level,
                xpProgress,
                xpNeeded,
                xpPercentage: Math.floor((xpProgress / xpNeeded) * 100),
                isPublic: user.isPublic,
                customSkills: user.customSkills || [],
                skills: skills.map(skill => ({
                    name: skill.skillName,
                    level: skill.level,
                    xp: skill.xp,
                    totalXp: skill.totalXp,
                    category: skill.category,
                })),
                achievements: achievements.map(ach => ({
                    id: ach.achievementId,
                    title: ach.title,
                    description: ach.description,
                    icon: ach.icon,
                    category: ach.category,
                    unlockedAt: ach.unlockedAt,
                    progress: ach.progress,
                    maxProgress: ach.maxProgress,
                })),
                totalAchievements: achievements.length,
            },
        });
    } catch (error) {
        console.error('Error fetching gamification profile:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch gamification profile',
        });
    }
});

/**
 * POST /api/gamification/award-xp
 * Award XP to user (internal use - called when completing tasks/quizzes)
 */
router.post('/award-xp', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;
        const { amount, skillName, category } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid XP amount',
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }

        // Award XP to user
        user.xp += amount;

        // Check for level up
        const newLevel = calculateLevel(user.xp);
        const leveledUp = newLevel > user.level;

        if (leveledUp) {
            user.level = newLevel;
        }

        await user.save();

        // Award skill XP if specified
        let skill = null;
        if (skillName && category) {
            skill = await UserSkill.findOne({ userId, skillName });

            if (!skill) {
                skill = new UserSkill({
                    userId,
                    skillName,
                    category,
                    xp: amount,
                    totalXp: amount,
                    level: 1,
                });
            } else {
                skill.xp += amount;
                skill.totalXp += amount;
                skill.level = calculateLevel(skill.totalXp);
            }

            await skill.save();
        }

        res.json({
            success: true,
            leveledUp,
            newLevel: user.level,
            totalXp: user.xp,
            skill: skill ? {
                name: skill.skillName,
                level: skill.level,
                xp: skill.xp,
            } : null,
        });
    } catch (error) {
        console.error('Error awarding XP:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to award XP',
        });
    }
});

/**
 * POST /api/gamification/unlock-achievement
 * Unlock an achievement for a user
 */
router.post('/unlock-achievement', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;
        const { achievementId, title, description, icon, category } = req.body;

        if (!achievementId || !title || !description || !icon || !category) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
            });
        }

        // Check if already unlocked
        const existing = await Achievement.findOne({ userId, achievementId });
        if (existing) {
            return res.json({
                success: true,
                alreadyUnlocked: true,
                achievement: existing,
            });
        }

        const achievement = new Achievement({
            userId,
            achievementId,
            title,
            description,
            icon,
            category,
        });

        await achievement.save();

        res.json({
            success: true,
            alreadyUnlocked: false,
            achievement,
        });
    } catch (error) {
        console.error('Error unlocking achievement:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to unlock achievement',
        });
    }
});

/**
 * GET /api/gamification/available-achievements
 * Get list of all available achievements
 */
router.get('/available-achievements', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const achievements = [
            { id: 'first_task', title: 'First Steps', description: 'Complete your first task', icon: '🎯', category: 'tasks', requirement: 1, hidden: false },
            { id: 'task_master_5', title: 'Task Master', description: 'Complete 5 tasks', icon: '⭐', category: 'tasks', requirement: 5, hidden: false },
            { id: 'task_legend_10', title: 'Task Legend', description: 'Complete 10 tasks', icon: '🏆', category: 'tasks', requirement: 10, hidden: false },
            { id: 'first_project', title: 'Project Pioneer', description: 'Create your first project', icon: '🚀', category: 'projects', requirement: 1, hidden: false },
            { id: 'project_creator_5', title: 'Project Creator', description: 'Create 5 projects', icon: '📁', category: 'projects', requirement: 5, hidden: true },
            { id: 'project_master_10', title: 'Project Master', description: 'Create 10 projects', icon: '🗂️', category: 'projects', requirement: 10, hidden: true },
            { id: 'polyglot', title: 'Polyglot Programmer', description: 'Create a project in all available languages', icon: '🌐', category: 'special', requirement: 4, hidden: true },
            { id: 'first_quiz', title: 'Quiz Beginner', description: 'Complete your first quiz', icon: '📝', category: 'quizzes', requirement: 1, hidden: false },
            { id: 'quiz_expert_5', title: 'Quiz Expert', description: 'Complete 5 quizzes', icon: '🎓', category: 'quizzes', requirement: 5, hidden: true },
            { id: 'streak_3', title: 'On Fire!', description: '3 day streak', icon: '🔥', category: 'streak', requirement: 3, hidden: true },
            { id: 'streak_7', title: 'Week Warrior', description: '7 day streak', icon: '💪', category: 'streak', requirement: 7, hidden: true },
            { id: 'social_butterfly', title: 'Social Butterfly', description: 'Send 10 messages', icon: '💬', category: 'social', requirement: 10, hidden: true },
            { id: 'level_5', title: 'Rising Star', description: 'Reach level 5', icon: '⭐', category: 'special', requirement: 5, hidden: false },
            { id: 'level_10', title: 'Elite Coder', description: 'Reach level 10', icon: '👑', category: 'special', requirement: 10, hidden: false },
        ];

        res.json({
            success: true,
            achievements,
        });
    } catch (error) {
        console.error('Error fetching available achievements:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch available achievements',
        });
    }
});

/**
 * PUT /api/gamification/profile/settings
 * Update user profile settings (privacy, etc.)
 */
router.put('/profile/settings', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;
        const { isPublic } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }

        // Update privacy setting
        if (typeof isPublic === 'boolean') {
            user.isPublic = isPublic;
        }

        await user.save();

        res.json({
            success: true,
            message: 'Profile settings updated successfully',
            settings: {
                isPublic: user.isPublic,
            },
        });
    } catch (error) {
        console.error('Error updating profile settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update profile settings',
        });
    }
});

/**
 * POST /api/gamification/profile/skills
 * Add a custom skill to user profile
 */
router.post('/profile/skills', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;
        const { skill } = req.body;

        if (!skill || typeof skill !== 'string' || skill.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Skill name is required',
            });
        }

        const trimmedSkill = skill.trim();
        if (trimmedSkill.length > 50) {
            return res.status(400).json({
                success: false,
                error: 'Skill name cannot exceed 50 characters',
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }

        // Check if skill already exists (case-insensitive)
        const skillExists = user.customSkills.some(
            s => s.toLowerCase() === trimmedSkill.toLowerCase()
        );

        if (skillExists) {
            return res.status(400).json({
                success: false,
                error: 'Skill already exists',
            });
        }

        // Limit to 20 custom skills
        if (user.customSkills.length >= 20) {
            return res.status(400).json({
                success: false,
                error: 'Maximum of 20 custom skills allowed',
            });
        }

        user.customSkills.push(trimmedSkill);
        await user.save();

        res.json({
            success: true,
            message: 'Skill added successfully',
            customSkills: user.customSkills,
        });
    } catch (error) {
        console.error('Error adding custom skill:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add skill',
        });
    }
});

/**
 * DELETE /api/gamification/profile/skills/:skill
 * Remove a custom skill from user profile
 */
router.delete('/profile/skills/:skill', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;
        const { skill } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }

        const initialLength = user.customSkills.length;
        user.customSkills = user.customSkills.filter(
            s => s.toLowerCase() !== decodeURIComponent(skill).toLowerCase()
        );

        if (user.customSkills.length === initialLength) {
            return res.status(404).json({
                success: false,
                error: 'Skill not found',
            });
        }

        await user.save();

        res.json({
            success: true,
            message: 'Skill removed successfully',
            customSkills: user.customSkills,
        });
    } catch (error) {
        console.error('Error removing custom skill:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to remove skill',
        });
    }
});

/**
 * GET /api/gamification/profile/skills
 * Get user's custom skills
 */
router.get('/profile/skills', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }

        res.json({
            success: true,
            customSkills: user.customSkills || [],
        });
    } catch (error) {
        console.error('Error fetching custom skills:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch skills',
        });
    }
});

export default router;
