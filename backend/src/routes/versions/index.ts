import { Router } from 'express';
import fileSnapshotRoutes from './fileSnapshots.js';
import projectSnapshotRoutes from './projectSnapshots.js';

const router = Router();

// File snapshot routes
router.use('/', fileSnapshotRoutes);

// Project snapshot routes
router.use('/', projectSnapshotRoutes);

export default router;

