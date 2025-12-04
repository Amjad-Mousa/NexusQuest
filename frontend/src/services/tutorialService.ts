import { defaultTutorials } from '../constants/defaultTutorials';

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  language: string;
  content: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  order: number;
  isPublished: boolean;
  isCustom?: boolean;
}

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
  
  let tutorials = defaultTutorials.map(tutorial => ({
    ...tutorial,
    ...customizations[tutorial.id],
    isPublished: settings[tutorial.id] !== false, // default to true
  }));

  // Filter by published status
  tutorials = tutorials.filter(t => t.isPublished);

  // Filter by language
  if (language) {
    tutorials = tutorials.filter(t => t.language === language);
  }

  // Filter by difficulty
  if (difficulty) {
    tutorials = tutorials.filter(t => t.difficulty === difficulty);
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
  
  const tutorial = defaultTutorials.find(t => t.id === id);
  
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
  
  return defaultTutorials.map(tutorial => ({
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
  settings[id] = !(settings[id] !== false); // Toggle (default is true)
  saveTutorialSettings(settings);
  
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
  const languages = [...new Set(tutorials.map(t => t.language))];
  return languages.sort();
};
