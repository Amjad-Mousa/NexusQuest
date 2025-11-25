import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { codeExecutionRouter } from './routes/execution.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

const app = express();
const PORT = parseInt(process.env.PORT || '9876', 10);

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'NexusQuest Backend API'
  });
});

// API routes
app.use('/api', codeExecutionRouter);

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, 'localhost', () => {
  logger.info(`NexusQuest Backend API running on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
});