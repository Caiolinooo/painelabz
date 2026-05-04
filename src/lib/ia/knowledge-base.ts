/**
 * Knowledge Base Service
 * Portal ABZ - Base de conhecimento persistente para a IA
 * 
 * Escopos:
 *   - 'global': Disponível para todos os usuários
 *   - 'user': Específica para um usuário (scope_id = user_id)
 *   - 'department': Para um departamento (scope_id via allowed_departments)
 *   - 'conversation': Aprendizado de uma conversa (scope_id = session_id)
 */
import { supabaseAdmin } from '@/lib/supabase';

// =====================================================
// Types
// =====================================================

export interface KBEntry {
  id: string;
  scope: 'global' | 'user' | 'department' | 'conversation';
  scope_id: string | null;
  category: string;
  title: string;
  content: string;
  tags: string[];
  priority: number;
  is_active: boolean;
  access_level: string;
  allowed_roles: string[];
  allowed_departments: string[];
  allowed_users: string[];
  source: string;
  source_ref: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

export interface KBSearchOptions {
  userId: string;
  userRole: string;
  department?: string;
  category?: string;
  tags?: string[];
  limit?: number;
  includeExpired?: boolean;
}

export interface KBCreateInput {
  scope?: 'global' | 'user' | 'department' | 'conversation';
  scope_id?: string;
  category?: string;
  title: string;
  content: string;
  tags?: string[];
  priority?: number;
  access_level?: string;
  allowed_roles?: string[];
  allowed_departments?: string[];
  allowed_users?: string[];
  source?: string;
  source_ref?: string;
  expires_at?: string;
}

// =====================================================
// Core Functions
// =====================================================

/**
 * Buscar conhecimento relevante para o contexto do usuário
 */
export async function getRelevantKnowledge(opts: KBSearchOptions): Promise<KBEntry[]> {
  try {
    let query = supabaseAdmin
      .from('ia_knowledge_base')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(opts.limit || 30);

    // Filtrar por expiração
    if (!opts.includeExpired) {
      query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
    }

    // Filtrar por categoria se especificada
    if (opts.category) {
      query = query.eq('category', opts.category);
    }

    // Filtrar por tags se especificadas
    if (opts.tags && opts.tags.length > 0) {
      query = query.overlaps('tags', opts.tags);
    }

    const { data, error } = await query;

    if (error || !data) {
      console.error('[KB] Error fetching knowledge:', error);
      return [];
    }

    // Filtrar por permissões no lado do servidor
    return data.filter((entry: any) => {
      // Global é acessível por todos
      if (entry.scope === 'global' && entry.access_level === 'all') return true;

      // Verificar roles permitidas
      if (entry.allowed_roles && entry.allowed_roles.length > 0) {
        if (!entry.allowed_roles.includes(opts.userRole)) return false;
      }

      // Verificar departamento
      if (entry.allowed_departments && entry.allowed_departments.length > 0 && opts.department) {
        if (!entry.allowed_departments.includes(opts.department)) return false;
      }

      // Verificar acesso por user
      if (entry.scope === 'user') {
        // Escopo user: apenas o dono ou users permitidos
        if (entry.scope_id !== opts.userId) {
          if (!entry.allowed_users?.includes(opts.userId)) return false;
        }
      }

      return true;
    }) as KBEntry[];
  } catch (err) {
    console.error('[KB] Error in getRelevantKnowledge:', err);
    return [];
  }
}

/**
 * Buscar conhecimento específico do usuário (memórias pessoais + global)
 */
export async function getUserKnowledge(userId: string, userRole: string, department?: string): Promise<KBEntry[]> {
  return getRelevantKnowledge({ userId, userRole, department });
}

/**
 * Buscar por texto (busca simples com ILIKE)
 */
export async function searchKnowledge(searchTerm: string, opts: KBSearchOptions): Promise<KBEntry[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('ia_knowledge_base')
      .select('*')
      .eq('is_active', true)
      .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%,tags.cs.{${searchTerm}}`)
      .order('priority', { ascending: false })
      .limit(opts.limit || 20);

    if (error || !data) return [];

    // Aplicar filtros de permissão
    return data.filter((entry: any) => {
      if (entry.access_level === 'all') return true;
      if (entry.allowed_roles?.length > 0 && !entry.allowed_roles.includes(opts.userRole)) return false;
      if (entry.scope === 'user' && entry.scope_id !== opts.userId) return false;
      return true;
    }) as KBEntry[];
  } catch {
    return [];
  }
}

/**
 * Adicionar nova entrada na base de conhecimento
 */
export async function addKnowledge(input: KBCreateInput, createdBy: string): Promise<KBEntry | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('ia_knowledge_base')
      .insert({
        scope: input.scope || 'global',
        scope_id: input.scope_id || null,
        category: input.category || 'general',
        title: input.title,
        content: input.content,
        tags: input.tags || [],
        priority: input.priority || 0,
        access_level: input.access_level || 'all',
        allowed_roles: input.allowed_roles || ['ADMIN', 'GERENTE', 'USER'],
        allowed_departments: input.allowed_departments || [],
        allowed_users: input.allowed_users || [],
        source: input.source || 'ia_agent',
        source_ref: input.source_ref || null,
        created_by: createdBy,
        expires_at: input.expires_at || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[KB] Error adding knowledge:', error);
      return null;
    }

    return data as KBEntry;
  } catch (err) {
    console.error('[KB] Error in addKnowledge:', err);
    return null;
  }
}

/**
 * Atualizar uma entrada existente
 */
export async function updateKnowledge(
  id: string,
  updates: Partial<KBCreateInput>,
  updatedBy: string
): Promise<boolean> {
  try {
    const updateData: any = { ...updates, updated_by: updatedBy, updated_at: new Date().toISOString() };
    const { error } = await supabaseAdmin
      .from('ia_knowledge_base')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('[KB] Error updating knowledge:', error);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Desativar uma entrada (soft delete)
 */
export async function deactivateKnowledge(id: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('ia_knowledge_base')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Deletar permanentemente uma entrada
 */
export async function deleteKnowledge(id: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('ia_knowledge_base')
      .delete()
      .eq('id', id);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Listar todas as entradas (para admin)
 */
export async function listAllKnowledge(opts?: {
  scope?: string;
  category?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ entries: KBEntry[]; total: number }> {
  try {
    let query = supabaseAdmin
      .from('ia_knowledge_base')
      .select('*', { count: 'exact' })
      .order('priority', { ascending: false })
      .order('updated_at', { ascending: false });

    if (opts?.scope) query = query.eq('scope', opts.scope);
    if (opts?.category) query = query.eq('category', opts.category);
    if (opts?.isActive !== undefined) query = query.eq('is_active', opts.isActive);
    if (opts?.limit) query = query.limit(opts.limit);
    if (opts?.offset) query = query.range(opts.offset, opts.offset + (opts.limit || 20) - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[KB] Error listing knowledge:', error);
      return { entries: [], total: 0 };
    }

    return { entries: (data || []) as KBEntry[], total: count || 0 };
  } catch {
    return { entries: [], total: 0 };
  }
}

/**
 * Construir contexto de conhecimento para o system prompt da IA
 * Retorna uma string formatada com todo o conhecimento relevante
 */
export async function buildKnowledgeContext(
  userId: string,
  userRole: string,
  department?: string
): Promise<string> {
  const entries = await getRelevantKnowledge({
    userId,
    userRole,
    department,
    limit: 50,
  });

  if (entries.length === 0) return '';

  // Agrupar por categoria
  const grouped: Record<string, KBEntry[]> = {};
  for (const entry of entries) {
    const cat = entry.category || 'general';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(entry);
  }

  let context = '\n\n=== BASE DE CONHECIMENTO ===\n';
  context += 'As informações abaixo são conhecimentos persistentes que você deve considerar:\n\n';

  for (const [category, items] of Object.entries(grouped)) {
    context += `--- ${category.toUpperCase()} ---\n`;
    for (const item of items) {
      context += `• [${item.title}]: ${item.content}\n`;
      if (item.tags.length > 0) {
        context += `  Tags: ${item.tags.join(', ')}\n`;
      }
    }
    context += '\n';
  }

  return context;
}

/**
 * Obter estatísticas da knowledge base
 */
export async function getKBStats(): Promise<{
  total: number;
  active: number;
  byScope: Record<string, number>;
  byCategory: Record<string, number>;
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from('ia_knowledge_base')
      .select('scope, category, is_active');

    if (error || !data) return { total: 0, active: 0, byScope: {}, byCategory: {} };

    const stats = {
      total: data.length,
      active: data.filter((d: any) => d.is_active).length,
      byScope: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
    };

    for (const entry of data) {
      const e = entry as any;
      stats.byScope[e.scope] = (stats.byScope[e.scope] || 0) + 1;
      stats.byCategory[e.category] = (stats.byCategory[e.category] || 0) + 1;
    }

    return stats;
  } catch {
    return { total: 0, active: 0, byScope: {}, byCategory: {} };
  }
}
