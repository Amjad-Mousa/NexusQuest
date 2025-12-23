import { defaultTutorials, type Tutorial as BaseTutorial, type TutorialSection } from '../constants/defaultTutorials';

export interface Tutorial extends BaseTutorial {
  isPublished: boolean;
  isCustom?: boolean;
}

export type { TutorialSection };

import { getStoredToken } from './authService';
import { getApiUrl } from '../utils/apiHelpers';

// Get tutorial customizations from localStorage
const getTutorialCustomizations = (): Record<string, Partial<Tutorial>> => {
  const customizations = localStorage.getItem('tutorial-customizations');
  return customizations ? JSON.parse(customizations) : {};
};

// Get all tutorials (students) - all visible
export const getTutorials = async (language?: string, difficulty?: string): Promise<Tutorial[]> => {
  try {
    // Fetch tutorials from backend API
    const queryParams = new URLSearchParams();
    if (language) queryParams.append('language', language);
    if (difficulty) queryParams.append('difficulty', difficulty);

    const response = await fetch(`${getApiUrl()}/api/tutorials?${queryParams}`);

    if (response.ok) {
      const backendTutorials = await response.json();

      // Convert backend tutorials to frontend format
      const formattedBackendTutorials: Tutorial[] = backendTutorials.map((t: any) => ({
        id: t._id,
        title: t.title,
        description: t.description,
        language: t.language,
        difficulty: t.difficulty,
        order: t.order || 0,
        sections: t.content ? JSON.parse(t.content) : [],
        isPublished: t.isPublished,
        isCustom: true,
      }));

      // Merge with default tutorials
      const customizations = getTutorialCustomizations();
      const defaultTutorialsFormatted: Tutorial[] = defaultTutorials.map((tutorial: BaseTutorial) => ({
        ...tutorial,
        ...customizations[tutorial.id],
        isPublished: true,
      }));

      // Combine both, backend tutorials first
      return [...formattedBackendTutorials, ...defaultTutorialsFormatted];
    }
  } catch (error) {
    console.error('Error fetching tutorials from backend:', error);
  }

  // Fallback to default tutorials only
  const customizations = getTutorialCustomizations();
  let tutorials: Tutorial[] = defaultTutorials.map((tutorial: BaseTutorial) => ({
    ...tutorial,
    ...customizations[tutorial.id],
    isPublished: true,
  }));

  if (language) {
    tutorials = tutorials.filter((t: Tutorial) => t.language === language);
  }

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
  try {
    // Try fetching from backend first
    const response = await fetch(`${getApiUrl()}/api/tutorials/${id}`);

    if (response.ok) {
      const backendTutorial = await response.json();
      return {
        id: backendTutorial._id,
        title: backendTutorial.title,
        description: backendTutorial.description,
        language: backendTutorial.language,
        difficulty: backendTutorial.difficulty,
        order: backendTutorial.order || 0,
        sections: backendTutorial.content ? JSON.parse(backendTutorial.content) : [],
        isPublished: backendTutorial.isPublished,
        isCustom: true,
      };
    }
  } catch (error) {
    console.error('Error fetching tutorial from backend:', error);
  }

  // Fallback to default tutorials
  const customizations = getTutorialCustomizations();
  const tutorial = defaultTutorials.find((t: BaseTutorial) => t.id === id);

  if (!tutorial) {
    throw new Error('Tutorial not found');
  }

  return {
    ...tutorial,
    ...customizations[id],
    isPublished: true,
  };
};

// Get all tutorials for teacher
export const getTeacherTutorials = async (): Promise<Tutorial[]> => {
  try {
    const token = getStoredToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(`${getApiUrl()}/api/tutorials/teacher/all`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const backendTutorials = await response.json();

      // Convert backend tutorials to frontend format
      const formattedBackendTutorials: Tutorial[] = backendTutorials.map((t: any) => ({
        id: t._id,
        title: t.title,
        description: t.description,
        language: t.language,
        difficulty: t.difficulty,
        order: t.order || 0,
        sections: t.content ? JSON.parse(t.content) : [],
        isPublished: t.isPublished,
        isCustom: true,
      }));

      // Merge with default tutorials
      const customizations = getTutorialCustomizations();
      const defaultTutorialsFormatted: Tutorial[] = defaultTutorials.map((tutorial: BaseTutorial) => ({
        ...tutorial,
        ...customizations[tutorial.id],
        isPublished: true,
        isCustom: false,
      }));

      return [...formattedBackendTutorials, ...defaultTutorialsFormatted];
    }
  } catch (error) {
    console.error('Error fetching teacher tutorials from backend:', error);
  }

  // Fallback to default tutorials
  const customizations = getTutorialCustomizations();
  return defaultTutorials.map((tutorial: BaseTutorial): Tutorial => ({
    ...tutorial,
    ...customizations[tutorial.id],
    isPublished: true,
    isCustom: false,
  }));
};

