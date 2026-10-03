import mongoose, { Document, Schema } from 'mongoose';

export interface IShapFactor {
  feature: string;
  label: string;
  contribution: number;
  contributionPct: number;
  direction: 'positive' | 'negative';
  plainLanguage: string;
  rank: number;
}

export interface IExplainabilityResult extends Document {
  companyId: mongoose.Types.ObjectId;
  period: string;
  calculationResultId?: mongoose.Types.ObjectId;
  topFactors: IShapFactor[];
  explainerType: string;
  generatedAt: Date;
}

const ExplainabilityResultSchema = new Schema<IExplainabilityResult>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    period: { type: String, required: true, index: true },
    calculationResultId: { type: Schema.Types.ObjectId, ref: 'CalculationResult' },
    topFactors: [
      {
        feature: { type: String, required: true },
        label: { type: String, default: '' },
        contribution: { type: Number, default: 0 },
        contributionPct: { type: Number, default: 0 },
        direction: { type: String, enum: ['positive', 'negative'], default: 'positive' },
        plainLanguage: { type: String, default: '' },
        rank: { type: Number, default: 1 }
      }
    ],
    explainerType: { type: String, default: 'XGBoost Tree SHAP Explainer' },
    generatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

ExplainabilityResultSchema.index({ companyId: 1, period: 1 });

export const ExplainabilityResult = mongoose.model<IExplainabilityResult>('ExplainabilityResult', ExplainabilityResultSchema);
