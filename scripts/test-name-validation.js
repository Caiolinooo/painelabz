require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Simular as funções de validação para Node.js
const { isNameEmpty, extractNameFromEmail, validateName, profileNeedsCompletion } = (() => {
  const GENERIC_NAMES = [
    'usuario', 'user', 'usuário', 'admin', 'administrador', 'test', 'teste',
    'temp', 'temporario', 'temporário', 'guest', 'convidado', 'default',
    'padrão', 'padrao', 'exemplo', 'example', 'sample', 'demo', 'null',
    'undefined', 'nome', 'name', 'firstname', 'lastname', 'sobrenome',
    'cliente', 'client', 'pessoa', 'person', 'fulano', 'ciclano', 'beltrano'
  ];

  const isNameEmpty = (name) => {
    if (!name || typeof name !== 'string') return true;
    const cleanName = name.trim();
    return cleanName.length < 2;
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
        .filter(part => part.length > 1);
      
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

  const validateName = (name) => {
    if (!name || typeof name !== 'string') {
      return {
        isValid: false,
        message: 'Nome é obrigatório'
      };
    }

    const cleanName = name.trim();

    if (cleanName.length < 2) {
      return {
        isValid: false,
        message: 'Nome deve ter pelo menos 2 caracteres'
      };
    }

    return {
      isValid: true
    };
  };

  const profileNeedsCompletion = (profile) => {
    const reasons = [];
    let needsCompletion = false;

    const firstName = profile?.first_name?.trim() || '';
    const lastName = profile?.last_name?.trim() || '';

    if (isNameEmpty(firstName)) {
      reasons.push('Primeiro nome não informado');
      needsCompletion = true;
    }

    if (isNameEmpty(lastName)) {
      reasons.push('Sobrenome não informado');
      needsCompletion = true;
    }

    const suggestions = {};

    if (needsCompletion && profile?.email) {
      const extracted = extractNameFromEmail(profile.email);
      if (extracted) {
        if (isNameEmpty(firstName)) {
          suggestions.firstName = extracted.firstName;
        }
        if (isNameEmpty(lastName)) {
          suggestions.lastName = extracted.lastName;
        }
      }
    }

    return { needsCompletion, reasons, suggestions };
  };

  return { isNameEmpty, extractNameFromEmail, validateName, profileNeedsCompletion };
})();

// Configurar Supabase
const supabaseUrl = ***REMOVED***;
const supabaseKey = ***REMOVED***;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = ***REMOVED*** supabaseKey);

async function testNameValidation() {
  console.log('🧪 TESTANDO SISTEMA DE VALIDAÇÃO DE NOMES\n');

  try {
    // Buscar alguns usuários para teste
    const { data: users, error } = await supabase
      .from('users_unified')
      .select('id, email, first_name, last_name')
      .limit(10);

    if (error) {
      throw error;
    }

    console.log(`📊 Analisando ${users.length} usuários:\n`);

    let needsCompletionCount = 0;
    let goodProfilesCount = 0;

    for (const user of users) {
      console.log(`👤 Usuário: ${user.email}`);
      console.log(`   Nome atual: "${user.first_name || 'N/A'}" "${user.last_name || 'N/A'}"`);

      // Analisar perfil
      const analysis = profileNeedsCompletion(user);

      if (analysis.needsCompletion) {
        needsCompletionCount++;
        console.log(`   ⚠️  Precisa completar: ${analysis.reasons.join(', ')}`);

        if (analysis.suggestions.firstName || analysis.suggestions.lastName) {
          console.log(`   💡 Sugestões: Nome: "${analysis.suggestions.firstName || 'manter'}" | Sobrenome: "${analysis.suggestions.lastName || 'manter'}"`);
        }
      } else {
        goodProfilesCount++;
        console.log(`   ✅ Perfil está completo`);
      }

      // Testar validação individual dos nomes
      if (user.first_name) {
        const firstValidation = validateName(user.first_name);
        console.log(`   📝 Nome: ${firstValidation.isValid ? 'Válido' : 'Inválido'}`);
        if (!firstValidation.isValid) {
          console.log(`      Problema: ${firstValidation.message}`);
        }
      }

      if (user.last_name) {
        const lastValidation = validateName(user.last_name);
        console.log(`   📝 Sobrenome: ${lastValidation.isValid ? 'Válido' : 'Inválido'}`);
        if (!lastValidation.isValid) {
          console.log(`      Problema: ${lastValidation.message}`);
        }
      }

      console.log('');
    }

    // Resumo
    console.log('📋 RESUMO DOS TESTES:');
    console.log(`   ✅ Perfis completos: ${goodProfilesCount}`);
    console.log(`   ⚠️  Precisam completar: ${needsCompletionCount}`);
    console.log(`   📊 Taxa de completude necessária: ${((needsCompletionCount / users.length) * 100).toFixed(1)}%`);

    // Testar extração de nomes de emails
    console.log('\n🧪 TESTANDO EXTRAÇÃO DE NOMES DE EMAILS:');
    const testEmails = [
      'ludmilla.oliveira@groupabz.com',
      'joao.silva123@empresa.com',
      'maria_santos@test.com',
      'user123@domain.com',
      'admin@company.com',
      'pedro-henrique@email.com'
    ];

    for (const email of testEmails) {
      const extracted = extractNameFromEmail(email);
      console.log(`   📧 ${email}`);
      if (extracted) {
        console.log(`      ✅ Extraído: "${extracted.firstName || 'N/A'}" "${extracted.lastName || 'N/A'}"`);
      } else {
        console.log(`      ❌ Não foi possível extrair nomes válidos`);
      }
    }

  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
  }
}

// Executar testes
if (require.main === module) {
  testNameValidation();
}

module.exports = { testNameValidation };
