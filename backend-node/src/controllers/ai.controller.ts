import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { CalculationResult } from '../models/CalculationResult';
import { ExplainabilityResult } from '../models/ExplainabilityResult';
import { Company } from '../models/Company';
import { getAIProvider } from '../services/aiProvider.service';

export const getAiInsights = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId;
    const { period } = req.query;

    const targetPeriod = (period as string) || new Date().toISOString().substring(0, 7);

    const [company, calc, explain] = await Promise.all([
      Company.findById(companyId),
      CalculationResult.findOne({ companyId: new mongoose.Types.ObjectId(companyId), period: targetPeriod }),
      ExplainabilityResult.findOne({ companyId: new mongoose.Types.ObjectId(companyId), period: targetPeriod })
    ]);

    if (!calc || calc.totalKg === 0) {
      res.json({
        success: true,
        data: {
          source: 'Rule-Based Fallback Engine',
          provider: 'RuleBasedProvider',
          summary: `No emissions activity recorded for period ${targetPeriod}. Enter activity data or seed demo data to generate AI insights.`,
          hotspots: [],
          trend: 'Awaiting activity ingestion.',
          opportunities: [
            { title: 'Data Collection', impact: 'Baseline establishment', description: 'Log operational fuel, electricity, and freight to initialize AI analysis.' }
          ],
          recommendedActions: ['Upload monthly energy bills and freight records.'],
          riskFlags: []
        }
      });
      return;
    }

    const aiProvider = getAIProvider();
    const insights = await aiProvider.generateInsights({
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

    res.json({ success: true, data: insights });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
