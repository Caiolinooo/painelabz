require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Importar as funções de validação (simuladas para Node.js)
const { extractNameFromEmail, isGenericName, formatName } = (() => {
  // Lista de nomes genéricos
  const GENERIC_NAMES = [
    'usuario', 'user', 'usuário', 'admin', 'administrador', 'test', 'teste',
    'temp', 'temporario', 'temporário', 'guest', 'convidado', 'default',
    'padrão', 'padrao', 'exemplo', 'example', 'sample', 'demo', 'null',
    'undefined', 'nome', 'name', 'firstname', 'lastname', 'sobrenome'
  ];

  const isGenericName = (name) => {
    if (!name || typeof name !== 'string') return true;
    const cleanName = name.trim().toLowerCase();
    if (cleanName.length < 2) return true;
    if (/^\d+$/.test(cleanName)) return true;
    if (GENERIC_NAMES.includes(cleanName)) return true;
    return /^(user|usuario|admin|test|teste|temp|guest|default|exemplo|sample|demo)\d*$/i.test(cleanName);
  };

  const extractNameFromEmail = (email) => {
    if (!email || typeof email !== 'string') return null;

    try {
      const emailPart = email.split('@')[0];
      if (!emailPart) return null;

      let cleanName = emailPart
        .replace(/[0-9._-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleanName || cleanName.length < 2) return null;

      const nameParts = cleanName
        .split(/\s+/)
        .filter(part => part.length > 1)
        .filter(part => !isGenericName(part));

      if (nameParts.length === 0) return null;

      const capitalizedParts = nameParts.map(part =>
        part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
      );

      if (capitalizedParts.length === 1) {
        return { firstName: capitalizedParts[0] };
      } else if (capitalizedParts.length >= 2) {
        return {
          firstName: capitalizedParts[0],
          lastName: capitalizedParts[capitalizedParts.length - 1]
        };
      }

      return null;
    } catch (error) {
      console.error('Erro ao extrair nome do email:', error);
      return null;
    }
  };

  const formatName = (name) => {
    if (!name || typeof name !== 'string') return '';

    return name
      .trim()
      .split(/\s+/)
      .map(part => {
        if (part.length <= 2) {
          const lowerPart = part.toLowerCase();
          if (['da', 'de', 'do', 'das', 'dos', 'e', 'o', 'a'].includes(lowerPart)) {
            return lowerPart;
          }
        }
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      })
      .join(' ');
  };

  return { extractNameFromEmail, isGenericName, formatName };
})();

// Configuração do Supabase
const supabaseUrl = ***REMOVED***;
const supabaseServiceKey = ***REMOVED***;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  console.error('Certifique-se de que NEXT_PUBLIC_SUPABASE_URL e ***REMOVED*** estão definidas');
  process.exit(1);
}

const supabase = ***REMOVED*** supabaseServiceKey);

console.log('🔍 Verificando usuários com nomes padrão...\n');

async function fixUserNames() {
  try {
    // Buscar usuários com nomes genéricos, nulos ou vazios
    const { data: users, error } = await supabase
      .from('users_unified')
      .select('id, email, first_name, last_name, phone_number')
      .or('first_name.eq.Usuário,first_name.eq.Usuario,first_name.eq.User,first_name.is.null,first_name.eq.,last_name.eq.ABZ,last_name.is.null,last_name.eq.');

    if (error) {
      console.error('❌ Erro ao buscar usuários:', error);
      return;
    }

    if (!users || users.length === 0) {
      console.log('✅ Nenhum usuário com nome padrão encontrado!');
      return;
    }

    console.log(`📊 Encontrados ${users.length} usuários com nomes padrão:\n`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      console.log(`👤 Usuário: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Nome atual: "${user.first_name || 'null'}" "${user.last_name || 'null'}"`);

      // Verificar se precisa de correção
      const needsFirstNameFix = !user.first_name || isGenericName(user.first_name);
      const needsLastNameFix = !user.last_name || isGenericName(user.last_name);

      if (!needsFirstNameFix && !needsLastNameFix) {
        console.log(`   ✅ Nomes já estão bons`);
        skippedCount++;
        console.log('');
        continue;
      }

      // Extrair sugestões do email
      const extracted = extractNameFromEmail(user.email);
      let suggestedFirstName = null;
      let suggestedLastName = null;

      if (extracted) {
        if (needsFirstNameFix && extracted.firstName) {
          suggestedFirstName = formatName(extracted.firstName);
        }
        if (needsLastNameFix && extracted.lastName) {
          suggestedLastName = formatName(extracted.lastName);
        }
      }

      if (suggestedFirstName || suggestedLastName) {
        console.log(`   💡 Sugestões: Nome: "${suggestedFirstName || 'manter atual'}" | Sobrenome: "${suggestedLastName || 'manter atual'}"`);

        // Preparar dados para atualização
        const updateData = {
          updated_at: new Date().toISOString()
        };

        if (suggestedFirstName) {
          updateData.first_name = suggestedFirstName;
        }
        if (suggestedLastName) {
          updateData.last_name = suggestedLastName;
        }

        const { error: updateError } = await supabase
          .from('users_unified')
          .update(updateData)
          .eq('id', user.id);

        if (updateError) {
          console.log(`   ❌ Erro ao atualizar: ${updateError.message}`);
        } else {
          console.log(`   ✅ Nome atualizado com sucesso!`);
          fixedCount++;
        }
      } else {
        console.log(`   ⚠️  Não foi possível sugerir um nome melhor`);
        skippedCount++;
      }

      console.log(''); // Linha em branco para separar usuários
    }

    console.log('📊 Resumo da correção:');
    console.log(`✅ Usuários corrigidos: ${fixedCount}`);
    console.log(`⚠️  Usuários ignorados: ${skippedCount}`);
    console.log(`📝 Total processados: ${users.length}`);

    if (fixedCount > 0) {
      console.log('\n🎉 Correção concluída! Os usuários agora devem ver seus nomes corretos no greeting.');
      console.log('💡 Dica: Os usuários podem editar seus nomes na página de perfil se necessário.');
    }

  } catch (error) {
    console.error('❌ Erro durante a correção:', error);
  }
}

// Função para listar todos os usuários e seus nomes atuais
async function listAllUsers() {
  try {
    const { data: users, error } = await supabase
      .from('users_unified')
      .select('id, email, first_name, last_name')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao listar usuários:', error);
      return;
    }

    console.log('\n📋 Lista de todos os usuários:');
    console.log('=' .repeat(60));

    users.forEach((user, index) => {
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   Nome: "${fullName || 'Sem nome'}" (${user.first_name || 'null'}, ${user.last_name || 'null'})`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Erro ao listar usuários:', error);
  }
}

// Verificar argumentos da linha de comando
const args = process.argv.slice(2);

if (args.includes('--list')) {
  listAllUsers();
} else if (args.includes('--help')) {
  console.log('🔧 Script de correção de nomes de usuários\n');
  console.log('Uso:');
  console.log('  node scripts/fix-user-names.js          # Corrigir nomes padrão');
  console.log('  node scripts/fix-user-names.js --list   # Listar todos os usuários');
  console.log('  node scripts/fix-user-names.js --help   # Mostrar esta ajuda');
} else {
  fixUserNames();
}
