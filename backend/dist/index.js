import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { codeExecutionRouter } from './routes/execution.js';
import aiRouter from './routes/ai.js';
import authRouter from './routes/auth.js';
import projectsRouter from './routes/projects.js';
import tasksRouter from './routes/tasks.js';
import taskProgressRouter from './routes/task-progress.js';
import terminalRouter from './routes/terminal.js';
import versionsRouter from './routes/versions.js';
import dailyChallengeRouter from './routes/daily-challenge.js';
import quizzesRouter from './routes/quizzes.js';
import tutorialsRouter from './routes/tutorials.js';
import notificationRouter from './routes/notification.js';
import chatRouter from './routes/chat.js';
import collaborationRouter from './routes/collaboration.js';
import forumRouter from './routes/forum.js';
import gamificationRouter from './routes/gamification.js';
import { streamExecutionRouter } from './routes/stream-execution.js';
import { playgroundExecutionRouter } from './routes/playground-execution.js';
import simplePlaygroundRouter from './routes/simple-playground.js';
import { projectExecutionRouter } from './routes/project-execution.js';
import { taskExecutionRouter } from './routes/task-execution.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
import { connectDatabase } from './config/database.js';
import { Server } from 'socket.io';
import { setupChat } from './services/chatService.js';
import { setupCollaboration } from './services/collaborationService.js';
// Load environment variables
dotenv.config();
const app = express();
const server = http.createServer(app);
// Use the container-forwarded port by default and bind to 0.0.0.0 so Docker can route traffic
const PORT = parseInt(process.env.PORT || '3001', 10);
// Security middleware
app.use(helmet());
// Rate limiting - increased for development
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);
// CORS configuration - allow multiple origins for Docker and local development
const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://nexusquest.vercel.app/'
];
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, Postman, or same-origin)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));
// Body parsing - increased limit for image uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
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
app.use('/api', terminalRouter);
app.use('/api/stream', streamExecutionRouter);
app.use('/api/playground', playgroundExecutionRouter);
app.use('/api/simple-playground', simplePlaygroundRouter);
app.use('/api/projects', projectExecutionRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/tasks', taskExecutionRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/task-progress', taskProgressRouter);
app.use('/api/ai', aiRouter);
app.use('/api/auth', authRouter);
app.use('/api/versions', versionsRouter);
app.use('/api/daily-challenge', dailyChallengeRouter);
app.use('/api/quizzes', quizzesRouter);
app.use('/api/tutorials', tutorialsRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/chat', chatRouter);
app.use('/api/collaboration', collaborationRouter);
app.use('/api/forum', forumRouter);
app.use('/api/gamification', gamificationRouter);
// Error handling
app.use(errorHandler);
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        credentials: true,
    },
});
setupChat(io);
setupCollaboration(io);
// Start server with database connection
async function startServer() {
    // Try to connect to MongoDB (optional - IDE features work without it)
    try {
        await connectDatabase();
    }
    catch (err) {
        logger.warn('MongoDB not available - continuing without database features');
        logger.warn('Auth and Projects features will be disabled');
    }
    // Start server regardless of database connection
    server.listen(PORT, '0.0.0.0', () => {
        logger.info(`NexusQuest Backend API running on port ${PORT}`);
        logger.info(`Health check: http://localhost:${PORT}/health`);
    });
}
startServer();
//# sourceMappingURL=index.js.map