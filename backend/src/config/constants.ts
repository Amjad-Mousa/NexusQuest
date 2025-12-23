// Centralized backend configuration constants (non-breaking)
// Keep defaults identical to current inline values to avoid behavioral changes

export const DEFAULT_PORT = parseInt(process.env.PORT || '9876', 10);

export const ALLOWED_ORIGINS: string[] = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://192.168.1.100:5173',
  'https://nexusquest.vercel.app/'
];
