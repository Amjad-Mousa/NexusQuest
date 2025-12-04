import { defaultTutorials, type Tutorial as BaseTutorial, type TutorialSection } from '../constants/defaultTutorials';

export interface Tutorial extends BaseTutorial {
  isPublished: boolean;
  isCustom?: boolean;
}

export type { TutorialSection };

// Get tutorial visibility settings from localStorage
const getTutorialSettings = (): Record<string, boolean> => {
  const settings = localStorage.getItem('tutorial-visibility');
  return settings ? JSON.parse(settings) : {};
};

// Save tutorial visibility settings
const saveTutorialSettings = (settings: Record<string, boolean>) => {
  localStorage.setItem('tutorial-visibility', JSON.stringify(settings));
};

// Get tutorial customizations from localStorage
const getTutorialCustomizations = (): Record<string, Partial<Tutorial>> => {
  const customizations = localStorage.getItem('tutorial-customizations');
  return customizations ? JSON.parse(customizations) : {};
};

// Save tutorial customizations
const saveTutorialCustomizations = (customizations: Record<string, Partial<Tutorial>>) => {
  localStorage.setItem('tutorial-customizations', JSON.stringify(customizations));
};

// Get all tutorials (students) - only published ones
export const getTutorials = async (language?: string, difficulty?: string): Promise<Tutorial[]> => {
  const settings = getTutorialSettings();
  const customizations = getTutorialCustomizations();
  
  let tutorials: Tutorial[] = defaultTutorials.map((tutorial: BaseTutorial) => ({
    ...tutorial,
    ...customizations[tutorial.id],
    isPublished: settings[tutorial.id] !== false, // default to true
  }));

  // Filter by published status
  tutorials = tutorials.filter((t: Tutorial) => t.isPublished);

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
  const settings = getTutorialSettings();
  const customizations = getTutorialCustomizations();
  
  const tutorial = defaultTutorials.find((t: BaseTutorial) => t.id === id);
  
  if (!tutorial) {
    throw new Error('Tutorial not found');
  }

  return {
    ...tutorial,
    ...customizations[id],
    isPublished: settings[id] !== false,
  };
};

// Get all tutorials for teacher (including unpublished)
export const getTeacherTutorials = async (): Promise<Tutorial[]> => {
  const settings = getTutorialSettings();
  const customizations = getTutorialCustomizations();
  
  return defaultTutorials.map((tutorial: BaseTutorial): Tutorial => ({
    ...tutorial,
    ...customizations[tutorial.id],
    isPublished: settings[tutorial.id] !== false,
    isCustom: !!customizations[tutorial.id] && Object.keys(customizations[tutorial.id]).length > 0,
  }));
};

// Update tutorial (teacher) - only content and visibility
export const updateTutorial = async (id: string, updates: Partial<Tutorial>): Promise<Tutorial> => {
  const customizations = getTutorialCustomizations();
  const settings = getTutorialSettings();
  
  // Update customizations (content, description, etc.)
  customizations[id] = {
    ...customizations[id],
    ...updates,
  };
  
  // Update visibility if changed
  if (updates.isPublished !== undefined) {
    settings[id] = updates.isPublished;
    saveTutorialSettings(settings);
  }
  
  saveTutorialCustomizations(customizations);
  
  return getTutorial(id);
};

// Toggle tutorial visibility (teacher)
export const toggleTutorialVisibility = async (id: string): Promise<Tutorial> => {
  const settings = getTutorialSettings();
  const currentStatus = settings[id] !== false; // default is true if not set
  console.log('Toggle - Current settings:', settings);
  console.log('Toggle - Current status for', id, ':', currentStatus);
  settings[id] = !currentStatus; // Toggle it
  console.log('Toggle - New status:', settings[id]);
  saveTutorialSettings(settings);
  console.log('Toggle - Saved settings:', localStorage.getItem('tutorial-visibility'));
  
  return getTutorial(id);
};

// Reset tutorial to default (teacher)
export const resetTutorial = async (id: string): Promise<Tutorial> => {
  const customizations = getTutorialCustomizations();
  delete customizations[id];
  saveTutorialCustomizations(customizations);
  
  return getTutorial(id);
};

// Get available languages
export const getAvailableLanguages = async (): Promise<string[]> => {
  const tutorials = await getTutorials();
  const languages = [...new Set(tutorials.map((t: Tutorial) => t.language))];
  return languages.sort();
};
