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

// Save tutorial customizations
const saveTutorialCustomizations = (customizations: Record<string, Partial<Tutorial>>) => {
  localStorage.setItem('tutorial-customizations', JSON.stringify(customizations));
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
  const settings = await getTutorialSettings();
  const customizations = getTutorialCustomizations();
  
  const tutorial = defaultTutorials.find((t: BaseTutorial) => t.id === id);
  
  if (!tutorial) {
    throw new Error('Tutorial not found');
  }
// Get single tutorial
export const getTutorial = async (id: string): Promise<Tutorial> => {
  const customizations = getTutorialCustomizations();
  
  const tutorial = defaultTutorials.find((t: BaseTutorial) => t.id === id);
  
  if (!tutorial) {
    throw new Error('Tutorial not found');
// Get all tutorials for teacher
export const getTeacherTutorials = async (): Promise<Tutorial[]> => {
  const customizations = getTutorialCustomizations();
  
  return defaultTutorials.map((tutorial: BaseTutorial): Tutorial => ({
    ...tutorial,
    ...customizations[tutorial.id],
    isPublished: true, // Always visible
    isCustom: !!customizations[tutorial.id] && Object.keys(customizations[tutorial.id]).length > 0,
  }));
};
// Toggle tutorial visibility (teacher)
export const toggleTutorialVisibility = async (id: string): Promise<Tutorial> => {
// Toggle tutorial visibility (disabled - all tutorials always visible)
export const toggleTutorialVisibility = async (id: string): Promise<Tutorial> => {
  // No-op: visibility toggle disabled
  return getTutorial(id);
}; Get available languages
export const getAvailableLanguages = async (): Promise<string[]> => {
  const tutorials = await getTutorials();
  const languages = [...new Set(tutorials.map((t: Tutorial) => t.language))];
  return languages.sort();
};
