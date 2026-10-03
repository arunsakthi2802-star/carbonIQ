import { Router } from 'express';
import { getModelStatus, getModelMetrics, trainModel } from '../controllers/model.controller';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticateJWT);

router.get('/status', getModelStatus);
router.get('/metrics', getModelMetrics);
router.post('/train', requireRole('admin'), trainModel);

export default router;
