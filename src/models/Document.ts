import mongoose, { Schema, Document as MongoDocument } from 'mongoose';

export interface IDocument extends MongoDocument {
  title: string;
  description: string;
  category: string;
  language: string;
  file: string;
  enabled: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    language: { type: String, required: true },
    file: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    order: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Document || mongoose.model<IDocument>('Document', DocumentSchema);
