import { Router } from 'express';
import {
  generateReport,
  getReportsList,
  downloadReportFile,
  deleteReport
} from '../controllers/report.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateJWT);

router.post('/generate', generateReport);
router.get('/', getReportsList);
router.get('/:filename/download', downloadReportFile);
router.delete('/:id', deleteReport);

export default router;
