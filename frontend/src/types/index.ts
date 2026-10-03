export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
  firstName?: string;
  lastName?: string;
}

export interface Company {
  id: string;
  name: string;
  industry: string;
  country: string;
  settings?: {
    defaultReportingPeriod?: string;
    factorSource?: string;
    unitPreference?: 'kg' | 't';
    currency?: string;
    aiProvider?: 'gemini' | 'rule_based';
  };
}

export interface ActivityEntry {
  _id: string;
  companyId: string;
  period: string;
  activityType: 'electricity' | 'diesel' | 'road_freight' | 'cotton';
  quantity: number;
  unit: string;
  region: string;
  equipmentAgeYears: number;
  cargoWeightTons?: number;
  supplierId?: string;
  facility?: string;
  department?: string;
  notes?: string;
  baselineKg?: number;
  correctedKg?: number;
  createdAt: string;
}

export interface CalculationResult {
  _id?: string;
  companyId?: string;
  period: string;
  scope1Kg: number;
  scope2Kg: number;
  scope3Kg: number;
  totalKg: number;
  baselineTotalKg: number;
  correctedTotalKg: number;
  adjustmentKg: number;
  adjustmentPct: number;
  breakdown: Record<string, number>;
  modelVersion: string;
  activityCount: number;
}

export interface ShapFactor {
  feature: string;
  label: string;
  contribution: number;
  contributionPct: number;
  direction: 'positive' | 'negative';
  plainLanguage: string;
  rank: number;
}

export interface ExplainabilityResult {
  topFactors: ShapFactor[];
  explainerType: string;
}

export interface DecarbonizationInsight {
  source: string;
  provider: 'GeminiProvider' | 'RuleBasedProvider';
  summary: string;
  hotspots: Array<{ category: string; metric: string; priority: string; detail: string }>;
  trend: string;
  opportunities: Array<{ title: string; impact: string; description: string }>;
  recommendedActions: string[];
  riskFlags: Array<{ flag: string; severity: string; message: string }>;
}

export interface WhatIfScenario {
  _id: string;
  period: string;
  scenarioName: string;
  changes: Record<string, number>;
  currentBaselineTotalKg: number;
  currentCorrectedTotalKg: number;
  projectedBaselineTotalKg: number;
  projectedTotalKg: number;
  savingsKg: number;
  savingsTonnes: number;
  reductionPct: number;
  createdAt: string;
}

export interface ReportItem {
  _id: string;
  period: string;
  framework: string;
  fileName: string;
  filePath: string;
  downloadUrl: string;
  reportVersion: string;
  status: 'ready' | 'generating' | 'failed';
  totalKg: number;
  scope1Kg: number;
  scope2Kg: number;
  scope3Kg: number;
  generatedAt: string;
}

export interface EmissionFactor {
  _id: string;
  companyId?: string | null;
  activityType: string;
  name: string;
  factorValue: number;
  unit: string;
  scope: 1 | 2 | 3;
  region: string;
  source: string;
  active: boolean;
}

export interface AuditLogItem {
  _id: string;
  action: string;
  entityType: string;
  entityId?: string;
  userId?: {
    email: string;
    firstName?: string;
    lastName?: string;
  };
  metadata?: Record<string, any>;
  createdAt: string;
}
