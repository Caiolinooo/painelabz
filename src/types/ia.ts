/**
 * Tipos TypeScript para o sistema de IA Agent
 * Portal ABZ - Chat IA, Dashboard Inteligente, Config Admin
 */

// =====================================================
// Tipos de banco de dados
// =====================================================

export interface IAConfig {
  id: string;
  endpoint: string;
  api_key: string;
  model_default: string;
  max_tokens: number;
  temperatura: number;
  system_prompt: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

/** Config sem dados sensíveis (para retorno em API não-admin) */
export type IAConfigPublic = Omit<IAConfig, 'api_key'> & { api_key?: never };

export interface IAChatSession {
  id: string;
  user_id: string;
  session_title: string;
  model_used: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type IAMessageRole = 'user' | 'assistant' | 'system';

export interface IAChatMessage {
  id: string;
  session_id: string;
  role: IAMessageRole;
  content: string;
  tokens_used: number | null;
  response_time_ms: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface IADashboardCache {
  id: string;
  user_id: string;
  dashboard_type: IADashboardType;
  data: Record<string, unknown>;
  generated_at: string;
  expires_at: string | null;
}

// =====================================================
// Tipos de domínio
// =====================================================

export type IADashboardType = 'summary' | 'kpi' | 'pendencies' | 'dept';
export type IAUserRole = 'ADMIN' | 'GERENTE' | 'USER';

// =====================================================
// Tipos de Request/Response das APIs
// =====================================================

/** POST /api/ia/chat */
export interface IAChatRequest {
  session_id: string;
  message: string;
}

export interface IAChatResponse {
  message: IAChatMessage;
  session: IAChatSession;
}

/** POST /api/ia/sessions */
export interface IACreateSessionRequest {
  title?: string;
}

export interface IACreateSessionResponse {
  session: IAChatSession;
}

/** GET /api/ia/sessions */
export interface IAListSessionsResponse {
  sessions: IAChatSession[];
}

/** GET /api/ia/models */
export interface IAModel {
  id: string;
  object: string;
  owned_by: string;
}

export interface IAListModelsResponse {
  models: IAModel[];
}

/** GET /api/ia/config (público: sem api_key) */
export interface IAConfigResponse {
  config: IAConfigPublic | IAConfig;
}

/** PUT /api/ia/config (admin) */
export interface IAUpdateConfigRequest {
  endpoint?: string;
  api_key?: string;
  model_default?: string;
  max_tokens?: number;
  temperatura?: number;
  system_prompt?: string;
  ativo?: boolean;
}

/** GET /api/ia/dashboard */
export interface IADashboardKPI {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
  change?: number;
  icon?: string;
}

export interface IADashboardPendency {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  deadline?: string;
  module: string;
}

export interface IADashboardSummary {
  greeting: string;
  highlights: string[];
  quickStats: IADashboardKPI[];
}

export interface IADashboardData {
  summary: IADashboardSummary;
  kpis: IADashboardKPI[];
  pendencies: IADashboardPendency[];
  generatedAt: string;
}

export interface IADashboardResponse {
  data: IADashboardData;
  cached: boolean;
}

// =====================================================
// Tipos internos do cliente LLM
// =====================================================

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMCompletionRequest {
  model: string;
  messages: LLMMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  stop?: string[];
}

export interface LLMCompletionChoice {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

export interface LLMCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: LLMCompletionChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LLMStreamDelta {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

// =====================================================
// Tipos de contexto do usuário
// =====================================================

export interface IAUserContext {
  userId: string;
  userName: string;
  role: IAUserRole;
  department: string;
  position: string;
  /** Dados do perfil relevantes */
  profile: {
    email: string | null;
    phone: string | null;
  };
  /** Dados de avaliações recentes */
  evaluations?: {
    count: number;
    avgScore: number | null;
    lastPeriod: string | null;
  };
  /** Dados de férias */
  vacations?: {
    pending: number;
    upcoming: Array<{ start: string; end: string; status: string }>;
  };
  /** Dados de reembolsos */
  reimbursements?: {
    pending: number;
    totalApproved: number;
  };
  /** E-mails recentes do Exchange */
  recentEmails?: Array<{
    subject: string;
    from: string;
    date: string;
  }>;
  /** IDs dos subordinados (se GERENTE) */
  teamMemberIds?: string[];
  /** Ferramentas disponíveis para o usuário (baseadas em RBAC e Módulos) */
  availableTools?: Array<{name: string; description: string}>;
}
