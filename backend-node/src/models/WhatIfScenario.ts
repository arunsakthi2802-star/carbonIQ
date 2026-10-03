import mongoose, { Document, Schema } from 'mongoose';

export interface IWhatIfScenario extends Document {
  companyId: mongoose.Types.ObjectId;
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
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const WhatIfScenarioSchema = new Schema<IWhatIfScenario>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    period: { type: String, required: true },
    scenarioName: { type: String, required: true, trim: true },
    changes: { type: Map, of: Number, required: true },
    currentBaselineTotalKg: { type: Number, default: 0 },
    currentCorrectedTotalKg: { type: Number, default: 0 },
    projectedBaselineTotalKg: { type: Number, default: 0 },
    projectedTotalKg: { type: Number, default: 0 },
    savingsKg: { type: Number, default: 0 },
    savingsTonnes: { type: Number, default: 0 },
    reductionPct: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

export const WhatIfScenario = mongoose.model<IWhatIfScenario>('WhatIfScenario', WhatIfScenarioSchema);
