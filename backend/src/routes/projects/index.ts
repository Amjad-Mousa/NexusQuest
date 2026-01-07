import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.js';
import crudRoutes from './crud.js';
import fileRoutes from './files.js';
import dependencyRoutes from './dependencies.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Project CRUD routes
router.use('/', crudRoutes);

// File management routes
router.use('/', fileRoutes);

// Dependency management routes
router.use('/', dependencyRoutes);

export default router;

