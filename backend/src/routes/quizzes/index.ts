import { Router } from 'express';
import publicRoutes from './public.js';
import studentRoutes from './student.js';
import teacherRoutes from './teacher.js';

const router = Router();

// Public routes (no auth required) - must be first
router.use('/public', publicRoutes);

// Teacher routes (requires auth + teacher role)
router.use('/teacher', teacherRoutes);

// Student routes (requires auth) - includes shared routes like GET / and GET /:id
router.use('/', studentRoutes);

export default router;

