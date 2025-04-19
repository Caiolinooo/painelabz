import mongoose, { Schema, Document } from 'mongoose';

export interface ICard extends Document {
  title: string;
  description: string;
  href: string;
  icon: string;
  color: string;
  hoverColor: string;
  external: boolean;
  enabled: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const CardSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    href: { type: String, required: true },
    icon: { type: String, required: true },
    color: { type: String, required: true },
    hoverColor: { type: String, required: true },
    external: { type: Boolean, default: false },
    enabled: { type: Boolean, default: true },
    order: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Card || mongoose.model<ICard>('Card', CardSchema);
