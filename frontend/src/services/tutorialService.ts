import { defaultTutorials, type Tutorial as BaseTutorial, type TutorialSection } from '../constants/defaultTutorials';

export interface Tutorial extends BaseTutorial {
  isPublished: boolean;
  isCustom?: boolean;
}

export type { TutorialSection };

// Get tutorial customizations from localStorage
const getTutorialCustomizations = (): Record<string, Partial<Tutorial>> => {
  const customizations = localStorage.getItem('tutorial-customizations');
  return customizations ? JSON.parse(customizations) : {};
};

// Get all tutorials (students) - all visible
export const getTutorials = async (language?: string, difficulty?: string): Promise<Tutorial[]> => {
  const customizations = getTutorialCustomizations();

  let tutorials: Tutorial[] = defaultTutorials.map((tutorial: BaseTutorial) => ({
    ...tutorial,
    ...customizations[tutorial.id],
    isPublished: true, // Always visible
  }));

  // Filter by language
  if (language) {
    tutorials = tutorials.filter((t: Tutorial) => t.language === language);
  }

  // Filter by difficulty
  if (difficulty) {
    tutorials = tutorials.filter((t: Tutorial) => t.difficulty === difficulty);
  }

  return tutorials;
};

// Get tutorials by language
export const getTutorialsByLanguage = async (language: string): Promise<Tutorial[]> => {
  return getTutorials(language);
};

// Get single tutorial
export const getTutorial = async (id: string): Promise<Tutorial> => {
  const customizations = getTutorialCustomizations();

  const tutorial = defaultTutorials.find((t: BaseTutorial) => t.id === id);

  if (!tutorial) {
    throw new Error('Tutorial not found');
  }

  return {
    ...tutorial,
    ...customizations[id],
    isPublished: true, // Always visible
  };
};

// Get all tutorials for teacher
export const getTeacherTutorials = async (): Promise<Tutorial[]> => {
  const customizations = getTutorialCustomizations();

  // Get default tutorials with customizations
  const defaultTutorialsWithCustomizations = defaultTutorials.map((tutorial: BaseTutorial): Tutorial => ({
    ...tutorial,
    ...customizations[tutorial.id],
    isPublished: true, // Always visible
    isCustom: !!customizations[tutorial.id] && Object.keys(customizations[tutorial.id]).length > 0,
  }));

  // Get fully custom tutorials (not in defaultTutorials)
  const customTutorialIds = Object.keys(customizations).filter(
    id => customizations[id].isCustom && !defaultTutorials.find(t => t.id === id)
  );

  const fullyCustomTutorials: Tutorial[] = customTutorialIds.map(id => ({
    ...(customizations[id] as Tutorial),
    isPublished: true,
    isCustom: true,
  }));

  return [...defaultTutorialsWithCustomizations, ...fullyCustomTutorials];
};

// Toggle tutorial visibility (disabled - all tutorials always visible)
export const toggleTutorialVisibility = async (id: string): Promise<Tutorial> => {
  // No-op: visibility toggle disabled
  return getTutorial(id);
};

// Save tutorial customizations
export const saveTutorialCustomization = async (id: string, updates: Partial<Tutorial>): Promise<Tutorial> => {
  const customizations = getTutorialCustomizations();

  customizations[id] = {
    ...customizations[id],
    ...updates,
  };

  localStorage.setItem('tutorial-customizations', JSON.stringify(customizations));
  return getTutorial(id);
};

// Create a new custom tutorial
export const createCustomTutorial = async (tutorial: Omit<Tutorial, 'isPublished' | 'isCustom'>): Promise<Tutorial> => {
  const customizations = getTutorialCustomizations();

  // Store the entire tutorial as a customization
  customizations[tutorial.id] = {
    ...tutorial,
    isCustom: true,
  };

  localStorage.setItem('tutorial-customizations', JSON.stringify(customizations));

  return {
    ...tutorial,
    isPublished: true,
    isCustom: true,
  };
};

// Delete a custom tutorial
export const deleteCustomTutorial = async (id: string): Promise<void> => {
  const customizations = getTutorialCustomizations();

  // Only allow deleting fully custom tutorials
  if (customizations[id]?.isCustom) {
    delete customizations[id];
    localStorage.setItem('tutorial-customizations', JSON.stringify(customizations));
  }
};

// Get available languages
export const getAvailableLanguages = async (): Promise<string[]> => {
  const tutorials = await getTutorials();
  const languages = [...new Set(tutorials.map((t: Tutorial) => t.language))];
  return languages.sort();
};

// Mark tutorial as started
export const startTutorial = async (tutorialId: string): Promise<void> => {
  const token = localStorage.getItem('nexusquest-token');
  if (!token) return;

  try {
    const response = await fetch(`http://localhost:9876/api/tutorials/${tutorialId}/start`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to start tutorial');
    }
  } catch (error) {
    console.error('Error starting tutorial:', error);
  }
};

// Mark tutorial as completed
export const completeTutorial = async (tutorialId: string): Promise<void> => {
  const token = localStorage.getItem('nexusquest-token');
  if (!token) return;

  try {
    const response = await fetch(`http://localhost:9876/api/tutorials/${tutorialId}/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to complete tutorial');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error completing tutorial:', error);
    throw error;
  }
};
