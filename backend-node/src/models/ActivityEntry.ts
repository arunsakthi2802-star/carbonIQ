import mongoose, { Document, Schema } from 'mongoose';

export interface IActivityEntry extends Document {
  companyId: mongoose.Types.ObjectId;
  period: string; // YYYY-MM
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
  createdAt: Date;
  updatedAt: Date;
}

const ActivityEntrySchema = new Schema<IActivityEntry>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    period: { type: String, required: true, index: true }, // Format: YYYY-MM
    activityType: {
      type: String,
      required: true,
      enum: ['electricity', 'diesel', 'road_freight', 'cotton']
    },
    quantity: { type: Number, required: true, min: 0.001 },
    unit: { type: String, required: true },
    region: { type: String, default: 'IN' },
    equipmentAgeYears: { type: Number, default: 5, min: 0 },
    cargoWeightTons: { type: Number, default: 0 },
    supplierId: { type: String, default: '' },
    facility: { type: String, default: 'Primary Facility' },
    department: { type: String, default: 'Operations' },
    notes: { type: String, default: '' },
    baselineKg: { type: Number, default: 0 },
    correctedKg: { type: Number, default: 0 }
  },
  { timestamps: true }
);

ActivityEntrySchema.index({ companyId: 1, period: 1 });
ActivityEntrySchema.index({ companyId: 1, activityType: 1 });
ActivityEntrySchema.index({ companyId: 1, supplierId: 1 });

export const ActivityEntry = mongoose.model<IActivityEntry>('ActivityEntry', ActivityEntrySchema);
