import mongoose, { Document, Schema } from 'mongoose';

export interface IEmissionFactor extends Document {
  companyId?: mongoose.Types.ObjectId; // null for system defaults
  activityType: string;
  name: string;
  factorValue: number;
  unit: string;
  scope: 1 | 2 | 3;
  region: string;
  source: string;
  effectiveDate: Date;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EmissionFactorSchema = new Schema<IEmissionFactor>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', default: null, index: true },
    activityType: { type: String, required: true, trim: true },
    name: { type: String, required: true },
    factorValue: { type: Number, required: true },
    unit: { type: String, required: true },
    scope: { type: Number, enum: [1, 2, 3], required: true },
    region: { type: String, default: 'Global' },
    source: { type: String, default: 'GHG Protocol Baseline' },
    effectiveDate: { type: Date, default: Date.now },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const EmissionFactor = mongoose.model<IEmissionFactor>('EmissionFactor', EmissionFactorSchema);
