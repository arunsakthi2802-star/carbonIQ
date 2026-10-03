import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { CalculationResult } from '../models/CalculationResult';
import { ExplainabilityResult } from '../models/ExplainabilityResult';
import { ActivityEntry } from '../models/ActivityEntry';
import { Company } from '../models/Company';
import { AuditLog } from '../models/AuditLog';
import { recalculateEmissions } from '../services/calculationOrchestrator.service';
import { getAIProvider } from '../services/aiProvider.service';

export const getDashboardSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId;
    const { period } = req.query;

    const targetPeriod = (period as string) || new Date().toISOString().substring(0, 7);

    // Fetch current period calculation
    let calc = await CalculationResult.findOne({
      companyId: new mongoose.Types.ObjectId(companyId),
      period: targetPeriod
    });

    // If calculation record does not exist yet for this period, attempt calculation
    if (!calc) {
      const entryCount = await ActivityEntry.countDocuments({
        companyId: new mongoose.Types.ObjectId(companyId),
        period: targetPeriod
      });
      if (entryCount > 0) {
        const recalc = await recalculateEmissions(companyId, targetPeriod);
        calc = recalc?.calculation as any;
      }
    }

    // Fetch SHAP Explainability for this period
    const explain = await ExplainabilityResult.findOne({
      companyId: new mongoose.Types.ObjectId(companyId),
      period: targetPeriod
    });

    // Fetch previous period for comparison
    const [yearStr, monthStr] = targetPeriod.split('-');
    let prevYear = parseInt(yearStr, 10);
    let prevMonth = parseInt(monthStr, 10) - 1;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }
    const prevPeriod = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

    const prevCalc = await CalculationResult.findOne({
      companyId: new mongoose.Types.ObjectId(companyId),
      period: prevPeriod
    });

    let prevComparisonPct = 0;
    if (calc && prevCalc && prevCalc.totalKg > 0) {
      prevComparisonPct = roundNumber(((calc.totalKg - prevCalc.totalKg) / prevCalc.totalKg) * 100, 1);
    }

    // AI / Fallback insights for current summary
    const company = await Company.findById(companyId);
    const aiProvider = getAIProvider();

    let insights = null;
    if (calc && calc.totalKg > 0) {
      insights = await aiProvider.generateInsights({
        totalKg: calc.totalKg,
        scope1Kg: calc.scope1Kg,
        scope2Kg: calc.scope2Kg,
        scope3Kg: calc.scope3Kg,
        baselineTotalKg: calc.baselineTotalKg,
        correctedTotalKg: calc.correctedTotalKg,
        topFactors: explain?.topFactors || [],
        period: targetPeriod,
        companyName: company?.name || 'Enterprise'
      });
    }

    res.json({
      success: true,
      data: {
        period: targetPeriod,
        previousPeriod: prevPeriod,
        summary: calc || {
          scope1Kg: 0,
          scope2Kg: 0,
          scope3Kg: 0,
          totalKg: 0,
          baselineTotalKg: 0,
          correctedTotalKg: 0,
          adjustmentKg: 0,
          adjustmentPct: 0,
          breakdown: {},
          activityCount: 0,
          modelVersion: '1.0.0'
        },
        comparison: {
          previousPeriod: prevPeriod,
          previousTotalKg: prevCalc?.totalKg || 0,
          changePct: prevComparisonPct,
          direction: prevComparisonPct <= 0 ? 'decrease' : 'increase'
        },
        explainability: explain || {
          topFactors: [],
          explainerType: 'XGBoost Tree SHAP Explainer'
        },
        insights
      }
    });
  } catch (error: any) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const getDashboardTrend = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId;

    const results = await CalculationResult.find({
      companyId: new mongoose.Types.ObjectId(companyId)
    }).sort({ period: 1 });

    const timeline = results.map(r => ({
      period: r.period,
      scope1Kg: r.scope1Kg,
      scope2Kg: r.scope2Kg,
      scope3Kg: r.scope3Kg,
      totalKg: r.totalKg,
      baselineTotalKg: r.baselineTotalKg,
      correctedTotalKg: r.correctedTotalKg,
      adjustmentKg: r.adjustmentKg,
      scope1Tonnes: roundNumber(r.scope1Kg / 1000, 2),
      scope2Tonnes: roundNumber(r.scope2Kg / 1000, 2),
      scope3Tonnes: roundNumber(r.scope3Kg / 1000, 2),
      totalTonnes: roundNumber(r.totalKg / 1000, 2)
    }));

    res.json({
      success: true,
      data: {
        timeline,
        totalPeriods: timeline.length
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const seedDemoData = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;

    // Clear existing activities for clean demo state
    await ActivityEntry.deleteMany({ companyId: new mongoose.Types.ObjectId(companyId) });
    await CalculationResult.deleteMany({ companyId: new mongoose.Types.ObjectId(companyId) });
    await ExplainabilityResult.deleteMany({ companyId: new mongoose.Types.ObjectId(companyId) });

    const periods: string[] = [];
    // Generate 24 continuous monthly periods ending at current month
    const now = new Date(2026, 7, 1); // 2026-08
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const p = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      periods.push(p);
    }

    const demoRecords: any[] = [];
    const suppliers = ['SUP-GLOBAL-101', 'SUP-LOGISTICS-404', 'SUP-TEXTILE-77', 'SUP-ENERGY-88'];
    const facilities = ['Bengaluru Tech Hub', 'Chennai SCM Center', 'Mumbai Port Facility', 'Pune Assembly Plant'];

    for (let idx = 0; idx < periods.length; idx++) {
      const p = periods[idx];
      const monthNum = parseInt(p.split('-')[1], 10);
      const isWinter = [12, 1, 2].includes(monthNum);
      const isSummer = [5, 6, 7].includes(monthNum);

      // Base trend factor simulating steady operational efficiency gains over time
      const efficiencyGain = 1.0 - (idx * 0.008); // up to ~18% reduction over 24 months

      // 1. Grid Electricity
      const elecBase = (isSummer ? 28000 : 21000) * efficiencyGain;
      demoRecords.push({
        companyId: new mongoose.Types.ObjectId(companyId),
        period: p,
        activityType: 'electricity',
        quantity: Math.round(elecBase),
        unit: 'kWh',
        region: 'IN',
        equipmentAgeYears: 6,
        supplierId: suppliers[3],
        facility: facilities[0],
        department: 'Operations',
        notes: 'Main fabrication and data center electricity'
      });

      // 2. Diesel Fuel
      const dieselBase = (isWinter ? 3800 : 2600) * efficiencyGain;
      demoRecords.push({
        companyId: new mongoose.Types.ObjectId(companyId),
        period: p,
        activityType: 'diesel',
        quantity: Math.round(dieselBase),
        unit: 'litre',
        region: 'IN',
        equipmentAgeYears: 11, // Aged equipment triggers XGBoost + SHAP uplift
        supplierId: suppliers[0],
        facility: facilities[1],
        department: 'Captive Power & Backup',
        notes: 'Backup diesel genset and fleet transport'
      });

      // 3. Road Freight Logistics
      const freightDist = (450 + (idx % 4) * 80) * efficiencyGain;
      const freightCargo = 12.5 + (idx % 3) * 2.0;
      demoRecords.push({
        companyId: new mongoose.Types.ObjectId(companyId),
        period: p,
        activityType: 'road_freight',
        quantity: Math.round(freightDist),
        cargoWeightTons: roundNumber(freightCargo, 1),
        unit: 'km',
        region: 'IN',
        equipmentAgeYears: 7,
        supplierId: suppliers[1],
        facility: facilities[2],
        department: 'Logistics',
        notes: 'Heavy commercial interstate highway freight'
      });

      // 4. Raw Material (Cotton)
      const cottonBase = (1400 + (idx % 5) * 150) * efficiencyGain;
      demoRecords.push({
        companyId: new mongoose.Types.ObjectId(companyId),
        period: p,
        activityType: 'cotton',
        quantity: Math.round(cottonBase),
        unit: 'kg',
        region: 'IN',
        equipmentAgeYears: 4,
        supplierId: suppliers[2],
        facility: facilities[3],
        department: 'Procurement',
        notes: 'Sustainable raw cotton yarn supply'
      });
    }

    // Insert demo activity entries
    await ActivityEntry.insertMany(demoRecords);

    // Recalculate each period
    for (const p of periods) {
      await recalculateEmissions(companyId, p, userId);
    }

    await AuditLog.create({
      companyId: new mongoose.Types.ObjectId(companyId),
      userId: new mongoose.Types.ObjectId(userId),
      action: 'SEED_DEMO_DATA',
      entityType: 'Company',
      entityId: companyId,
      metadata: { recordsCount: demoRecords.length, periodsCount: periods.length }
    });

    res.json({
      success: true,
      data: {
        message: 'Multi-year demo operational dataset loaded and calculated successfully.',
        recordsCreated: demoRecords.length,
        periodsCovered: periods.length,
        latestPeriod: periods[periods.length - 1]
      }
    });
  } catch (error: any) {
    console.error('Error seeding demo data:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const resetData = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;

    await ActivityEntry.deleteMany({ companyId: new mongoose.Types.ObjectId(companyId) });
    await CalculationResult.deleteMany({ companyId: new mongoose.Types.ObjectId(companyId) });
    await ExplainabilityResult.deleteMany({ companyId: new mongoose.Types.ObjectId(companyId) });

    await AuditLog.create({
      companyId: new mongoose.Types.ObjectId(companyId),
      userId: new mongoose.Types.ObjectId(userId),
      action: 'RESET_DATA',
      entityType: 'Company',
      entityId: companyId
    });

    res.json({ success: true, data: { message: 'All company activity and calculation records cleared.' } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

function roundNumber(num: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}
