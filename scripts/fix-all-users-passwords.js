// Script para verificar e corrigir problemas de senha em todos os usuários
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Obter variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Verificar configurações
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_KEY devem estar definidos no arquivo .env');
  process.exit(1);
}

// Criar cliente Supabase
console.log('Criando cliente Supabase com URL:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Função para listar todos os usuários
async function listAllUsers() {
  try {
    console.log('Buscando todos os usuários...');
    
    // Buscar todos os usuários
    const { data: users, error } = await supabase
      .from('users_unified')
      .select('id, email, first_name, last_name, role, password, password_hash, password_last_changed')
      .order('email', { ascending: true });
    
    if (error) {
      console.error('Erro ao buscar usuários:', error);
      return [];
    }
    
    console.log(`Encontrados ${users.length} usuários.`);
    return users;
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    return [];
  }
}

// Função para corrigir problemas de senha
async function fixUserPassword(user) {
  try {
    console.log(`\nVerificando usuário: ${user.email} (${user.first_name} ${user.last_name})`);
    console.log(`- ID: ${user.id}`);
    console.log(`- Papel: ${user.role}`);
    console.log(`- Tem password: ${!!user.password}`);
    console.log(`- Tem password_hash: ${!!user.password_hash}`);
    
    // Verificar se há problemas para corrigir
    if (user.password && !user.password_hash) {
      console.log('- Problema: Tem password mas não tem password_hash');
      console.log('- Ação: Copiando password para password_hash');
      
      // Copiar password para password_hash
      const { error: updateError } = await supabase
        .from('users_unified')
        .update({
          password_hash: user.password,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (updateError) {
        console.error('- Erro ao atualizar password_hash:', updateError);
        return false;
      }
      
      console.log('- Resultado: Senha copiada para password_hash com sucesso!');
      return true;
    }
    
    if (!user.password && user.password_hash) {
      console.log('- Problema: Tem password_hash mas não tem password');
      console.log('- Ação: Copiando password_hash para password');
      
      // Copiar password_hash para password
      const { error: updateError } = await supabase
        .from('users_unified')
        .update({
          password: user.password_hash,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (updateError) {
        console.error('- Erro ao atualizar password:', updateError);
        return false;
      }
      
      console.log('- Resultado: Senha copiada para password com sucesso!');
      return true;
    }
    
    if (!user.password && !user.password_hash) {
      console.log('- Problema: Não tem password nem password_hash');
      console.log('- Ação: Nenhuma ação automática. Usuário precisa definir senha.');
      return true;
    }
    
    console.log('- Status: OK. Usuário tem senha definida em ambas as colunas.');
    return true;
  } catch (error) {
    console.error(`Erro ao corrigir senha do usuário ${user.email}:`, error);
    return false;
  }
}

// Função principal
async function main() {
  try {
    console.log('Iniciando verificação e correção de senhas...');
    
    // Listar todos os usuários
    const users = await listAllUsers();
    
    if (users.length === 0) {
      console.log('Nenhum usuário encontrado. Nada a fazer.');
      return;
    }
    
    // Estatísticas
    let totalFixed = 0;
    let totalErrors = 0;
    let totalOk = 0;
    let totalNoPassword = 0;
    
    // Processar cada usuário
    for (const user of users) {
      const result = await fixUserPassword(user);
      
      if (result) {
        if (!user.password && !user.password_hash) {
          totalNoPassword++;
        } else if (user.password && user.password_hash) {
          totalOk++;
        } else {
          totalFixed++;
        }
      } else {
        totalErrors++;
      }
    }
    
    // Exibir resumo
    console.log('\n=== RESUMO ===');
    console.log(`Total de usuários: ${users.length}`);
    console.log(`Usuários corrigidos: ${totalFixed}`);
    console.log(`Usuários sem senha: ${totalNoPassword}`);
    console.log(`Usuários OK: ${totalOk}`);
    console.log(`Erros: ${totalErrors}`);
    
    console.log('\nProcesso concluído!');
  } catch (error) {
    console.error('Erro durante a execução do script:', error);
    process.exit(1);
  }
}

// Executar função principal
main()
  .then(() => {
    console.log('Script concluído com sucesso!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erro durante a execução do script:', error);
    process.exit(1);
  });
