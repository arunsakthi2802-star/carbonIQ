import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AuditLog } from '../models/AuditLog';
import { mlClient } from '../services/mlClient.service';

export const getModelStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const resp = await mlClient.get('/model/status');
    res.json(resp.data);
  } catch (error: any) {
    res.status(503).json({
      success: false,
      error: { code: 'ML_SERVICE_DOWN', message: 'Machine learning microservice is currently unreachable.' }
    });
  }
};

export const getModelMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    const resp = await mlClient.get('/model/metrics');
    res.json(resp.data);
  } catch (error: any) {
    res.status(503).json({
      success: false,
      error: { code: 'ML_SERVICE_DOWN', message: 'Machine learning microservice is currently unreachable.' }
    });
  }
};

export const trainModel = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;

    const resp = await mlClient.post('/train');

    await AuditLog.create({
      companyId: new mongoose.Types.ObjectId(companyId),
      userId: new mongoose.Types.ObjectId(userId),
      action: 'MODEL_TRAINED',
      entityType: 'MLModel',
      metadata: resp.data.data
    });

    res.json(resp.data);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'TRAINING_FAILED', message: error.message }
    });
  }
};
