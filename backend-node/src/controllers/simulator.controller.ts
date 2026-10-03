import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { ActivityEntry } from '../models/ActivityEntry';
import { WhatIfScenario } from '../models/WhatIfScenario';
import { AuditLog } from '../models/AuditLog';
import { mlClient } from '../services/mlClient.service';

export const runWhatIfSimulation = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId;
    const { period, adjustments } = req.body;

    const targetPeriod = period || new Date().toISOString().substring(0, 7);

    const entries = await ActivityEntry.find({
      companyId: new mongoose.Types.ObjectId(companyId),
      period: targetPeriod
    });

    if (!entries || entries.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_ENTRIES', message: `No activity records found for period ${targetPeriod} to simulate.` }
      });
      return;
    }

    const rawEntries = entries.map((e) => ({
      activityType: e.activityType,
      quantity: e.quantity,
      unit: e.unit,
      region: e.region,
      equipmentAgeYears: e.equipmentAgeYears,
      cargoWeightTons: e.cargoWeightTons
    }));

    const response = await mlClient.post('/whatif', {
      entries: rawEntries,
      adjustments: adjustments || {}
    });

    res.json({
      success: true,
      data: response.data.data
    });
  } catch (error: any) {
    console.error('Error running simulation:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const saveWhatIfScenario = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const {
      scenarioName,
      period,
      changes,
      currentBaselineTotalKg,
      currentCorrectedTotalKg,
      projectedBaselineTotalKg,
      projectedTotalKg,
      savingsKg,
      savingsTonnes,
      reductionPct
    } = req.body;

    if (!scenarioName || !changes) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Scenario name and changes are required.' }
      });
      return;
    }

    const scenario = await WhatIfScenario.create({
      companyId: new mongoose.Types.ObjectId(companyId),
      period: period || new Date().toISOString().substring(0, 7),
      scenarioName: scenarioName.trim(),
      changes,
      currentBaselineTotalKg: currentBaselineTotalKg || 0,
      currentCorrectedTotalKg: currentCorrectedTotalKg || 0,
      projectedBaselineTotalKg: projectedBaselineTotalKg || 0,
      projectedTotalKg: projectedTotalKg || 0,
      savingsKg: savingsKg || 0,
      savingsTonnes: savingsTonnes || 0,
      reductionPct: reductionPct || 0,
      createdBy: new mongoose.Types.ObjectId(userId)
    });

    await AuditLog.create({
      companyId: new mongoose.Types.ObjectId(companyId),
      userId: new mongoose.Types.ObjectId(userId),
      action: 'SCENARIO_CREATED',
      entityType: 'WhatIfScenario',
      entityId: scenario._id.toString(),
      metadata: { scenarioName: scenario.scenarioName, savingsTonnes: scenario.savingsTonnes }
    });

    res.status(201).json({ success: true, data: scenario });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const getWhatIfScenarios = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId;
    const scenarios = await WhatIfScenario.find({
      companyId: new mongoose.Types.ObjectId(companyId)
    }).sort({ createdAt: -1 });

    res.json({ success: true, data: scenarios });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const deleteWhatIfScenario = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId;
    const id = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid scenario ID' } });
      return;
    }

    const deleted = await WhatIfScenario.findOneAndDelete({
      _id: id,
      companyId: new mongoose.Types.ObjectId(companyId)
    });

    if (!deleted) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Scenario not found' } });
      return;
    }

    res.json({ success: true, data: { message: 'Scenario deleted successfully' } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
