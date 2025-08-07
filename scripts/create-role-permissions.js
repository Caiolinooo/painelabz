const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = ***REMOVED***;
const supabaseServiceKey = ***REMOVED***;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  console.error('Certifique-se de que NEXT_PUBLIC_SUPABASE_URL e ***REMOVED*** estão definidas no .env');
  process.exit(1);
}

const supabase = ***REMOVED*** supabaseServiceKey);

async function createRolePermissionsTable() {
  try {
    console.log('🔄 Criando tabela role_permissions...');

    // Verificar se a tabela já existe
    const { data: existingTable, error: checkError } = await supabase
      .from('role_permissions')
      .select('id')
      .limit(1);

    if (!checkError) {
      console.log('✅ Tabela role_permissions já existe');

      // Verificar quantos roles existem
      const { data: roles, error: rolesError } = await supabase
        .from('role_permissions')
        .select('role');

      if (!rolesError) {
        console.log(`📊 ${roles.length} roles encontrados:`, roles.map(r => r.role).join(', '));

        if (roles.length === 0) {
          console.log('📝 Tabela vazia, inserindo dados padrão...');
          // Continuar para inserir dados
        } else {
          console.log('✅ Dados já existem na tabela');
          return;
        }
      }
    }

    if (checkError && checkError.code === '42P01') {
      console.log('📝 Tabela não existe, mas não podemos criá-la via API');
      console.log('🔧 Execute o SQL no Supabase SQL Editor primeiro');
      return;
    }

    // Dados padrão para inserir
    const defaultRoles = [
      {
        role: 'ADMIN',
        modules: {
          dashboard: true,
          manual: true,
          procedimentos: true,
          politicas: true,
          calendario: true,
          noticias: true,
          reembolso: true,
          contracheque: true,
          ponto: true,
          admin: true,
          avaliacao: true
        },
        features: {
          reimbursement_approval: true,
          reimbursement_edit: true,
          reimbursement_view: true
        }
      },
      {
        role: 'MANAGER',
        modules: {
          dashboard: true,
          manual: true,
          procedimentos: true,
          politicas: true,
          calendario: true,
          noticias: true,
          reembolso: true,
          contracheque: true,
          ponto: true,
          admin: false,
          avaliacao: true
        },
        features: {
          reimbursement_approval: true,
          reimbursement_view: true,
          reimbursement_edit: false
        }
      },
      {
        role: 'USER',
        modules: {
          dashboard: true,
          manual: true,
          procedimentos: true,
          politicas: true,
          calendario: true,
          noticias: true,
          reembolso: true,
          contracheque: true,
          ponto: true,
          admin: false,
          avaliacao: false
        },
        features: {
          reimbursement_approval: false,
          reimbursement_view: true,
          reimbursement_edit: false
        }
      }
    ];

    console.log('❌ Não é possível criar tabelas via API do Supabase');
    console.log('📋 Execute o seguinte SQL no Supabase SQL Editor:');
    console.log('');
    console.log('-- Criar tabela role_permissions');
    console.log('CREATE TABLE IF NOT EXISTS role_permissions (');
    console.log('  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,');
    console.log('  role VARCHAR(50) NOT NULL UNIQUE,');
    console.log('  modules JSONB DEFAULT \'{}\',');
    console.log('  features JSONB DEFAULT \'{}\',');
    console.log('  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
    console.log('  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
    console.log(');');
    console.log('');
    console.log('-- Criar índice');
    console.log('CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);');
    console.log('');

    // Inserir dados usando a API
    console.log('📝 Tentando inserir dados via API...');
    
    for (const roleData of defaultRoles) {
      console.log(`Inserindo role: ${roleData.role}`);
      
      const { data, error } = await supabase
        .from('role_permissions')
        .upsert(roleData, { 
          onConflict: 'role',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error(`❌ Erro ao inserir ${roleData.role}:`, error.message);
        if (error.code === '42P01') {
          console.log('');
          console.log('🔧 SOLUÇÃO: Execute o SQL acima no Supabase SQL Editor primeiro');
          console.log('   1. Acesse o Supabase Dashboard');
          console.log('   2. Vá para SQL Editor');
          console.log('   3. Execute o SQL mostrado acima');
          console.log('   4. Execute este script novamente');
          console.log('');
          return;
        }
      } else {
        console.log(`✅ Role ${roleData.role} inserido com sucesso`);
      }
    }

    console.log('✅ Processo concluído!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

// Executar o script
createRolePermissionsTable();
