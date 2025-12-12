import { User } from '../models/User.js';
import UserSkill from '../models/UserSkill.js';
import Achievement from '../models/Achievement.js';
import { UserTaskProgress } from '../models/UserTaskProgress.js';
import { Project } from '../models/Project.js';
import { Notification } from '../models/Notification.js';
import { NotificationType } from '../enums/NotificationType.js';
import { QuizSubmission } from '../models/Quiz.js';

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
    const achievementXPBonus = 50; // XP bonus for unlocking an achievement

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

                // Create notification for achievement unlock
                try {
                    await Notification.create({
                        userId,
                        type: NotificationType.ACHIEVEMENT_UNLOCKED,
                        message: `🏆 Achievement Unlocked: ${ach.title}!`,
                        metadata: {
                            achievementId: ach.id,
                            achievementTitle: ach.title,
                            achievementIcon: ach.icon,
                            xpBonus: achievementXPBonus,
                        },
                        read: false,
                    });
                } catch (notifyError) {
                    console.error('Failed to create achievement notification:', notifyError);
                }

                // Award XP bonus for achievement
                try {
                    const user = await User.findById(userId);
                    if (user) {
                        user.xp += achievementXPBonus;
                        const newLevel = calculateLevel(user.xp);
                        if (newLevel > user.level) {
                            user.level = newLevel;
                        }
                        await user.save();
                    }
                } catch (xpError) {
                    console.error('Failed to award achievement XP:', xpError);
                }
            }
        }
    }

    // Project achievements
    const totalProjects = await Project.countDocuments({ owner: userId });
    const projectAchievements = [
        { id: 'first_project', title: 'Project Pioneer', description: 'Create your first project', icon: '🚀', category: 'projects', requirement: 1 },
        { id: 'project_creator_5', title: 'Project Creator', description: 'Create 5 projects', icon: '📁', category: 'projects', requirement: 5 },
        { id: 'project_master_10', title: 'Project Master', description: 'Create 10 projects', icon: '🗂️', category: 'projects', requirement: 10 },
    ];

    for (const ach of projectAchievements) {
        if (totalProjects >= ach.requirement) {
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

                // Create notification for achievement unlock
                try {
                    await Notification.create({
                        userId,
                        type: NotificationType.ACHIEVEMENT_UNLOCKED,
                        message: `🏆 Achievement Unlocked: ${ach.title}!`,
                        metadata: {
                            achievementId: ach.id,
                            achievementTitle: ach.title,
                            achievementIcon: ach.icon,
                            xpBonus: achievementXPBonus,
                        },
                        read: false,
                    });
                } catch (notifyError) {
                    console.error('Failed to create achievement notification:', notifyError);
                }

                // Award XP bonus for achievement
                try {
                    const user = await User.findById(userId);
                    if (user) {
                        user.xp += achievementXPBonus;
                        const newLevel = calculateLevel(user.xp);
                        if (newLevel > user.level) {
                            user.level = newLevel;
                        }
                        await user.save();
                    }
                } catch (xpError) {
                    console.error('Failed to award achievement XP:', xpError);
                }
            }
        }
    }

    // Polyglot achievement - create a project in all 4 languages
    const languages = ['python', 'javascript', 'java', 'cpp'];
    const userProjects = await Project.find({ owner: userId }).select('language');
    const uniqueLanguages = new Set(userProjects.map(p => p.language));

    if (uniqueLanguages.size >= languages.length) {
        const polyglotAch = { id: 'polyglot', title: 'Polyglot Programmer', description: 'Create a project in all available languages', icon: '🌐', category: 'special' };
        const existing = await Achievement.findOne({ userId, achievementId: polyglotAch.id });
        if (!existing) {
            const achievement = await Achievement.create({
                userId,
                achievementId: polyglotAch.id,
                title: polyglotAch.title,
                description: polyglotAch.description,
                icon: polyglotAch.icon,
                category: polyglotAch.category,
            });
            newAchievements.push(achievement);

            // Create notification for achievement unlock
            try {
                await Notification.create({
                    userId,
                    type: NotificationType.ACHIEVEMENT_UNLOCKED,
                    message: `🏆 Achievement Unlocked: ${polyglotAch.title}!`,
                    metadata: {
                        achievementId: polyglotAch.id,
                        achievementTitle: polyglotAch.title,
                        achievementIcon: polyglotAch.icon,
                        xpBonus: achievementXPBonus,
                    },
                    read: false,
                });
            } catch (notifyError) {
                console.error('Failed to create achievement notification:', notifyError);
            }

            // Award XP bonus for achievement
            try {
                const user = await User.findById(userId);
                if (user) {
                    user.xp += achievementXPBonus;
                    const newLevel = calculateLevel(user.xp);
                    if (newLevel > user.level) {
                        user.level = newLevel;
                    }
                    await user.save();
                }
            } catch (xpError) {
                console.error('Failed to award achievement XP:', xpError);
            }
        }
    }

    // Quiz achievements
    const completedQuizzes = await QuizSubmission.countDocuments({
        userId,
        status: { $in: ['passed', 'submitted'] },
    });

    const quizAchievements = [
        { id: 'first_quiz', title: 'Quiz Beginner', description: 'Complete your first quiz', icon: '📝', category: 'quizzes', requirement: 1 },
        { id: 'quiz_expert_5', title: 'Quiz Expert', description: 'Complete 5 quizzes', icon: '🎓', category: 'quizzes', requirement: 5 },
    ];

    for (const ach of quizAchievements) {
        if (completedQuizzes >= ach.requirement) {
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

                // Create notification for achievement unlock
                try {
                    await Notification.create({
                        userId,
                        type: NotificationType.ACHIEVEMENT_UNLOCKED,
                        message: `🏆 Achievement Unlocked: ${ach.title}!`,
                        metadata: {
                            achievementId: ach.id,
                            achievementTitle: ach.title,
                            achievementIcon: ach.icon,
                            xpBonus: achievementXPBonus,
                        },
                        read: false,
                    });
                } catch (notifyError) {
                    console.error('Failed to create achievement notification:', notifyError);
                }

                // Award XP bonus for achievement
                try {
                    const user = await User.findById(userId);
                    if (user) {
                        user.xp += achievementXPBonus;
                        const newLevel = calculateLevel(user.xp);
                        if (newLevel > user.level) {
                            user.level = newLevel;
                        }
                        await user.save();
                    }
                } catch (xpError) {
                    console.error('Failed to award achievement XP:', xpError);
                }
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

                    // Create notification for achievement unlock
                    try {
                        await Notification.create({
                            userId,
                            type: NotificationType.ACHIEVEMENT_UNLOCKED,
                            message: `🏆 Achievement Unlocked: ${ach.title}!`,
                            metadata: {
                                achievementId: ach.id,
                                achievementTitle: ach.title,
                                achievementIcon: ach.icon,
                                xpBonus: achievementXPBonus,
                            },
                            read: false,
                        });
                    } catch (notifyError) {
                        console.error('Failed to create achievement notification:', notifyError);
                    }

                    // Award XP bonus for achievement
                    try {
                        const user = await User.findById(userId);
                        if (user) {
                            user.xp += achievementXPBonus;
                            const newLevel = calculateLevel(user.xp);
                            if (newLevel > user.level) {
                                user.level = newLevel;
                            }
                            await user.save();
                        }
                    } catch (xpError) {
                        console.error('Failed to award achievement XP:', xpError);
                    }
                }
            }
        }
    }

    return newAchievements;
}

export async function checkProjectAchievements(userId: string): Promise<any[]> {
    return checkAndUnlockAchievements(userId);
}

export async function checkQuizAchievements(userId: string): Promise<any[]> {
    return checkAndUnlockAchievements(userId);
}
