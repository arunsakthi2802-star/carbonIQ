import axios from 'axios';
import { mlClient } from './mlClient.service';

export interface DecarbonizationInsightPayload {
  totalKg: number;
  scope1Kg: number;
  scope2Kg: number;
  scope3Kg: number;
  baselineTotalKg: number;
  correctedTotalKg: number;
  topFactors?: any[];
  period: string;
  companyName: string;
}

export interface InsightResult {
  source: string;
  provider: 'GeminiProvider' | 'RuleBasedProvider';
  summary: string;
  hotspots: Array<{ category: string; metric: string; priority: string; detail: string }>;
  trend: string;
  opportunities: Array<{ title: string; impact: string; description: string }>;
  recommendedActions: string[];
  riskFlags: Array<{ flag: string; severity: string; message: string }>;
}

export interface AIProvider {
  generateInsights(payload: DecarbonizationInsightPayload): Promise<InsightResult>;
}

export class RuleBasedProvider implements AIProvider {
  async generateInsights(payload: DecarbonizationInsightPayload): Promise<InsightResult> {
    try {
      const res = await mlClient.post('/insights/fallback', payload);
      return res.data.data;
    } catch (e: any) {
      // Direct local fallback if ML service unreachable
      const tot = payload.totalKg || 1;
      const s3Pct = (payload.scope3Kg / tot) * 100;
      return {
        source: 'Rule-Based Fallback Engine (Internal)',
        provider: 'RuleBasedProvider',
        summary: `Reporting period ${payload.period} shows total footprint of ${(payload.totalKg/1000).toFixed(2)} t CO2e with Scope 3 representing ${s3Pct.toFixed(1)}%.`,
        hotspots: [
          { category: 'Freight Logistics & Raw Materials', metric: `${s3Pct.toFixed(1)}% of footprint`, priority: 'High', detail: 'Upstream supply chain represents primary decarbonization focus.' }
        ],
        trend: 'Operational volumes drive emissions intensity.',
        opportunities: [
          { title: 'Intermodal Freight Transition', impact: '15-25% reduction', description: 'Shift long-haul road freight corridors to electric rail.' }
        ],
        recommendedActions: [
          'Engage key Tier-1 freight logistics suppliers for direct fuel consumption disclosure.',
          'Assess rooftop solar PPA viability to abate Scope 2 purchased electricity.'
        ],
        riskFlags: [
          { flag: 'Aged Combustion Fleet', severity: 'Warning', message: 'Equipment older than 8 years carries thermal efficiency penalties.' }
        ]
      };
    }
  }
}

export class GeminiProvider implements AIProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateInsights(payload: DecarbonizationInsightPayload): Promise<InsightResult> {
    if (!this.apiKey) {
      const fallback = new RuleBasedProvider();
      return fallback.generateInsights(payload);
    }

    try {
      const prompt = `
You are CarbonIQ's Chief Sustainability & Decarbonization Intelligence Advisor.
Analyze the following corporate carbon footprint data for ${payload.companyName} (Period: ${payload.period}):
- Total Footprint: ${(payload.totalKg / 1000).toFixed(2)} t CO2e (${payload.totalKg.toLocaleString()} kg CO2e)
- Scope 1 (Direct Fuel/Boilers): ${(payload.scope1Kg / 1000).toFixed(2)} t CO2e (${((payload.scope1Kg / payload.totalKg) * 100).toFixed(1)}%)
- Scope 2 (Grid Electricity): ${(payload.scope2Kg / 1000).toFixed(2)} t CO2e (${((payload.scope2Kg / payload.totalKg) * 100).toFixed(1)}%)
- Scope 3 (Value Chain Logistics & Sourcing): ${(payload.scope3Kg / 1000).toFixed(2)} t CO2e (${((payload.scope3Kg / payload.totalKg) * 100).toFixed(1)}%)
- Baseline Estimate: ${(payload.baselineTotalKg / 1000).toFixed(2)} t CO2e vs ML-Corrected Estimate: ${(payload.correctedTotalKg / 1000).toFixed(2)} t CO2e
- Top SHAP Drivers: ${JSON.stringify(payload.topFactors?.slice(0, 3) || [])}

RULES:
1. Base your response strictly on the numbers provided above. DO NOT invent measurements or regulatory citations.
2. Return ONLY valid JSON with keys: "summary", "hotspots", "trend", "opportunities", "recommendedActions", "riskFlags".
3. "hotspots" must be an array of objects: { category, metric, priority, detail }.
4. "opportunities" must be an array of objects: { title, impact, description }.
5. "riskFlags" must be an array of objects: { flag, severity, message }.
6. "recommendedActions" must be an array of strings.
`;

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        },
        { timeout: 8000 }
      );

      const text = response.data.candidates[0].content.parts[0].text;
      const parsed = JSON.parse(text);

      return {
        source: 'Google Gemini 1.5 Flash (Generative AI)',
        provider: 'GeminiProvider',
        summary: parsed.summary,
        hotspots: parsed.hotspots || [],
        trend: parsed.trend || 'Trend reflects operational activity scale.',
        opportunities: parsed.opportunities || [],
        recommendedActions: parsed.recommendedActions || [],
        riskFlags: parsed.riskFlags || []
      };
    } catch (err: any) {
      console.warn(`Gemini API call failed (${err.message}). Using deterministic rule-based fallback.`);
      const fallback = new RuleBasedProvider();
      return fallback.generateInsights(payload);
    }
  }
}

export const getAIProvider = (): AIProvider => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey.trim() !== '') {
    return new GeminiProvider(apiKey.trim());
  }
  return new RuleBasedProvider();
};
