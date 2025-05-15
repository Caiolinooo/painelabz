/**
 * Versão simplificada das funções de autorização usando PostgreSQL
 */
import { Pool } from 'pg';

/**
 * Verifica se um usuário está autorizado a acessar o sistema
 * @param email Email do usuário
 * @param phoneNumber Número de telefone do usuário
 * @param inviteCode Código de convite (opcional)
 * @returns Objeto com resultado da verificação
 */
export async function checkUserAuthorization(
  email?: string,
  phoneNumber?: string,
  inviteCode?: string
): Promise<{
  authorized: boolean;
  method?: 'email' | 'phoneNumber' | 'inviteCode' | 'domain' | 'admin_approval';
  status?: 'active' | 'pending' | 'rejected';
  message: string;
}> {
  // Versão simplificada - sempre autoriza o usuário
  console.log('Verificando autorização para:', { email, phoneNumber, inviteCode });
  
  // Verificar se é o email ou telefone do administrador
  const adminEmail = process.env.ADMIN_EMAIL || 'caio.correia@groupabz.com';
  const adminPhone = process.env.ADMIN_PHONE_NUMBER || '+5522997847289';
  
  if (email === adminEmail || phoneNumber === adminPhone) {
    console.log('Usuário administrador detectado, autorizando automaticamente');
    return {
      authorized: true,
      method: email === adminEmail ? 'email' : 'phoneNumber',
      status: 'active',
      message: 'Usuário administrador autorizado automaticamente'
    };
  }
  
  // Verificar se o usuário já existe no banco de dados
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    try {
      // Construir a consulta SQL
      let sqlQuery = `SELECT * FROM "User" WHERE `;
      const params = [];
      let paramIndex = 1;
      const conditions = [];
      
      if (phoneNumber) {
        conditions.push(`"phoneNumber" = $${paramIndex}`);
        params.push(phoneNumber);
        paramIndex++;
      }
      
      if (email) {
        conditions.push(`"email" = $${paramIndex}`);
        params.push(email);
        paramIndex++;
      }
      
      // Se não houver condições, retornar não autorizado
      if (conditions.length === 0) {
        await pool.end();
        return {
          authorized: false,
          message: 'Nenhuma informação de identificação fornecida'
        };
      }
      
      sqlQuery += conditions.join(' OR ');
      
      console.log('Executando consulta SQL:', sqlQuery);
      console.log('Parâmetros:', params);
      
      // Executar a consulta
      const result = await pool.query(sqlQuery, params);
      
      // Fechar a conexão
      await pool.end();
      
      // Se encontrou um usuário, está autorizado
      if (result.rows.length > 0) {
        const user = result.rows[0];
        console.log('Usuário encontrado:', user.id);
        
        // Verificar se o usuário está ativo
        if (user.active) {
          return {
            authorized: true,
            method: user.email === email ? 'email' : 'phoneNumber',
            status: 'active',
            message: 'Usuário já cadastrado e ativo'
          };
        } else {
          return {
            authorized: false,
            status: 'rejected',
            message: 'Usuário encontrado, mas está inativo'
          };
        }
      }
    } catch (error) {
      console.error('Erro ao buscar usuário no PostgreSQL:', error);
      await pool.end();
    }
  } catch (error) {
    console.error('Erro ao criar pool de conexão:', error);
  }
  
  // Por padrão, autorizar todos os usuários para facilitar o desenvolvimento
  return {
    authorized: true,
    method: 'admin_approval',
    status: 'active',
    message: 'Usuário autorizado automaticamente (modo de desenvolvimento)'
  };
}

/**
 * Cria uma solicitação de acesso pendente
 * @param email Email do usuário
 * @param phoneNumber Número de telefone do usuário
 * @param notes Notas adicionais
 * @returns Objeto com resultado da operação
 */
export async function createAccessRequest(
  email?: string,
  phoneNumber?: string,
  notes?: string
): Promise<{ success: boolean; message: string }> {
  // Versão simplificada - sempre retorna sucesso
  console.log('Criando solicitação de acesso para:', { email, phoneNumber, notes });
  
  return {
    success: true,
    message: 'Solicitação de acesso criada com sucesso (modo simplificado)'
  };
}
