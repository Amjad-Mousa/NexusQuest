// Color mapping utilities for consistent UI theming

export const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
        python: 'blue',
        javascript: 'yellow',
        java: 'red',
        cpp: 'purple',
        general: 'green'
    };
    return colors[category] || 'gray';
};

export const getDifficultyColorForTutorial = (difficulty: string): string => {
    switch (difficulty) {
        case 'beginner':
            return 'bg-green-500/20 text-green-400';
        case 'intermediate':
            return 'bg-yellow-500/20 text-yellow-400';
        case 'advanced':
            return 'bg-red-500/20 text-red-400';
        default:
            return 'bg-gray-500/20 text-gray-400';
    }
};
