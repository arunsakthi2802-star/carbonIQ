import { Request, Response } from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { Report } from '../models/Report';
import { CalculationResult } from '../models/CalculationResult';
import { ExplainabilityResult } from '../models/ExplainabilityResult';
import { Company } from '../models/Company';
import { AuditLog } from '../models/AuditLog';
import { mlClient } from '../services/mlClient.service';

export const generateReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const { period, framework = 'SEBI BRSR' } = req.body;

    const targetPeriod = period || new Date().toISOString().substring(0, 7);

    const [company, calc, explain] = await Promise.all([
      Company.findById(companyId),
      CalculationResult.findOne({ companyId: new mongoose.Types.ObjectId(companyId), period: targetPeriod }),
      ExplainabilityResult.findOne({ companyId: new mongoose.Types.ObjectId(companyId), period: targetPeriod })
    ]);

    if (!calc || calc.totalKg === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_DATA', message: `No calculated emissions data available for period ${targetPeriod} to generate report.` }
      });
      return;
    }

    const payload = {
      companyName: company?.name || 'Enterprise Corporation Ltd.',
      period: targetPeriod,
      framework: framework.toUpperCase(),
      totalKg: calc.totalKg,
      baselineTotalKg: calc.baselineTotalKg,
      correctedTotalKg: calc.correctedTotalKg,
      scope1Kg: calc.scope1Kg,
      scope2Kg: calc.scope2Kg,
      scope3Kg: calc.scope3Kg,
      topFactors: explain?.topFactors || [],
      modelVersion: calc.modelVersion || '1.0.0'
    };

    const mlResp = await mlClient.post('/report', payload);
    const reportData = mlResp.data.data;

    const reportDoc = await Report.create({
      companyId: new mongoose.Types.ObjectId(companyId),
      period: targetPeriod,
      framework: framework.toUpperCase(),
      fileName: reportData.fileName,
      filePath: reportData.filePath,
      downloadUrl: `/api/reports/${reportData.fileName}/download`,
      createdBy: new mongoose.Types.ObjectId(userId),
      totalKg: calc.totalKg,
      scope1Kg: calc.scope1Kg,
      scope2Kg: calc.scope2Kg,
      scope3Kg: calc.scope3Kg,
      status: 'ready'
    });

    await AuditLog.create({
      companyId: new mongoose.Types.ObjectId(companyId),
      userId: new mongoose.Types.ObjectId(userId),
      action: 'REPORT_GENERATED',
      entityType: 'Report',
      entityId: reportDoc._id.toString(),
      metadata: { framework, period: targetPeriod, fileName: reportData.fileName }
    });

    res.status(201).json({
      success: true,
      data: reportDoc
    });
  } catch (error: any) {
    console.error('Error compiling report:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const getReportsList = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId;
    const reports = await Report.find({ companyId: new mongoose.Types.ObjectId(companyId) }).sort({ createdAt: -1 });
    res.json({ success: true, data: reports });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const downloadReportFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId;
    const filename = String(req.params.filename);

    // Secure multi-tenant lookup: ensure this report document belongs to the requesting company!
    const report = await Report.findOne({
      companyId: new mongoose.Types.ObjectId(companyId),
      fileName: filename
    });

    if (!report) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have authorization to access this report.' }
      });
      return;
    }

    const safeStorageDir = path.resolve(__dirname, '../../../storage/reports');
    const safeFilePath = path.join(safeStorageDir, path.basename(filename));

    if (!fs.existsSync(safeFilePath)) {
      res.status(404).json({ success: false, error: { code: 'FILE_NOT_FOUND', message: 'Report file does not exist on disk.' } });
      return;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    fs.createReadStream(safeFilePath).pipe(res);
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const deleteReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId;
    const id = String(req.params.id);

    const report = await Report.findOneAndDelete({
      _id: id,
      companyId: new mongoose.Types.ObjectId(companyId)
    });

    if (!report) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Report not found' } });
      return;
    }

    // Attempt deleting file on disk
    try {
      if (fs.existsSync(report.filePath)) {
        fs.unlinkSync(report.filePath);
      }
    } catch (e) {}

    res.json({ success: true, data: { message: 'Report deleted successfully' } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
