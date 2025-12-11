import { User } from '../models/User.js';
import UserSkill from '../models/UserSkill.js';
import Achievement from '../models/Achievement.js';
import { UserTaskProgress } from '../models/UserTaskProgress.js';

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

interface AwardXPResult {
    leveledUp: boolean;
    newLevel: number;
    totalXp: number;
    newAchievements: any[];
}

export async function awardXPForTask(userId: string, taskPoints: number, language: string): Promise<AwardXPResult> {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    const xpAmount = taskPoints; // 1 point = 1 XP
    const oldLevel = user.level;

    // Award XP to user
    user.xp += xpAmount;

    // Check for level up
    const newLevel = calculateLevel(user.xp);
    const leveledUp = newLevel > oldLevel;

    if (leveledUp) {
        user.level = newLevel;
    }

    await user.save();

    // Award skill XP for the language
    const skillName = `${language.charAt(0).toUpperCase() + language.slice(1)} Programming`;
    let skill = await UserSkill.findOne({ userId, skillName });

    if (!skill) {
        skill = new UserSkill({
            userId,
            skillName,
            category: language.toLowerCase(),
            xp: xpAmount,
            totalXp: xpAmount,
            level: 1,
        });
    } else {
        skill.xp += xpAmount;
        skill.totalXp += xpAmount;
        skill.level = calculateLevel(skill.totalXp);
    }

    await skill.save();

    // Check and unlock achievements
    const newAchievements = await checkAndUnlockAchievements(userId);

    return {
        leveledUp,
        newLevel: user.level,
        totalXp: user.xp,
        newAchievements,
    };
}

export async function awardXPForQuiz(userId: string, quizPoints: number): Promise<AwardXPResult> {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    const xpAmount = quizPoints;
    const oldLevel = user.level;

    user.xp += xpAmount;
    const newLevel = calculateLevel(user.xp);
    const leveledUp = newLevel > oldLevel;

    if (leveledUp) {
        user.level = newLevel;
    }

    await user.save();

    // Check and unlock achievements
    const newAchievements = await checkAndUnlockAchievements(userId);

    return {
        leveledUp,
        newLevel: user.level,
        totalXp: user.xp,
        newAchievements,
    };
}

async function checkAndUnlockAchievements(userId: string): Promise<any[]> {
    const newAchievements: any[] = [];

    // Get user's completed tasks count
    const completedTasks = await UserTaskProgress.countDocuments({
        userId,
        status: 'completed',
    });

    // Task achievements
    const taskAchievements = [
        { id: 'first_task', title: 'First Steps', description: 'Complete your first task', icon: '🎯', category: 'tasks', requirement: 1 },
        { id: 'task_master_5', title: 'Task Master', description: 'Complete 5 tasks', icon: '⭐', category: 'tasks', requirement: 5 },
        { id: 'task_legend_10', title: 'Task Legend', description: 'Complete 10 tasks', icon: '🏆', category: 'tasks', requirement: 10 },
    ];

    for (const ach of taskAchievements) {
        if (completedTasks >= ach.requirement) {
            const existing = await Achievement.findOne({ userId, achievementId: ach.id });
            if (!existing) {
                const achievement = await Achievement.create({
                    userId,
                    achievementId: ach.id,
                    title: ach.title,
                    description: ach.description,
                    icon: ach.icon,
                    category: ach.category,
                });
                newAchievements.push(achievement);
            }
        }
    }

    // Level achievements
    const user = await User.findById(userId);
    if (user) {
        const levelAchievements = [
            { id: 'level_5', title: 'Rising Star', description: 'Reach level 5', icon: '⭐', category: 'special', requirement: 5 },
            { id: 'level_10', title: 'Elite Coder', description: 'Reach level 10', icon: '👑', category: 'special', requirement: 10 },
        ];

        for (const ach of levelAchievements) {
            if (user.level >= ach.requirement) {
                const existing = await Achievement.findOne({ userId, achievementId: ach.id });
                if (!existing) {
                    const achievement = await Achievement.create({
                        userId,
                        achievementId: ach.id,
                        title: ach.title,
                        description: ach.description,
                        icon: ach.icon,
                        category: ach.category,
                    });
                    newAchievements.push(achievement);
                }
            }
        }
    }

    return newAchievements;
}
