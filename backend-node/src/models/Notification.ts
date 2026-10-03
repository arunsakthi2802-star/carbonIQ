import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  companyId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  read: boolean;
  link?: string;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['info', 'success', 'warning', 'alert'], default: 'info' },
    read: { type: Boolean, default: false },
    link: { type: String }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NotificationSchema.index({ companyId: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
