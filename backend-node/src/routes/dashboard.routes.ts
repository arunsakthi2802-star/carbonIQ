import { Router } from 'express';
import {
  getDashboardSummary,
  getDashboardTrend,
  seedDemoData,
  resetData
} from '../controllers/dashboard.controller';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateJWT);

router.get('/summary', getDashboardSummary);
router.get('/trend', getDashboardTrend);
router.post('/seed-demo', seedDemoData);
router.post('/reset-demo', requireRole('admin'), resetData);

export default router;
