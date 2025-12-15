// Utility functions to trigger gamification notifications

export function triggerLevelUpNotification(level: number) {
    const event = new CustomEvent('gamification:levelup', {
        detail: { level }
    });
    window.dispatchEvent(event);
}

export function triggerAchievementNotification(title: string, description: string, icon: string) {
    const event = new CustomEvent('gamification:achievement', {
        detail: { title, description, icon }
    });
    window.dispatchEvent(event);
}

// Check for level up and achievements after completing tasks/quizzes
import { getStoredToken } from './authService';

export async function checkGamificationUpdates(previousLevel?: number, previousAchievements?: string[]) {
    try {
        const token = getStoredToken();
        const response = await fetch('http://localhost:9876/api/gamification/profile', {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();
        if (!data.success) return;

        const profile = data.profile;

        // Check for level up
        if (previousLevel && profile.level > previousLevel) {
            triggerLevelUpNotification(profile.level);
        }

        // Check for new achievements
        if (previousAchievements) {
            const newAchievements = profile.achievements.filter(
                (a: any) => !previousAchievements.includes(a.id)
            );

            newAchievements.forEach((achievement: any) => {
                triggerAchievementNotification(
                    achievement.title,
                    achievement.description,
                    achievement.icon
                );
            });
        }

        return profile;
    } catch (error) {
        console.error('Failed to check gamification updates:', error);
    }
}

// Store current gamification state in localStorage for comparison
export function storeGamificationState(level: number, achievementIds: string[]) {
    localStorage.setItem('nexusquest-gamification-level', level.toString());
    localStorage.setItem('nexusquest-gamification-achievements', JSON.stringify(achievementIds));
}

export function getStoredGamificationState() {
    const level = localStorage.getItem('nexusquest-gamification-level');
    const achievements = localStorage.getItem('nexusquest-gamification-achievements');

    return {
        level: level ? parseInt(level) : undefined,
        achievements: achievements ? JSON.parse(achievements) : undefined,
    };
}
