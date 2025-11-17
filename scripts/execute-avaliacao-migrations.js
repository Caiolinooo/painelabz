/**
 * Script para executar as migrations do sistema de avaliação
 * Executa o arquivo SQL de migrations completas
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuração do Supabase
const SUPABASE_URL = ***REMOVED***;
const ***REMOVED*** = process.env.SUPABASE_SERVICE_ROLE_KEY || ***REMOVED***;

if (!SUPABASE_URL || !***REMOVED***) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? 'OK' : 'FALTANDO');
  console.error('   ***REMOVED***:', ***REMOVED*** ? 'OK' : 'FALTANDO');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, ***REMOVED***);

async function executarMigrations() {
  console.log('🚀 Iniciando execução de migrations do sistema de avaliação...\n');

  try {
    // Ler arquivo SQL
    const sqlFile = path.join(__dirname, 'migrations', 'avaliacao-complete-setup.sql');
    console.log('📄 Lendo arquivo:', sqlFile);

    if (!fs.existsSync(sqlFile)) {
      throw new Error(`Arquivo SQL não encontrado: ${sqlFile}`);
    }

    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    console.log('✅ Arquivo SQL carregado com sucesso\n');

    // Dividir em statements individuais (por ponto e vírgula)
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📊 Total de statements a executar: ${statements.length}\n`);

    let sucessos = 0;
    let falhas = 0;
    const erros = [];

    // Executar cada statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';

      // Ignorar comentários e linhas vazias
      if (statement.trim().startsWith('--') || statement.trim().length <= 1) {
        continue;
      }

      // Extrair descrição do statement para logging
      const descricao = extrairDescricao(statement);

      process.stdout.write(`[${i + 1}/${statements.length}] ${descricao}... `);

      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

        if (error) {
          // Alguns erros são esperados (já existe, etc)
          if (isErroEsperado(error.message)) {
            console.log('⚠️  (já existe)');
          } else {
            console.log('❌');
            falhas++;
            erros.push({
              statement: descricao,
              erro: error.message
            });
          }
        } else {
          console.log('✅');
          sucessos++;
        }
      } catch (err) {
        console.log('❌');
        falhas++;
        erros.push({
          statement: descricao,
          erro: err.message
        });
      }

      // Pequeno delay para não sobrecarregar o banco
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Resumo
    console.log('\n' + '='.repeat(60));
    console.log('📋 RESUMO DA EXECUÇÃO');
    console.log('='.repeat(60));
    console.log(`✅ Sucessos: ${sucessos}`);
    console.log(`❌ Falhas: ${falhas}`);
    console.log(`📊 Total: ${statements.length}`);

    if (erros.length > 0) {
      console.log('\n⚠️  Erros encontrados:');
      erros.forEach((erro, index) => {
        console.log(`\n${index + 1}. ${erro.statement}`);
        console.log(`   Erro: ${erro.erro}`);
      });
    }

    console.log('\n' + '='.repeat(60));

    // Verificar se as tabelas foram criadas
    console.log('\n🔍 Verificando tabelas criadas...\n');
    await verificarTabelas();

    console.log('\n✅ Migrations concluídas!\n');

  } catch (error) {
    console.error('\n❌ Erro ao executar migrations:', error.message);
    process.exit(1);
  }
}

function extrairDescricao(statement) {
  const lowerStatement = statement.toLowerCase();

  if (lowerStatement.includes('create table')) {
    const match = statement.match(/create table\s+(?:if not exists\s+)?(\w+)/i);
    return match ? `Criar tabela ${match[1]}` : 'Criar tabela';
  }

  if (lowerStatement.includes('alter table')) {
    const match = statement.match(/alter table\s+(\w+)/i);
    return match ? `Alterar tabela ${match[1]}` : 'Alterar tabela';
  }

  if (lowerStatement.includes('create index')) {
    const match = statement.match(/create index\s+(?:if not exists\s+)?(\w+)/i);
    return match ? `Criar índice ${match[1]}` : 'Criar índice';
  }

  if (lowerStatement.includes('create view')) {
    const match = statement.match(/create (?:or replace\s+)?view\s+(\w+)/i);
    return match ? `Criar view ${match[1]}` : 'Criar view';
  }

  if (lowerStatement.includes('create function') || lowerStatement.includes('create or replace function')) {
    const match = statement.match(/create (?:or replace\s+)?function\s+(\w+)/i);
    return match ? `Criar function ${match[1]}` : 'Criar function';
  }

  if (lowerStatement.includes('create trigger')) {
    const match = statement.match(/create trigger\s+(\w+)/i);
    return match ? `Criar trigger ${match[1]}` : 'Criar trigger';
  }

  if (lowerStatement.includes('insert into')) {
    const match = statement.match(/insert into\s+(\w+)/i);
    return match ? `Inserir em ${match[1]}` : 'Inserir dados';
  }

  if (lowerStatement.includes('create policy')) {
    const match = statement.match(/create policy\s+(\w+)/i);
    return match ? `Criar policy ${match[1]}` : 'Criar policy';
  }

  if (lowerStatement.includes('enable row level security')) {
    const match = statement.match(/alter table\s+(\w+)/i);
    return match ? `Habilitar RLS em ${match[1]}` : 'Habilitar RLS';
  }

  return 'Executar statement';
}

function isErroEsperado(mensagem) {
  const errosEsperados = [
    'already exists',
    'já existe',
    'duplicate key',
    'relation .* already exists',
    'column .* already exists'
  ];

  return errosEsperados.some(padrao =>
    new RegExp(padrao, 'i').test(mensagem)
  );
}

async function verificarTabelas() {
  const tabelasEsperadas = [
    'avaliacao_usuarios_elegiveis',
    'gerentes_avaliacao_config',
    'avaliacao_colaborador_gerente',
    'avaliacao_cron_log',
    'periodos_avaliacao',
    'criterios',
    'avaliacoes_desempenho',
    'pontuacoes_avaliacao'
  ];

  for (const tabela of tabelasEsperadas) {
    const { data, error } = await supabase
      .from(tabela)
      .select('*')
      .limit(0);

    if (error) {
      if (error.message.includes('does not exist') || error.message.includes('não existe')) {
        console.log(`❌ Tabela ${tabela}: NÃO ENCONTRADA`);
      } else {
        console.log(`⚠️  Tabela ${tabela}: ERRO - ${error.message}`);
      }
    } else {
      console.log(`✅ Tabela ${tabela}: OK`);
    }
  }
}

// Executar
executarMigrations()
  .then(() => {
    console.log('✅ Script concluído com sucesso!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
