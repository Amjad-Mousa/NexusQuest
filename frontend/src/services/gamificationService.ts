const API_URL = 'http://localhost:9876/api';

export interface Skill {
    name: string;
    level: number;
    xp: number;
    totalXp: number;
    category: string;
}

export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    category: string;
    unlockedAt: Date;
    progress?: number;
    maxProgress?: number;
}

export interface GamificationProfile {
    xp: number;
    totalXp: number;
    level: number;
    xpProgress: number;
    xpNeeded: number;
    xpPercentage: number;
    customSkills: string[];
    skills: Skill[];
    achievements: Achievement[];
    totalAchievements: number;
    isPublic: boolean;
}

export interface AvailableAchievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    category: string;
    requirement: number;
    hidden: boolean;
}

export async function getGamificationProfile(targetUserId?: string): Promise<GamificationProfile> {
    const token = localStorage.getItem('nexusquest-token');
    const url = targetUserId
        ? `${API_URL}/gamification/profile?targetUserId=${targetUserId}`
        : `${API_URL}/gamification/profile`;

    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error || 'Failed to fetch gamification profile');
    }

    return data.profile;
}

export async function getAvailableAchievements(): Promise<AvailableAchievement[]> {
    const token = localStorage.getItem('nexusquest-token');
    const response = await fetch(`${API_URL}/gamification/available-achievements`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error || 'Failed to fetch available achievements');
    }

    return data.achievements;
}

export interface AchievementWithStatus extends AvailableAchievement {
    earned: boolean;
    unlockedAt?: Date;
}

export async function getAllAchievementsWithStatus(): Promise<AchievementWithStatus[]> {
    const [available, profile] = await Promise.all([
        getAvailableAchievements(),
        getGamificationProfile(),
    ]);

    // Map available achievements with unlock status
    return available.map(achievement => {
        const unlocked = profile.achievements.find(a => a.id === achievement.id);
        return {
            ...achievement,
            earned: !!unlocked,
            unlockedAt: unlocked?.unlockedAt,
        };
    });
}

export async function addCustomSkill(skill: string): Promise<string[]> {
    const token = localStorage.getItem('nexusquest-token');
    const response = await fetch(`${API_URL}/gamification/profile/skills`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ skill }),
    });

    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error || 'Failed to add skill');
    }

    return data.customSkills;
}

export async function removeCustomSkill(skill: string): Promise<string[]> {
    const token = localStorage.getItem('nexusquest-token');
    const response = await fetch(`${API_URL}/gamification/profile/skills/${encodeURIComponent(skill)}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error || 'Failed to remove skill');
    }

    return data.customSkills;
}

export async function getCustomSkills(): Promise<string[]> {
    const token = localStorage.getItem('nexusquest-token');
    const response = await fetch(`${API_URL}/gamification/profile/skills`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error || 'Failed to fetch skills');
    }

    return data.customSkills;
}
