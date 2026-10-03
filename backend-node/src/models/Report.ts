import mongoose, { Document, Schema } from 'mongoose';

export interface IReport extends Document {
  companyId: mongoose.Types.ObjectId;
  period: string;
  framework: string;
  fileName: string;
  filePath: string;
  downloadUrl: string;
  createdBy?: mongoose.Types.ObjectId;
  reportVersion: string;
  status: 'ready' | 'generating' | 'failed';
  totalKg: number;
  scope1Kg: number;
  scope2Kg: number;
  scope3Kg: number;
  generatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    period: { type: String, required: true },
    framework: { type: String, required: true, default: 'SEBI BRSR' },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    downloadUrl: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reportVersion: { type: String, default: '1.0.0' },
    status: { type: String, enum: ['ready', 'generating', 'failed'], default: 'ready' },
    totalKg: { type: Number, default: 0 },
    scope1Kg: { type: Number, default: 0 },
    scope2Kg: { type: Number, default: 0 },
    scope3Kg: { type: Number, default: 0 },
    generatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

ReportSchema.index({ companyId: 1, period: 1 });

export const Report = mongoose.model<IReport>('Report', ReportSchema);
