/**
 * Controle de acesso hierárquico para o sistema IA
 * 
 * Hierarquia:
 * - ADMIN: acesso a todos os dados de todos os usuários
 * - GERENTE: acesso aos dados da equipe (via avaliacao_colaborador_gerente)
 * - USER: acesso apenas aos próprios dados
 */
import { supabaseAdmin } from '@/lib/supabase';
import type { IAUserRole } from '@/types/ia';

/**
 * Determinar o role efetivo do usuário para o sistema IA
 * GERENTE é inferido pela existência de subordinados em avaliacao_colaborador_gerente
 */
export async function getEffectiveRole(userId: string, baseRole: string): Promise<IAUserRole> {
  if (baseRole === 'ADMIN') return 'ADMIN';

  // Verificar se o usuário é gerente de alguém
  try {
    const { data, error } = await supabaseAdmin
      .from('avaliacao_colaborador_gerente')
      .select('colaborador_id')
      .eq('gerente_id', userId)
      .limit(1);

    if (!error && data && data.length > 0) {
      return 'GERENTE';
    }
  } catch {
    // Se a tabela não existir, ignorar
  }

  return 'USER';
}

/**
 * Obter IDs dos subordinados de um gerente
 */
export async function getTeamMemberIds(managerId: string): Promise<string[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('avaliacao_colaborador_gerente')
      .select('colaborador_id')
      .eq('gerente_id', managerId);

    if (error || !data) return [];
    return data.map((r: { colaborador_id: string }) => r.colaborador_id);
  } catch {
    return [];
  }
}

/**
 * Verificar se um usuário pode acessar dados de outro usuário
 */
export async function canAccessUserData(
  requesterId: string,
  requesterRole: IAUserRole,
  targetUserId: string
): Promise<boolean> {
  // Pode acessar seus próprios dados
  if (requesterId === targetUserId) return true;

  // Admin pode acessar tudo
  if (requesterRole === 'ADMIN') return true;

  // Gerente pode acessar dados da equipe
  if (requesterRole === 'GERENTE') {
    const teamIds = await getTeamMemberIds(requesterId);
    return teamIds.includes(targetUserId);
  }

  return false;
}

/**
 * Obter IDs de usuários que o solicitante pode ver
 * Retorna null para ADMIN (sem filtro), array de IDs para outros
 */
export async function getAccessibleUserIds(
  userId: string,
  role: IAUserRole
): Promise<string[] | null> {
  if (role === 'ADMIN') return null; // Sem restrição

  if (role === 'GERENTE') {
    const teamIds = await getTeamMemberIds(userId);
    return [userId, ...teamIds]; // Inclui o próprio gerente
  }

  return [userId]; // USER: apenas ele mesmo
}

/**
 * Construir filtro SQL/Supabase para queries baseadas em permissão
 */
export function buildUserFilter(
  accessibleIds: string[] | null
): { column: string; values: string[] } | null {
  if (accessibleIds === null) return null; // ADMIN: sem filtro
  return { column: 'user_id', values: accessibleIds };
}
