import { Router } from 'express';
import { getAiInsights } from '../controllers/ai.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticateJWT);
router.get('/insights', getAiInsights);

export default router;
