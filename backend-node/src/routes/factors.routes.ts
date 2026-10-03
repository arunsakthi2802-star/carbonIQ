import { Router } from 'express';
import {
  getEmissionFactors,
  createEmissionFactor,
  updateEmissionFactor,
  deleteEmissionFactor
} from '../controllers/factors.controller';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticateJWT);

router.get('/', getEmissionFactors);
router.post('/', requireRole('admin'), createEmissionFactor);
router.put('/:id', requireRole('admin'), updateEmissionFactor);
router.delete('/:id', requireRole('admin'), deleteEmissionFactor);

export default router;
