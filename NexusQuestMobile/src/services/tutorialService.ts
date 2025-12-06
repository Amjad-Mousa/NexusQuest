import { defaultTutorials, type Tutorial as BaseTutorial, type TutorialSection } from '../constants/defaultTutorials';

export interface Tutorial extends BaseTutorial {
    isPublished: boolean;
}

export type { TutorialSection };

export const getTutorials = async (language?: string, difficulty?: string): Promise<Tutorial[]> => {
    let tutorials: Tutorial[] = defaultTutorials.map((t) => ({
        ...t,
        isPublished: true,
    }));

    if (language) {
        tutorials = tutorials.filter((t) => t.language === language);
    }

    if (difficulty) {
        tutorials = tutorials.filter((t) => t.difficulty === difficulty);
    }

    return tutorials;
};

export const getTutorial = async (id: string): Promise<Tutorial> => {
    const tutorial = defaultTutorials.find((t) => t.id === id);
    if (!tutorial) {
        throw new Error('Tutorial not found');
    }
    return { ...tutorial, isPublished: true };
};
