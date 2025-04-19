import mongoose, { Schema, Document } from 'mongoose';

export interface IReimbursement extends Document {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  cargo: string;
  centroCusto: string;
  data: Date;
  tipoReembolso: string;
  iconeReembolso?: string;
  descricao: string;
  valorTotal: string;
  moeda: 'BRL' | 'USD' | 'EUR' | 'GBP';
  metodoPagamento: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  pixTipo?: string;
  pixChave?: string;
  comprovantes: Array<{
    nome: string;
    url: string;
    tipo: string;
    tamanho: number;
  }>;
  observacoes?: string;
  protocolo: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  dataCriacao: Date;
  dataAtualizacao: Date;
  historico: Array<{
    data: Date;
    status: string;
    observacao?: string;
    usuarioId?: string;
  }>;
}

const ReimbursementSchema: Schema = new Schema(
  {
    nome: { type: String, required: true },
    email: { type: String, required: true },
    telefone: { type: String, required: true },
    cpf: { type: String, required: true },
    cargo: { type: String, required: true },
    centroCusto: { type: String, required: true },
    data: { type: Date, required: true },
    tipoReembolso: { type: String, required: true },
    iconeReembolso: { type: String },
    descricao: { type: String, required: true },
    valorTotal: { type: String, required: true },
    moeda: { type: String, enum: ['BRL', 'USD', 'EUR', 'GBP'], default: 'BRL' },
    metodoPagamento: { type: String, required: true },
    banco: { type: String },
    agencia: { type: String },
    conta: { type: String },
    pixTipo: { type: String },
    pixChave: { type: String },
    comprovantes: [{
      nome: { type: String, required: true },
      url: { type: String, required: true },
      tipo: { type: String, required: true },
      tamanho: { type: Number, required: true }
    }],
    observacoes: { type: String },
    protocolo: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['pendente', 'aprovado', 'rejeitado'],
      default: 'pendente'
    },
    historico: [{
      data: { type: Date, default: Date.now },
      status: { type: String, required: true },
      observacao: { type: String },
      usuarioId: { type: Schema.Types.ObjectId, ref: 'User' }
    }]
  },
  { timestamps: { createdAt: 'dataCriacao', updatedAt: 'dataAtualizacao' } }
);

// Índices para melhorar a performance das consultas
ReimbursementSchema.index({ protocolo: 1 }, { unique: true });
ReimbursementSchema.index({ email: 1 });
ReimbursementSchema.index({ cpf: 1 });
ReimbursementSchema.index({ status: 1 });
ReimbursementSchema.index({ dataCriacao: -1 });

// Verificar se o modelo já existe para evitar sobrescrever
export default mongoose.models.Reimbursement ||
  mongoose.model<IReimbursement>('Reimbursement', ReimbursementSchema);
