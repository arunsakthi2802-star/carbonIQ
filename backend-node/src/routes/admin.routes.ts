import { Router } from 'express';
import {
  getUsers,
  createUser,
  updateUserRole,
  getAuditLogs,
  getSystemStatus
} from '../controllers/admin.controller';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticateJWT);
router.use(requireRole('admin'));

router.get('/users', getUsers);
router.post('/users', createUser);
router.patch('/users/:id/role', updateUserRole);
router.get('/audit-logs', getAuditLogs);
router.get('/system-status', getSystemStatus);

export default router;
