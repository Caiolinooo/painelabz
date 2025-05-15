/**
 * Utilitários para conexão com o banco de dados PostgreSQL
 */
import { Pool } from 'pg';

/**
 * Cria uma conexão com o banco de dados PostgreSQL
 * @returns Pool de conexão com o PostgreSQL
 */
export async function createPgPool() {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    // Testar a conexão
    const client = await pool.connect();
    client.release();
    
    console.log('Conexão com PostgreSQL estabelecida com sucesso');
    return pool;
  } catch (error) {
    console.error('Erro ao conectar com PostgreSQL:', error);
    throw error;
  }
}

/**
 * Executa uma consulta no PostgreSQL
 * @param query Consulta SQL
 * @param params Parâmetros da consulta
 * @returns Resultado da consulta
 */
export async function executeQuery(query: string, params: any[] = []) {
  let pool: Pool | null = null;
  
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    const result = await pool.query(query, params);
    return result;
  } catch (error) {
    console.error('Erro ao executar consulta no PostgreSQL:', error);
    throw error;
  } finally {
    if (pool) await pool.end();
  }
}

/**
 * Busca um usuário pelo ID
 * @param userId ID do usuário
 * @returns Usuário encontrado ou null
 */
export async function findUserById(userId: string) {
  try {
    const result = await executeQuery(`
      SELECT * FROM "User" WHERE "id" = $1
    `, [userId]);
    
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Erro ao buscar usuário por ID:', error);
    return null;
  }
}

/**
 * Busca um usuário pelo email
 * @param email Email do usuário
 * @returns Usuário encontrado ou null
 */
export async function findUserByEmail(email: string) {
  try {
    const result = await executeQuery(`
      SELECT * FROM "User" WHERE "email" = $1
    `, [email]);
    
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Erro ao buscar usuário por email:', error);
    return null;
  }
}

/**
 * Busca um usuário pelo número de telefone
 * @param phoneNumber Número de telefone do usuário
 * @returns Usuário encontrado ou null
 */
export async function findUserByPhoneNumber(phoneNumber: string) {
  try {
    const result = await executeQuery(`
      SELECT * FROM "User" WHERE "phoneNumber" = $1
    `, [phoneNumber]);
    
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Erro ao buscar usuário por telefone:', error);
    return null;
  }
}

/**
 * Busca um usuário por email ou número de telefone
 * @param identifier Email ou número de telefone
 * @returns Usuário encontrado ou null
 */
export async function findUserByIdentifier(identifier: string) {
  try {
    const result = await executeQuery(`
      SELECT * FROM "User" WHERE "email" = $1 OR "phoneNumber" = $1
    `, [identifier]);
    
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Erro ao buscar usuário por identificador:', error);
    return null;
  }
}
