import { Router } from 'express';
import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  verifyUser
} from '../controllers/user.controller';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Protect all user management endpoints with JWT authentication and admin authorization
router.use(authenticateJWT);
router.use(requireRole('admin'));

// CRUD and Verification routes
router.post('/', createUser);
router.get('/', getUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.post('/:id/verify', verifyUser);

export default router;
