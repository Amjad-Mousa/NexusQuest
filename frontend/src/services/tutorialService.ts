import { defaultTutorials, type Tutorial as BaseTutorial, type TutorialSection } from '../constants/defaultTutorials';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

export interface Tutorial extends BaseTutorial {
  isPublished: boolean;
  isCustom?: boolean;
}

export type { TutorialSection };

// Get tutorial visibility settings from backend
const getTutorialSettings = async (): Promise<Record<string, boolean>> => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/tutorials/settings/visibility`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching tutorial settings:', error);
    return {};
  }
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
  const settings = await getTutorialSettings();
  const customizations = getTutorialCustomizations();
  
  console.log('getTutorials - visibility settings:', settings);
  
  let tutorials: Tutorial[] = defaultTutorials.map((tutorial: BaseTutorial) => ({
    ...tutorial,
    ...customizations[tutorial.id],
    isPublished: settings[tutorial.id] === undefined ? true : settings[tutorial.id], // default to true
  }));

  console.log('getTutorials - before filter:', tutorials.map(t => ({ id: t.id, title: t.title, isPublished: t.isPublished })));

  // Filter by published status
  tutorials = tutorials.filter((t: Tutorial) => t.isPublished);
  
  console.log('getTutorials - after filter:', tutorials.length, 'tutorials');

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

  return {
    ...tutorial,
    ...customizations[id],
    isPublished: settings[id] === undefined ? true : settings[id],
  };
};

// Get all tutorials for teacher (including unpublished)
export const getTeacherTutorials = async (): Promise<Tutorial[]> => {
  const settings = await getTutorialSettings();
  const customizations = getTutorialCustomizations();
  
  return defaultTutorials.map((tutorial: BaseTutorial): Tutorial => ({
    ...tutorial,
    ...customizations[tutorial.id],
    isPublished: settings[tutorial.id] === undefined ? true : settings[tutorial.id],
    isCustom: !!customizations[tutorial.id] && Object.keys(customizations[tutorial.id]).length > 0,
  }));
};

// Toggle tutorial visibility (teacher)
export const toggleTutorialVisibility = async (id: string): Promise<Tutorial> => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${API_URL}/tutorials/settings/${id}/toggle`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    
    console.log('Toggle response:', response.data);
    
    return getTutorial(id);
  } catch (error) {
    console.error('Error toggling tutorial visibility:', error);
    throw error;
  }
};

// Get available languages
export const getAvailableLanguages = async (): Promise<string[]> => {
  const tutorials = await getTutorials();
  const languages = [...new Set(tutorials.map((t: Tutorial) => t.language))];
  return languages.sort();
};
