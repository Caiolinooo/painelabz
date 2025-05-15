// Script para adicionar um registro de histórico de acesso para todos os usuários
require('dotenv').config();
const { Pool } = require('pg');

// Cores para o console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// Configurações
const DATABASE_URL = process.env.DATABASE_URL;

// Verificar se as variáveis de ambiente estão configuradas
if (!DATABASE_URL) {
  console.error(`${colors.red}DATABASE_URL não está definido. Configure a variável de ambiente.${colors.reset}`);
  process.exit(1);
}

// Criar pool de conexão com o PostgreSQL
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Função principal
async function addAccessHistoryToAllUsers() {
  const client = await pool.connect();

  try {
    console.log(`${colors.bright}${colors.blue}=== Adicionando histórico de acesso para todos os usuários ===${colors.reset}\n`);

    // Iniciar uma transação
    await client.query('BEGIN');

    try {
      // 1. Buscar todos os usuários da tabela users_unified
      console.log(`${colors.cyan}Buscando usuários na tabela users_unified...${colors.reset}`);
      const { rows: unifiedUsers } = await client.query(`
        SELECT id, first_name, last_name, access_history
        FROM users_unified
        WHERE active = true
      `);

      console.log(`${colors.green}Encontrados ${unifiedUsers.length} usuários na tabela users_unified${colors.reset}`);

      // 2. Adicionar histórico para cada usuário
      let updatedCount = 0;
      const now = new Date().toISOString();

      for (const user of unifiedUsers) {
        try {
          // Verificar se o usuário já tem histórico
          let accessHistory = user.access_history || [];
          
          // Se o histórico for uma string, tentar converter para JSON
          if (typeof accessHistory === 'string') {
            try {
              accessHistory = JSON.parse(accessHistory);
            } catch (error) {
              console.error(`${colors.yellow}Erro ao converter histórico para o usuário ${user.id}. Criando novo array.${colors.reset}`);
              accessHistory = [];
            }
          }
          
          // Se não for um array, criar um novo
          if (!Array.isArray(accessHistory)) {
            accessHistory = [];
          }
          
          // Adicionar novo registro ao histórico
          accessHistory.push({
            timestamp: now,
            action: 'SYSTEM_UPDATE',
            details: 'Registro de histórico adicionado pelo sistema'
          });
          
          // Atualizar o usuário
          await client.query(`
            UPDATE users_unified
            SET access_history = $1, updated_at = NOW()
            WHERE id = $2
          `, [JSON.stringify(accessHistory), user.id]);
          
          updatedCount++;
          
          if (updatedCount % 10 === 0) {
            console.log(`${colors.green}Processados ${updatedCount} de ${unifiedUsers.length} usuários${colors.reset}`);
          }
        } catch (userError) {
          console.error(`${colors.red}Erro ao processar usuário ${user.id}:${colors.reset}`, userError);
        }
      }

      // Commit da transação
      await client.query('COMMIT');

      console.log(`\n${colors.bright}${colors.green}=== Histórico de acesso adicionado com sucesso para ${updatedCount} usuários! ===${colors.reset}\n`);
    } catch (error) {
      // Rollback em caso de erro
      await client.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error(`${colors.red}Erro ao adicionar histórico de acesso:${colors.reset}`, error);
    process.exit(1);
  } finally {
    // Liberar o cliente
    client.release();
    // Fechar o pool
    pool.end();
  }
}

// Executar a função principal
addAccessHistoryToAllUsers()
  .then(() => {
    console.log(`${colors.bright}${colors.green}Script concluído com sucesso!${colors.reset}`);
    process.exit(0);
  })
  .catch(error => {
    console.error(`${colors.red}Erro durante a execução do script:${colors.reset}`, error);
    process.exit(1);
  });
