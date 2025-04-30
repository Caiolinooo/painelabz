// Script para corrigir o problema do tipo Role no PostgreSQL
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function main() {
  console.log('Verificando e corrigindo o tipo Role no PostgreSQL...');
  
  // Criar pool de conexão com o PostgreSQL
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    // Verificar se o tipo Role existe
    const typeCheckResult = await pool.query(`
      SELECT typname FROM pg_type WHERE typname = 'role'
    `);
    
    if (typeCheckResult.rows.length > 0) {
      console.log('Tipo Role encontrado, tentando remover...');
      
      // Tentar remover o tipo Role
      try {
        await pool.query(`DROP TYPE IF EXISTS "Role" CASCADE`);
        console.log('Tipo Role removido com sucesso!');
      } catch (dropError) {
        console.error('Erro ao remover tipo Role:', dropError);
      }
    } else {
      console.log('Tipo Role não encontrado, não é necessário remover.');
    }
    
    // Verificar se a coluna role na tabela User está definida como TEXT
    const columnCheckResult = await pool.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'User' AND column_name = 'role'
    `);
    
    if (columnCheckResult.rows.length > 0) {
      const dataType = columnCheckResult.rows[0].data_type;
      console.log(`Coluna role na tabela User é do tipo: ${dataType}`);
      
      if (dataType.toLowerCase() !== 'text') {
        console.log('Alterando coluna role para tipo TEXT...');
        
        try {
          await pool.query(`
            ALTER TABLE "User" 
            ALTER COLUMN "role" TYPE TEXT
          `);
          console.log('Coluna role alterada para TEXT com sucesso!');
        } catch (alterError) {
          console.error('Erro ao alterar coluna role:', alterError);
        }
      } else {
        console.log('Coluna role já está definida como TEXT, não é necessário alterar.');
      }
    } else {
      console.log('Coluna role não encontrada na tabela User.');
    }
    
    console.log('Verificação e correção concluídas!');
  } catch (error) {
    console.error('Erro durante a verificação e correção:', error);
  } finally {
    await pool.end();
  }
}

main()
  .catch(error => {
    console.error('Erro durante a execução do script:', error);
    process.exit(1);
  });
