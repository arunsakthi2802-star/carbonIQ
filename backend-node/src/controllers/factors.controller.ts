import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { EmissionFactor } from '../models/EmissionFactor';
import { AuditLog } from '../models/AuditLog';

export const getEmissionFactors = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId;

    // Return company custom factors as well as global baseline factors
    const factors = await EmissionFactor.find({
      $or: [
        { companyId: new mongoose.Types.ObjectId(companyId) },
        { companyId: null }
      ]
    }).sort({ activityType: 1 });

    res.json({ success: true, data: factors });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const createEmissionFactor = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const { activityType, name, factorValue, unit, scope, region, source } = req.body;

    if (!activityType || !name || factorValue === undefined || !unit || !scope) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'activityType, name, factorValue, unit, and scope are required.' }
      });
      return;
    }

    const factor = await EmissionFactor.create({
      companyId: new mongoose.Types.ObjectId(companyId),
      activityType: activityType.toLowerCase().trim(),
      name: name.trim(),
      factorValue: parseFloat(factorValue),
      unit: unit.trim(),
      scope: parseInt(scope, 10),
      region: (region || 'Global').trim(),
      source: (source || 'Custom Organization Factor').trim(),
      active: true
    });

    await AuditLog.create({
      companyId: new mongoose.Types.ObjectId(companyId),
      userId: new mongoose.Types.ObjectId(userId),
      action: 'FACTOR_CREATED',
      entityType: 'EmissionFactor',
      entityId: factor._id.toString(),
      metadata: { name: factor.name, factorValue: factor.factorValue }
    });

    res.status(201).json({ success: true, data: factor });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const updateEmissionFactor = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const { id } = req.params;

    const factor = await EmissionFactor.findOneAndUpdate(
      { _id: id, companyId: new mongoose.Types.ObjectId(companyId) },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );

    if (!factor) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Custom emission factor not found.' } });
      return;
    }

    await AuditLog.create({
      companyId: new mongoose.Types.ObjectId(companyId),
      userId: new mongoose.Types.ObjectId(userId),
      action: 'FACTOR_UPDATED',
      entityType: 'EmissionFactor',
      entityId: factor._id.toString(),
      metadata: req.body
    });

    res.json({ success: true, data: factor });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const deleteEmissionFactor = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId;
    const { id } = req.params;

    const factor = await EmissionFactor.findOneAndDelete({
      _id: id,
      companyId: new mongoose.Types.ObjectId(companyId)
    });

    if (!factor) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Emission factor not found' } });
      return;
    }

    res.json({ success: true, data: { message: 'Emission factor deleted successfully' } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
