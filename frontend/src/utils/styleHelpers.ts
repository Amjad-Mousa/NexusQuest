// Utility functions for consistent styling across components

export const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
        case 'easy': return 'bg-green-500/20 text-green-400 border-green-500/30';
        case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        case 'hard': return 'bg-red-500/20 text-red-400 border-red-500/30';
        default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
};

export const getLanguageColor = (language: string): string => {
    switch (language) {
        case 'python': return 'bg-blue-500/20 text-blue-400';
        case 'javascript': return 'bg-yellow-500/20 text-yellow-400';
        case 'java': return 'bg-orange-500/20 text-orange-400';
        case 'cpp': return 'bg-purple-500/20 text-purple-400';
        default: return 'bg-gray-500/20 text-gray-400';
    }
};

export const getQuizStatusColor = (status: string): string => {
    switch (status) {
        case 'scheduled': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
        case 'ended': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
};
