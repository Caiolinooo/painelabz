import mongoose, { Document, Schema } from 'mongoose';

export interface IAuthorizedUser extends Document {
  email?: string;
  phoneNumber?: string;
  inviteCode?: string;
  domain?: string;
  status: 'active' | 'pending' | 'rejected' | 'expired';
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date; // Data de expiração para códigos de convite
  maxUses?: number; // Número máximo de usos para códigos de convite
  usedCount?: number; // Número de vezes que o código foi usado
  createdBy?: string; // ID do usuário que criou o registro
  notes?: string | string[];
}

const AuthorizedUserSchema = new Schema<IAuthorizedUser>(
  {
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true, // Permite que seja null/undefined, mas se existir deve ser único
      index: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
      sparse: true, // Permite que seja null/undefined, mas se existir deve ser único
      index: true,
    },
    inviteCode: {
      type: String,
      trim: true,
      sparse: true, // Permite que seja null/undefined, mas se existir deve ser único
      index: true,
    },
    domain: {
      type: String,
      trim: true,
      lowercase: true,
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'rejected', 'expired'],
      default: 'active',
    },
    expiresAt: {
      type: Date,
      default: function() {
        // Se for um código de convite, definir data de expiração padrão
        if (this.inviteCode) {
          const days = parseInt(process.env.INVITE_CODE_EXPIRY_DAYS || '30');
          const date = new Date();
          date.setDate(date.getDate() + days);
          return date;
        }
        return null;
      }
    },
    maxUses: {
      type: Number,
      default: function() {
        // Se for um código de convite, definir número máximo de usos padrão
        if (this.inviteCode) {
          return parseInt(process.env.INVITE_CODE_MAX_USES || '1');
        }
        return null;
      }
    },
    usedCount: {
      type: Number,
      default: 0
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Índice composto para garantir que pelo menos um dos campos (email, phoneNumber, inviteCode, domain) esteja presente
AuthorizedUserSchema.pre('validate', function (next) {
  if (!this.email && !this.phoneNumber && !this.inviteCode && !this.domain) {
    return next(new Error('Pelo menos um método de autorização deve ser fornecido (email, phoneNumber, inviteCode ou domain)'));
  }
  next();
});

// Verifica se o modelo já foi compilado para evitar erros de sobrescrita
const AuthorizedUser = mongoose.models.AuthorizedUser || mongoose.model<IAuthorizedUser>('AuthorizedUser', AuthorizedUserSchema);

export default AuthorizedUser;
