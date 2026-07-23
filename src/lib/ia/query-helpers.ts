import { supabaseAdmin } from '@/lib/supabase';
import { getAccessibleUserIdsForGlobal } from './permissions';

/**
 * Interface for global search options
 */
export interface GlobalSearchOptions {
  table: string;
  select?: string;
  userId: string;
  userRole: string;
  filters?: Record<string, any>;
  limit?: number;
  orderBy?: { column: string; ascending?: boolean };
  userColumn?: string; // Column used for RBAC filtering (defaults to 'user_id')
}

/**
 * Executes a Supabase query with automatic RBAC filtering based on user role.
 */
export async function executeGlobalSearchQuery(options: GlobalSearchOptions) {
  const { 
    table, 
    select = '*', 
    userId, 
    userRole, 
    filters = {}, 
    limit = 50, 
    orderBy = { column: 'created_at', ascending: false },
    userColumn = 'user_id'
  } = options;

  // Normalize role
  const effectiveRole = userRole === 'ADMIN' ? 'ADMIN' : (userRole === 'GERENTE' ? 'GERENTE' : 'USER');
  
  // Get accessible user IDs based on hierarchy
  const accessInfo = await getAccessibleUserIdsForGlobal(userId, effectiveRole);

  if (!accessInfo.hasAccess) {
    return { 
      success: false, 
      error: accessInfo.error || 'Acesso negado para busca global nesta função.',
      data: [] 
    };
  }

  let query = supabaseAdmin.from(table).select(select);

  // Apply RBAC filters: if IDs are restricted, apply them to the userColumn
  if (accessInfo.ids) {
    if (table === 'purchase_orders') {
      // Special case for purchase orders: requester must be the user_id OR in approver_ids
      query = query.or(`user_id.in.(${accessInfo.ids.join(',')}),approver_ids.cs.{${accessInfo.ids.join(',')}}`);
    } else {
      query = query.in(userColumn, accessInfo.ids);
    }
  }

  // Apply dynamic filters provided in args
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      // Handle search/busca specifically per table
      if (key === 'busca' || key === 'search') {
        if (table === 'users_unified') {
          query = query.or(`first_name.ilike.%${value}%,last_name.ilike.%${value}%,email.ilike.%${value}%`);
        } else if (table === 'Reimbursement') {
          query = query.or(`descricao.ilike.%${value}%,tipo_reembolso.ilike.%${value}%`);
        } else if (table === 'purchase_requests') {
          query = query.or(`rqf_number.ilike.%${value}%,provider_name.ilike.%${value}%,buyer_name.ilike.%${value}%`);
        } else if (table === 'purchase_orders') {
          query = query.or(`po_number.ilike.%${value}%,provider_name.ilike.%${value}%,buyer_name.ilike.%${value}%`);
        }
        continue;
      }

      // Skip cross-table filters that need JOIN logic
      // departamento lives on users_unified, not on Reimbursement/leave_requests etc.
      if (key === 'departamento' && table !== 'users_unified') {
        continue;
      }

      // Map categoria to the actual column name on Reimbursement
      if (key === 'categoria' && table === 'Reimbursement') {
        query = query.ilike('tipo_reembolso', `%${value}%`);
        continue;
      }

      // Skip unknown filter keys that don't exist on the target table
      if (key === 'categoria') {
        continue;
      }

      // Special handling for search terms on specific columns
      if (typeof value === 'string' && (key === 'department' || key === 'name' || key === 'title' || key === 'descricao')) {
         query = query.ilike(key, `%${value}%`);
      } 
      // Date range handling
      else if (key === 'data_inicio' || key === 'start_date_after') {
        const dateCol = table === 'leave_requests' ? 'start_date' : (table === 'Reimbursement' ? 'data' : 'created_at');
        query = query.gte(dateCol, value);
      }
      else if (key === 'data_fim' || key === 'end_date_before') {
        const dateCol = table === 'leave_requests' ? 'end_date' : (table === 'Reimbursement' ? 'data' : 'created_at');
        query = query.lte(dateCol, value);
      }
      // Standard equals filter
      else {
         query = query.eq(key, value);
      }
    }
  }

  // Apply ordering
  if (orderBy && orderBy.column) {
    query = query.order(orderBy.column, { ascending: !!orderBy.ascending });
  }
  
  const { data, error } = await query.limit(limit);

  if (error) {
    console.error(`[IA Query Helpers] Error querying ${table}:`, error);
    return { success: false, error: `Erro na consulta ao banco: ${error.message}`, data: [] };
  }

  return { 
    success: true, 
    data: data || [], 
    accessInfo 
  };
}

/**
 * Fetches user details (name, department, etc.) for a list of records containing user IDs.
 */
export async function fetchAssociatedUsers(data: any[], userColumn: string = 'user_id') {
  if (!data || data.length === 0) return new Map();
  
  const userIds = [...new Set(data.map(item => item[userColumn]).filter(Boolean))];
  if (userIds.length === 0) return new Map();

  const { data: users, error } = await supabaseAdmin
    .from('users_unified')
    .select('id, first_name, last_name, email, department, position')
    .in('id', userIds);

  if (error) {
    console.error('[IA Query Helpers] Error fetching associated users:', error);
    return new Map();
  }

  return new Map(users.map(u => [u.id, u]));
}

/**
 * Standardizes the output format for IA tools.
 */
export function formatGlobalResponse(success: boolean, data: any[], message?: string) {
  return JSON.stringify({
    success,
    count: data.length,
    data: data,
    message: message || (success ? 'Consulta realizada com sucesso' : 'Falha na consulta')
  });
}
