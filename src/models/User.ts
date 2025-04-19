import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

// Interface para histórico de acesso
export interface AccessHistoryEntry {
  timestamp: Date;
  action: string;
  details?: string;
}

// Interface para permissões de acesso
export interface AccessPermissions {
  modules?: {
    dashboard?: boolean;
    manual?: boolean;
    procedimentos?: boolean;
    politicas?: boolean;
    calendario?: boolean;
    noticias?: boolean;
    reembolso?: boolean;
    contracheque?: boolean;
    ponto?: boolean;
    admin?: boolean;
    [key: string]: boolean | undefined;
  };
  features?: {
    [key: string]: boolean | undefined;
  };
}

export interface IUser extends Document {
  phoneNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  password?: string;
  role: 'ADMIN' | 'USER' | 'MANAGER';
  position?: string; // Cargo/função do usuário
  avatar?: string;
  department?: string;
  verificationCode?: string;
  verificationCodeExpires?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  passwordLastChanged?: Date;
  failedLoginAttempts?: number;
  lockUntil?: Date;
  active: boolean;
  accessHistory?: AccessHistoryEntry[];
  accessPermissions?: AccessPermissions;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;

  // Propriedade virtual para nome completo
  fullName?: string;
}

const UserSchema: Schema = new Schema(
  {
    phoneNumber: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, sparse: true },
    password: { type: String },
    role: { type: String, enum: ['ADMIN', 'USER', 'MANAGER'], default: 'USER' },
    position: { type: String }, // Cargo/função do usuário
    avatar: { type: String },
    department: { type: String },
    verificationCode: { type: String },
    verificationCodeExpires: { type: Date },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    passwordLastChanged: { type: Date },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    active: { type: Boolean, default: true },
    accessHistory: [{
      timestamp: { type: Date, default: Date.now },
      action: { type: String },
      details: { type: String }
    }],
    accessPermissions: {
      modules: {
        dashboard: { type: Boolean, default: true },
        manual: { type: Boolean, default: true },
        procedimentos: { type: Boolean, default: true },
        politicas: { type: Boolean, default: true },
        calendario: { type: Boolean, default: true },
        noticias: { type: Boolean, default: true },
        reembolso: { type: Boolean, default: true },
        contracheque: { type: Boolean, default: true },
        ponto: { type: Boolean, default: true },
        admin: { type: Boolean, default: false }
      },
      features: { type: Map, of: Boolean, default: {} }
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual para nome completo
UserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Método para comparar senha
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  console.log('Comparando senha no modelo:');
  console.log('- Senha fornecida (primeiros caracteres):', candidatePassword.substring(0, 3) + '...');
  console.log('- Senha armazenada (hash):', this.password);
  const isMatch = await bcrypt.compare(candidatePassword, this.password);
  console.log('- Resultado da comparação:', isMatch ? 'Senha correta' : 'Senha incorreta');
  return isMatch;
};

// Hash da senha antes de salvar
UserSchema.pre('save', async function(next) {
  const user = this as IUser;

  // Só hash a senha se ela foi modificada ou é nova
  if (!user.isModified('password') || !user.password) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);

    // Atualizar a data da última alteração de senha
    user.passwordLastChanged = new Date();

    next();
  } catch (error: any) {
    next(error);
  }
});

// Método para comparar senha
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Erro ao comparar senha:', error);
    return false;
  }
};

// Verificar se o modelo já existe para evitar sobrescrever
export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
