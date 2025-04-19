import mongoose, { Schema, Document } from 'mongoose';

export interface ISiteConfig extends Document {
  title: string;
  description: string;
  logo: string;
  favicon: string;
  primaryColor: string;
  secondaryColor: string;
  companyName: string;
  contactEmail: string;
  footerText: string;
  createdAt: Date;
  updatedAt: Date;
}

const SiteConfigSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    logo: { type: String, required: true },
    favicon: { type: String, required: true },
    primaryColor: { type: String, required: true },
    secondaryColor: { type: String, required: true },
    companyName: { type: String, required: true },
    contactEmail: { type: String, required: true },
    footerText: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.SiteConfig || mongoose.model<ISiteConfig>('SiteConfig', SiteConfigSchema);
