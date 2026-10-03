import mongoose from 'mongoose';
import { ActivityEntry } from '../models/ActivityEntry';
import { CalculationResult } from '../models/CalculationResult';
import { ExplainabilityResult } from '../models/ExplainabilityResult';
import { AuditLog } from '../models/AuditLog';
import { mlClient } from './mlClient.service';

export const deriveSeasonFromPeriod = (period: string): string => {
  if (!period || !period.includes('-')) return 'spring';
  const month = parseInt(period.split('-')[1], 10);
  if ([12, 1, 2].includes(month)) return 'winter';
  if ([3, 4, 5].includes(month)) return 'spring';
  if ([6, 7, 8].includes(month)) return 'summer';
  return 'autumn';
};

export const recalculateEmissions = async (companyId: string, period: string, userId?: string) => {
  const companyObjId = new mongoose.Types.ObjectId(companyId);
  const entries = await ActivityEntry.find({ companyId: companyObjId, period });

  if (!entries || entries.length === 0) {
    // Clear calculation for empty period
    await CalculationResult.findOneAndUpdate(
      { companyId: companyObjId, period },
      {
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
        updatedAt: new Date()
      },
      { upsert: true }
    );
    await ExplainabilityResult.deleteMany({ companyId: companyObjId, period });
    return null;
  }

  const rawEntries = entries.map((e) => ({
    activityType: e.activityType,
    quantity: e.quantity,
    unit: e.unit,
    region: e.region,
    equipmentAgeYears: e.equipmentAgeYears,
    cargoWeightTons: e.cargoWeightTons,
    supplierId: e.supplierId,
    period: e.period
  }));

  const season = deriveSeasonFromPeriod(period);

  try {
    // 1. Calculate baseline emissions
    const baselineResp = await mlClient.post('/calculate', { entries: rawEntries });
    const baselineData = baselineResp.data.data;

    // 2. Predict ML operational correction
    const correctResp = await mlClient.post('/correct', { entries: rawEntries, season });
    const correctData = correctResp.data.data;

    // 3. Update individual entries with baseline & corrected values
    if (correctData.items && correctData.items.length === entries.length) {
      for (let i = 0; i < entries.length; i++) {
        const item = correctData.items[i];
        entries[i].baselineKg = item.baselineKg;
        entries[i].correctedKg = item.correctedKg;
        await entries[i].save();
      }
    }

    // 4. Generate SHAP Tree Explainability
    const explainResp = await mlClient.post('/explain', { entries: rawEntries, season });
    const explainData = explainResp.data.data;

    // 5. Upsert CalculationResult
    const calcResult = await CalculationResult.findOneAndUpdate(
      { companyId: companyObjId, period },
      {
        scope1Kg: baselineData.scope1Kg,
        scope2Kg: baselineData.scope2Kg,
        scope3Kg: baselineData.scope3Kg,
        baselineTotalKg: baselineData.baselineTotalKg,
        correctedTotalKg: correctData.correctedTotalKg,
        totalKg: correctData.correctedTotalKg, // Primary auditable display is corrected total
        adjustmentKg: correctData.adjustmentKg,
        adjustmentPct: correctData.adjustmentPct,
        breakdown: baselineData.breakdown,
        modelVersion: correctData.modelVersion || '1.0.0',
        activityCount: entries.length,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    // 6. Upsert ExplainabilityResult
    await ExplainabilityResult.findOneAndUpdate(
      { companyId: companyObjId, period },
      {
        calculationResultId: calcResult._id,
        topFactors: explainData.topFactors || [],
        explainerType: explainData.explainerType || 'XGBoost Tree SHAP Explainer',
        generatedAt: new Date()
      },
      { upsert: true }
    );

    // 7. Audit Log
    if (userId) {
      await AuditLog.create({
        companyId: companyObjId,
        userId: new mongoose.Types.ObjectId(userId),
        action: 'CALCULATION_ORCHESTRATED',
        entityType: 'Period',
        entityId: period,
        metadata: {
          period,
          totalKg: correctData.correctedTotalKg,
          activityCount: entries.length
        }
      });
    }

    return {
      calculation: calcResult,
      explainability: explainData
    };
  } catch (error: any) {
    console.error(`Calculation orchestration failed for period ${period}:`, error.message);
    throw error;
  }
};
