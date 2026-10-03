import mongoose, { Document, Schema } from 'mongoose';

export interface ICompany extends Document {
  name: string;
  industry: string;
  country: string;
  settings: {
    defaultReportingPeriod?: string;
    factorSource?: string;
    unitPreference?: 'kg' | 't';
    currency?: string;
    aiProvider?: 'gemini' | 'rule_based';
  };
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true, trim: true },
    industry: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    settings: {
      defaultReportingPeriod: { type: String, default: '2026-08' },
      factorSource: { type: String, default: 'Local Standard Factors' },
      unitPreference: { type: String, enum: ['kg', 't'], default: 't' },
      currency: { type: String, default: 'USD' },
      aiProvider: { type: String, enum: ['gemini', 'rule_based'], default: 'gemini' }
    }
  },
  { timestamps: true }
);

export const Company = mongoose.model<ICompany>('Company', CompanySchema);
