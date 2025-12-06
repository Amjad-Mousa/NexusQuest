// Helper function to create themed styles
export const createThemedStyles = (stylesFn: (colors: any) => any, colors: any) => {
  return stylesFn(colors);
};

// Common themed components
export const themedColors = {
  light: {
    background: '#f9fafb',
    surface: '#ffffff',
    card: '#ffffff',
    text: '#111827',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    primary: '#7c3aed',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    // Additional colors for specific use cases
    inputBackground: '#f3f4f6',
    placeholder: '#9ca3af',
    shadow: '#000000',
  },
  dark: {
    background: '#0f172a',
    surface: '#1e293b',
    card: '#1e293b',
    text: '#f9fafb',
    textSecondary: '#94a3b8',
    border: '#334155',
    primary: '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    // Additional colors for specific use cases
    inputBackground: '#334155',
    placeholder: '#64748b',
    shadow: '#000000',
  },
};
