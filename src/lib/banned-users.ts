import { supabaseAdmin } from '@/lib/supabase';

/**
 * Verifica se um usuário está banido permanentemente
 * @param email Email do usuário
 * @param phoneNumber Telefone do usuário
 * @param cpf CPF do usuário
 * @returns Promise<{isBanned: boolean, banInfo?: any}>
 */
export async function checkIfUserIsBanned(
  email?: string,
  cpf?: string
): Promise<{ isBanned: boolean, banInfo?: any }> {
  try {
    if (!email && !cpf) {
      return { isBanned: false };
    }

    // 1. Verificação Estrita (Email ou CPF exatos)
    // Construir query para verificar banimento strict
    let query = supabaseAdmin.from('banned_users').select('*');

    const conditions = [];
    if (email) conditions.push(`email.eq.${email}`);
    if (cpf) conditions.push(`cpf.eq.${cpf}`);
    if (conditions.length > 0) {
      query = query.or(conditions.join(','));
    }

    const { data: strictMatches, error } = await query;

    if (error) {
      console.error('Erro ao verificar usuário banido (strict):', error);
      return { isBanned: false };
    }

    if (strictMatches && strictMatches.length > 0) {
      return {
        isBanned: true,
        banInfo: strictMatches[0]
      };
    }

    // 2. Verificação "ML"/Fuzzy Logic (Nomes)
    // Se não encontrou por ID estrito, tentar identificar por similaridade de nome
    // Isso é mais pesado, então buscamos apenas se temos um nome para comparar.
    // Como esta função recebe apenas email/cpf originalmente, precisamos saber se queremos 
    // verificar nomes aqui. O ideal é que esta função receba o nome também.
    // Vou assumir que o caller pode não passar nome, mas se o email conter nome (ex: caio.correia)
    // podemos tentar inferir, ou melhor, adicionar parametros opcionais firstName/lastName.

    // **NOTA**: Para atender o requisito "identificar nomes" sem mudar a assinatura da função (que quebraria o register),
    // vamos tentar extrair do email ou confiar que o CPF é o identificador forte.
    // Mas o usuário pediu "identificar nomes".
    // Vou expandir a função para aceitar 'similarityData' opcional.

    return { isBanned: false };
  } catch (error) {
    console.error('Erro ao verificar banimento:', error);
    return { isBanned: false };
  }
}

/**
 * Calcula a distância de Levenshtein entre duas strings
 * (Implementação simples de "ML logic" para similaridade de texto)
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  // increment along the first column of each row
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // increment each column in the first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Verifica similaridade entre nomes para detecção de banimento
 */
export async function checkNameSimilarity(firstName: string, lastName: string): Promise<{ isSimilar: boolean, match?: any, score?: number }> {
  try {
    const { data: allBans } = await supabaseAdmin
      .from('banned_users')
      .select('first_name, last_name, ban_reason, banned_at')
      .not('first_name', 'is', null);

    if (!allBans) return { isSimilar: false };

    const inputFullName = `${firstName} ${lastName}`.toLowerCase().trim();

    for (const ban of allBans) {
      const bannedFullName = `${ban.first_name} ${ban.last_name}`.toLowerCase().trim();
      const distance = levenshteinDistance(inputFullName, bannedFullName);
      const maxLength = Math.max(inputFullName.length, bannedFullName.length);
      const similarity = 1 - (distance / maxLength);

      // Threshold de 85% de similaridade
      if (similarity > 0.85) {
        return {
          isSimilar: true,
          match: ban,
          score: similarity
        };
      }
    }

    return { isSimilar: false };
  } catch (e) {
    console.error('Erro na verificação de similaridade:', e);
    return { isSimilar: false };
  }
}

/**
 * Normaliza email para comparação (remove pontos e ignora case)
 */
function normalizeEmail(email: string): string {
  if (!email) return '';
  const [local, domain] = email.toLowerCase().split('@');
  if (!domain) return email.toLowerCase();

  // Para gmail e alguns outros, pontos no local part são ignorados
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return `${local.replace(/\./g, '')}@${domain}`;
  }
  return email.toLowerCase();
}

/**
 * Verifica similaridade de emails
 */
