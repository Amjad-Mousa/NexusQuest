import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { codeExecutionRouter } from './routes/execution.js';
import aiRouter from './routes/ai.js';
import authRouter from './routes/auth.js';
import projectsRouter from './routes/projects.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
import { connectDatabase } from './config/database.js';

// Load environment variables
dotenv.config();

const app = express();
// Use the container-forwarded port by default and bind to 0.0.0.0 so Docker can route traffic
const PORT = parseInt(process.env.PORT || '3001', 10);

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
app.use('/api/ai', aiRouter);
app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);

// Error handling
app.use(errorHandler);

// Start server with database connection
async function startServer() {
  try {
    // Connect to MongoDB
    await connectDatabase();

    // Start server and bind to all interfaces so the port mapping in docker-compose works
    // (binding to 'localhost' prevents external connections to the container port)
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`NexusQuest Backend API running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();