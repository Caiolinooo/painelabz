// Script para corrigir o problema de verificação de senha do administrador
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Obter variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const adminId = 'c9b1e9a2-3c80-4b3d-9f75-fc7a00d7cdbb'; // ID do administrador

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

// Função para verificar o estado atual do usuário
async function checkUserState() {
  try {
    console.log(`Verificando estado atual do usuário ${adminId}...`);
    
    // Buscar o usuário no Supabase
    const { data: userData, error } = await supabase
      .from('users_unified')
      .select('id, email, password, password_hash, password_last_changed')
      .eq('id', adminId)
      .single();
    
    if (error) {
      console.error('Erro ao buscar usuário:', error);
      return null;
    }
    
    console.log('Estado atual do usuário:');
    console.log('- ID:', userData.id);
    console.log('- Email:', userData.email);
    console.log('- Tem password:', !!userData.password);
    console.log('- Tem password_hash:', !!userData.password_hash);
    console.log('- Última alteração de senha:', userData.password_last_changed);
    
    return userData;
  } catch (error) {
    console.error('Erro ao verificar estado do usuário:', error);
    return null;
  }
}

// Função para corrigir o problema de senha
async function fixAdminPassword(userData) {
  try {
    console.log('Corrigindo problema de senha do administrador...');
    
    // Verificar se já temos uma senha
    if (!userData.password && !userData.password_hash) {
      console.log('Usuário não tem senha definida. Definindo senha temporária...');
      
      // Gerar hash de uma senha temporária
      const tempPassword = 'Admin@123';
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      
      // Atualizar o usuário com a nova senha
      const { error: updateError } = await supabase
        .from('users_unified')
        .update({
          password: hashedPassword,
          password_hash: hashedPassword,
          password_last_changed: new Date().toISOString()
        })
        .eq('id', adminId);
      
      if (updateError) {
        console.error('Erro ao definir senha temporária:', updateError);
        return false;
      }
      
      console.log('Senha temporária definida com sucesso!');
      console.log('Nova senha: Admin@123');
      return true;
    }
    
    // Se temos password mas não password_hash
    if (userData.password && !userData.password_hash) {
      console.log('Copiando senha da coluna password para password_hash...');
      
      // Copiar password para password_hash
      const { error: updateError } = await supabase
        .from('users_unified')
        .update({
          password_hash: userData.password,
          password_last_changed: userData.password_last_changed || new Date().toISOString()
        })
        .eq('id', adminId);
      
      if (updateError) {
        console.error('Erro ao copiar senha para password_hash:', updateError);
        return false;
      }
      
      console.log('Senha copiada para password_hash com sucesso!');
      return true;
    }
    
    // Se temos password_hash mas não password
    if (!userData.password && userData.password_hash) {
      console.log('Copiando senha da coluna password_hash para password...');
      
      // Copiar password_hash para password
      const { error: updateError } = await supabase
        .from('users_unified')
        .update({
          password: userData.password_hash,
          password_last_changed: userData.password_last_changed || new Date().toISOString()
        })
        .eq('id', adminId);
      
      if (updateError) {
        console.error('Erro ao copiar senha para password:', updateError);
        return false;
      }
      
      console.log('Senha copiada para password com sucesso!');
      return true;
    }
    
    console.log('Usuário já tem senha definida em ambas as colunas. Nenhuma ação necessária.');
    return true;
  } catch (error) {
    console.error('Erro ao corrigir senha do administrador:', error);
    return false;
  }
}

// Função principal
async function main() {
  try {
    // Verificar estado atual do usuário
    const userData = await checkUserState();
    
    if (!userData) {
      console.error('Não foi possível obter informações do usuário. Abortando.');
      process.exit(1);
    }
    
    // Corrigir problema de senha
    const success = await fixAdminPassword(userData);
    
    if (!success) {
      console.error('Não foi possível corrigir o problema de senha. Abortando.');
      process.exit(1);
    }
    
    // Verificar estado final do usuário
    console.log('\nVerificando estado final do usuário...');
    await checkUserState();
    
    console.log('\nProcesso concluído com sucesso!');
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
