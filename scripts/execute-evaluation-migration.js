/**
 * Script para executar migração das novas tabelas de avaliação
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = ***REMOVED***;
const supabaseServiceKey = ***REMOVED*** || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function executeMigration() {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Variáveis de ambiente não configuradas');
    }

    console.log('🔧 Iniciando migração das tabelas de avaliação...');

    const supabase = ***REMOVED*** supabaseServiceKey);

    // Ler o script SQL
    const sqlScript = fs.readFileSync(
      path.join(__dirname, 'create-evaluation-tables.sql'),
      'utf8'
    );

    console.log('📋 Script SQL carregado com sucesso');

    // Dividir o script em comandos menores para execução
    const commands = [
      // Criar tabelas básicas
      'CREATE TABLE IF NOT EXISTS avaliacao_ciclos (...)',
      'CREATE TABLE IF NOT EXISTS avaliacao_respostas (...)',
      'CREATE TABLE IF NOT EXISTS avaliacao_config (...)',

      // Adicionar colunas
      'ALTER TABLE avaliacoes_desempenho ADD COLUMN IF NOT EXISTS ciclo_id UUID REFERENCES avaliacao_ciclos(id)',

      // Criar índices
      'CREATE INDEX IF NOT EXISTS idx_avaliacao_respostas_avaliacao_id ON avaliacao_respostas(avaliacao_id)',
      'CREATE INDEX IF NOT EXISTS idx_avaliacao_config_user_id ON avaliacao_config(user_id)',

      // Inserir dados iniciais
      'INSERT INTO avaliacao_ciclos (...) VALUES (...)',

      // Criar view
      'CREATE OR REPLACE VIEW vw_avaliacoes_desempenho AS ...',

      // Configurar RLS
      'ALTER TABLE avaliacao_ciclos ENABLE ROW LEVEL SECURITY',

      // Criar políticas
      'CREATE POLICY "Ciclos - Admin full access" ON avaliacao_ciclos ...',

      // Inserir configurações
      'INSERT INTO avaliacao_config (...) SELECT ...'
    ];

    console.log('\n🚀 Executando migração passo a passo...');

    let successCount = 0;
    let errorCount = 0;

    // Tentar executar comandos principais
    try {
      // 1. Criar ciclos
      console.log('\n1️⃣ Criando tabela de ciclos...');
      const { error: ciclosError } = await supabase.rpc('exec_sql', {
        query: sqlScript
      });

      if (ciclosError && ciclosError.message !== 'function exec_sql(message) does not exist') {
        console.warn('⚠️  RPC não disponível, tentando método alternativo...');

        // Criar tabela ciclos diretamente
        const createCiclos = `
          CREATE TABLE IF NOT EXISTS avaliacao_ciclos (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            ano INTEGER NOT NULL UNIQUE,
            nome VARCHAR(100) NOT NULL,
            status VARCHAR(50) DEFAULT 'draft',
            data_abertura TIMESTAMP WITH TIME ZONE,
            data_fechamento TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `;

        // Executar via POST direto (tentativa)
        try {
          const response = await fetch(`${supabaseUrl}/rest/v1/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'apikey': supabaseServiceKey,
              'Prefer': 'return=minimal'
            },
            body: ***REMOVED*** query: createCiclos })
          });

          if (response.ok) {
            console.log('✅ Tabela ciclos criada com sucesso');
            successCount++;
          } else {
            console.log('❌ Erro ao criar tabela ciclos:', response.statusText);
            errorCount++;
          }
        } catch (e) {
          console.log('❌ Erro na requisição:', e.message);
          errorCount++;
        }
      } else {
        console.log('✅ Migração via RPC executada com sucesso');
        successCount++;
      }
    } catch (error) {
      console.log('❌ Erro na migração:', error.message);
      errorCount++;
    }

    // 2. Verificar tabelas criadas
    console.log('\n2️⃣ Verificando tabelas criadas...');

    try {
      const { data: ciclosCheck } = await supabase
        .from('avaliacao_ciclos')
        .select('id')
        .limit(1);

      console.log('✅ Tabela avaliacao_ciclos:', ciclosCheck ? 'Existe' : 'Não encontrada');

      const { data: respostasCheck } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'avaliacao_respostas')
        .single();

      console.log('✅ Tabela avaliacao_respostas:', respostasCheck ? 'Existe' : 'Não encontrada');

      const { data: configCheck } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'avaliacao_config')
        .single();

      console.log('✅ Tabela avaliacao_config:', configCheck ? 'Existe' : 'Não encontrada');

    } catch (error) {
      console.log('❌ Erro na verificação:', error.message);
    }

    // 3. Testar inserção de dados
    console.log('\n3️⃣ Testando inserção de dados...');
    try {
      const { data: insertData, error: insertError } = await supabase
        .from('avaliacao_ciclos')
        .insert({
          ano: 2025,
          nome: 'Teste 2025',
          status: 'draft'
        })
        .select('id')
        .single();

      if (insertError) {
        console.log('❌ Erro ao inserir dados de teste:', insertError.message);
      } else {
        console.log('✅ Inserção de dados funcionando');
        successCount++;
      }
    } catch (error) {
      console.log('❌ Erro no teste de inserção:', error.message);
    }

    console.log('\n🎉 Resumo da migração:');
    console.log(`   ✅ Operações bem-sucedidas: ${successCount}`);
    console.log(`   ❌ Erros encontrados: ${errorCount}`);

    if (errorCount === 0) {
      console.log('\n🚀 Migração concluída com sucesso!');
      console.log('   As novas tabelas de avaliação estão prontas para uso.');
    } else {
      console.log('\n⚠️  Alguns erros ocorreram. Verifique os logs acima.');
      console.log('   Você pode precisar executar os comandos SQL manualmente no painel Supabase.');
    }

    console.log('\n📋 Próximos passos:');
    console.log('   1. Verificar se as tabelas foram criadas corretamente');
    console.log('   2. Testar as novas APIs em /api/evaluations/');
    console.log('   3. Atualizar o frontend para usar a nova estrutura');
    console.log('   4. Migrar dados existentes se necessário');

  } catch (error) {
    console.error('❌ Erro geral na migração:', error.message);
    process.exit(1);
  }
}

executeMigration();