// Toggle tutorial visibility (disabled - all tutorials always visible)
export const toggleTutorialVisibility = async (id: string): Promise<Tutorial> => {
  // No-op: visibility toggle disabled
  return getTutorial(id);
};

// Check if ID is a MongoDB ObjectId (24 hex characters)
const isMongoId = (id: string): boolean => /^[a-f\d]{24}$/i.test(id);

// Save tutorial customizations to localStorage
const saveTutorialCustomizations = (customizations: Record<string, Partial<Tutorial>>): void => {
  localStorage.setItem('tutorial-customizations', JSON.stringify(customizations));
};

// Save tutorial customizations
export const saveTutorialCustomization = async (id: string, updates: Partial<Tutorial>): Promise<Tutorial> => {
  // Check if this is a default tutorial (non-MongoDB ID)
  if (!isMongoId(id)) {
    // Save to localStorage for default tutorials
    const customizations = getTutorialCustomizations();
    customizations[id] = {
      ...customizations[id],
      ...updates,
    };
    saveTutorialCustomizations(customizations);

    // Return the updated tutorial
    const baseTutorial = defaultTutorials.find((t: BaseTutorial) => t.id === id);
    if (!baseTutorial) {
      throw new Error('Tutorial not found');
    }

    return {
      ...baseTutorial,
      ...customizations[id],
      isPublished: true,
      isCustom: true,
    };
  }

  // For backend tutorials, use the API
  try {
    const token = getStoredToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(`${getApiUrl()}/api/tutorials/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: updates.title,
        description: updates.description,
        language: updates.language,
        difficulty: updates.difficulty,
        order: updates.order,
        content: updates.sections ? JSON.stringify(updates.sections) : undefined,
        isPublished: updates.isPublished !== undefined ? updates.isPublished : true,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update tutorial');
    }

    const backendTutorial = await response.json();
    return {
      id: backendTutorial._id,
      title: backendTutorial.title,
      description: backendTutorial.description,
      language: backendTutorial.language,
      difficulty: backendTutorial.difficulty,
      order: backendTutorial.order || 0,
      sections: backendTutorial.content ? JSON.parse(backendTutorial.content) : [],
      isPublished: backendTutorial.isPublished,
      isCustom: true,
    };
  } catch (error) {
    console.error('Error updating tutorial:', error);
    throw error;
  }
};

// Create a new custom tutorial
export const createCustomTutorial = async (tutorial: Omit<Tutorial, 'isPublished' | 'isCustom'>): Promise<Tutorial> => {
  try {
    const token = getStoredToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(`${getApiUrl()}/api/tutorials`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: tutorial.title,
        description: tutorial.description,
        language: tutorial.language,
        difficulty: tutorial.difficulty,
        order: tutorial.order,
        content: JSON.stringify(tutorial.sections),
        isPublished: true, // Auto-publish new tutorials
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create tutorial');
    }

    const backendTutorial = await response.json();
    return {
      id: backendTutorial._id,
      title: backendTutorial.title,
      description: backendTutorial.description,
      language: backendTutorial.language,
      difficulty: backendTutorial.difficulty,
      order: backendTutorial.order || 0,
      sections: backendTutorial.content ? JSON.parse(backendTutorial.content) : [],
      isPublished: backendTutorial.isPublished,
      isCustom: true,
    };
  } catch (error) {
    console.error('Error creating tutorial:', error);
    throw error;
  }
};

// Delete a custom tutorial
export const deleteCustomTutorial = async (id: string): Promise<void> => {
  try {
    const token = getStoredToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(`${getApiUrl()}/api/tutorials/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete tutorial');
    }
  } catch (error) {
    console.error('Error deleting tutorial:', error);
    throw error;
  }
};

// Get available languages
export const getAvailableLanguages = async (): Promise<string[]> => {
  try {
    // Try fetching from backend API first
    const token = getStoredToken();
    const response = await fetch(`${getApiUrl()}/api/tutorials/meta/languages`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const backendLanguages = await response.json();
      // Merge with default tutorial languages
      const defaultLanguages = [...new Set(defaultTutorials.map((t: BaseTutorial) => t.language))];
      const allLanguages = [...new Set([...backendLanguages, ...defaultLanguages])];
      return allLanguages.sort();
    }
  } catch (error) {
    console.error('Error fetching languages from backend:', error);
  }

  // Fallback to default tutorials
  const tutorials = await getTutorials();
  const languages = [...new Set(tutorials.map((t: Tutorial) => t.language))];
  return languages.sort();
};

// Mark tutorial as started
export const startTutorial = async (tutorialId: string): Promise<void> => {
  const token = getStoredToken();
  if (!token) return;

  try {
    const response = await fetch(`${getApiUrl()}/api/tutorials/${tutorialId}/start`, {
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
  const token = getStoredToken();
  if (!token) return;

  try {
    const response = await fetch(`${getApiUrl()}/api/tutorials/${tutorialId}/complete`, {
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
