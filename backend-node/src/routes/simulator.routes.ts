import { Router } from 'express';
import {
  runWhatIfSimulation,
  saveWhatIfScenario,
  getWhatIfScenarios,
  deleteWhatIfScenario
} from '../controllers/simulator.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateJWT);

router.post('/', runWhatIfSimulation);
router.post('/save', saveWhatIfScenario);
router.get('/', getWhatIfScenarios);
router.delete('/:id', deleteWhatIfScenario);

export default router;
