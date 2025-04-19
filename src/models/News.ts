import mongoose, { Schema, Document } from 'mongoose';

export interface INews extends Document {
  title: string;
  description: string;
  date: Date;
  file: string;
  enabled: boolean;
  featured: boolean;
  category: string;
  author: string;
  thumbnail?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NewsSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    file: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    category: { type: String, required: true },
    author: { type: String, required: true },
    thumbnail: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.News || mongoose.model<INews>('News', NewsSchema);
