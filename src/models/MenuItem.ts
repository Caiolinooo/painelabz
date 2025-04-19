import mongoose, { Schema, Document } from 'mongoose';

export interface IMenuItem extends Document {
  href: string;
  label: string;
  icon: string;
  external: boolean;
  enabled: boolean;
  order: number;
  adminOnly: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MenuItemSchema: Schema = new Schema(
  {
    href: { type: String, required: true },
    label: { type: String, required: true },
    icon: { type: String, required: true },
    external: { type: Boolean, default: false },
    enabled: { type: Boolean, default: true },
    order: { type: Number, required: true },
    adminOnly: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.MenuItem || mongoose.model<IMenuItem>('MenuItem', MenuItemSchema);
