import { Router } from 'express';
import {
  createActivityEntry,
  getActivityEntries,
  getActivityById,
  deleteActivityEntry,
  bulkUploadCSV
} from '../controllers/activity.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateJWT);

router.post('/', createActivityEntry);
router.get('/', getActivityEntries);
router.post('/bulk', bulkUploadCSV);
router.get('/:id', getActivityById);
router.delete('/:id', deleteActivityEntry);

export default router;