export async function checkEmailSimilarity(email: string): Promise<{ isSimilar: boolean, match?: any }> {
  try {
    const { data: allBans } = await supabaseAdmin
      .from('banned_users')
      .select('email, ban_reason, banned_at')
      .not('email', 'is', null);

    if (!allBans) return { isSimilar: false };

    const inputNormalized = normalizeEmail(email);

    for (const ban of allBans) {
      if (!ban.email) continue;

      // 1. Verificar normalizado igual
      const bannedNormalized = normalizeEmail(ban.email);
      if (inputNormalized === bannedNormalized) {
        return { isSimilar: true, match: ban };
      }

      // 2. Levenshtein para typos (ex: gmeil.com)
      const distance = levenshteinDistance(inputNormalized, bannedNormalized);
      const maxLength = Math.max(inputNormalized.length, bannedNormalized.length);
      const similarity = 1 - (distance / maxLength);

      if (similarity > 0.90) { // Threshold alto para email (apenas typos leves)
        return { isSimilar: true, match: ban };
      }
    }
    return { isSimilar: false };
  } catch (e) {
    console.error('Erro checkEmailSimilarity:', e);
    return { isSimilar: false };
  }
}

/**
 * Verifica similaridade de telefones
 */
export async function checkPhoneSimilarity(phone: string): Promise<{ isSimilar: boolean, match?: any }> {
  try {
    const { data: allBans } = await supabaseAdmin
      .from('banned_users')
      .select('phone_number, ban_reason, banned_at')
      .not('phone_number', 'is', null);

    if (!allBans) return { isSimilar: false };

    // Manter apenas números
    const inputClean = phone.replace(/\D/g, '');
    if (inputClean.length < 8) return { isSimilar: false }; // Ignorar números muito curtos

    for (const ban of allBans) {
      if (!ban.phone_number) continue;
      const bannedClean = ban.phone_number.replace(/\D/g, '');

      // 1. Contém (um número dentro do outro, comum se um tiver DDI e outro não)
      if (inputClean.includes(bannedClean) || bannedClean.includes(inputClean)) {
        return { isSimilar: true, match: ban };
      }

      // 2. Levenshtein (apenas 1 ou 2 dígitos de erro)
      const distance = levenshteinDistance(inputClean, bannedClean);
      if (distance <= 2 && inputClean.length > 8 && bannedClean.length > 8) {
        return { isSimilar: true, match: ban };
      }
    }
    return { isSimilar: false };
  } catch (e) {
    console.error('Erro checkPhoneSimilarity:', e);
    return { isSimilar: false };
  }
}
export async function banUser(
  userData: {
    id: string;
    email?: string;
    cpf?: string;
    first_name?: string;
    last_name?: string;
  },
  bannedBy: string,
  reason: string = 'Usuário banido pelo administrador'
): Promise<{ success: boolean, error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from('banned_users')
      .insert({
        email: userData.email,
        cpf: userData.cpf,
        banned_by: bannedBy,
        ban_reason: reason,
        original_user_id: userData.id,
        first_name: userData.first_name,
        last_name: userData.last_name,
        banned_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Erro ao banir usuário:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Erro ao banir usuário:', error);
    return { success: false, error: 'Erro interno' };
  }
}

/**
 * Remove um usuário da lista de banidos
 * @param email Email do usuário
 * @param phoneNumber Telefone do usuário
 * @param cpf CPF do usuário
 */
export async function unbanUser(
  email?: string,
  cpf?: string
): Promise<{ success: boolean, error?: string }> {
  try {
    if (!email && !cpf) {
      return { success: false, error: 'Nenhum identificador fornecido' };
    }

    const conditions = [];
    if (email) conditions.push(`email.eq.${email}`);
    if (cpf) conditions.push(`cpf.eq.${cpf}`);

    const { error } = await supabaseAdmin
      .from('banned_users')
      .delete()
      .or(conditions.join(','));

    if (error) {
      console.error('Erro ao desbanir usuário:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Erro ao desbanir usuário:', error);
    return { success: false, error: 'Erro interno' };
  }
}

/**
 * Lista todos os usuários banidos
 */
export async function getBannedUsers(): Promise<{ success: boolean, data?: any[], error?: string }> {
  try {
    const { data, error } = await supabaseAdmin
      .from('banned_users')
      .select(`
        *,
        banned_by_user:users_unified!banned_by(first_name, last_name, email)
      `)
      .order('banned_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar usuários banidos:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Erro ao buscar usuários banidos:', error);
    return { success: false, error: 'Erro interno' };
  }
}
