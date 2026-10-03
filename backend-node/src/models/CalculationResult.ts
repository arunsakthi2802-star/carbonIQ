import mongoose, { Document, Schema } from 'mongoose';

export interface ICalculationResult extends Document {
  companyId: mongoose.Types.ObjectId;
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
  updatedAt: Date;
}

const CalculationResultSchema = new Schema<ICalculationResult>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    period: { type: String, required: true, index: true },
    scope1Kg: { type: Number, default: 0 },
    scope2Kg: { type: Number, default: 0 },
    scope3Kg: { type: Number, default: 0 },
    totalKg: { type: Number, default: 0 },
    baselineTotalKg: { type: Number, default: 0 },
    correctedTotalKg: { type: Number, default: 0 },
    adjustmentKg: { type: Number, default: 0 },
    adjustmentPct: { type: Number, default: 0 },
    breakdown: { type: Map, of: Number, default: {} },
    modelVersion: { type: String, default: '1.0.0' },
    activityCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

CalculationResultSchema.index({ companyId: 1, period: 1 }, { unique: true });

export const CalculationResult = mongoose.model<ICalculationResult>('CalculationResult', CalculationResultSchema);
