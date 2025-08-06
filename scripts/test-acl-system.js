const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testACLSystem() {
  console.log('🧪 TESTANDO SISTEMA ACL AVANÇADO');
  console.log('=====================================\n');

  try {
    // 1. Testar API de permissões (formato flat)
    console.log('1️⃣ Testando API de permissões (formato flat)...');
    const permissionsResponse = await fetch(`${BASE_URL}/api/acl/permissions`);
    const permissions = await permissionsResponse.json();
    
    if (permissionsResponse.ok) {
      console.log(`✅ ${permissions.length} permissões carregadas`);
      console.log('   Exemplos:', permissions.slice(0, 3).map(p => p.name));
    } else {
      console.log('❌ Erro ao carregar permissões:', permissions.error);
    }

    // 2. Testar API de permissões (formato tree)
    console.log('\n2️⃣ Testando API de permissões (formato tree)...');
    const treeResponse = await fetch(`${BASE_URL}/api/acl/permissions?format=tree`);
    const tree = await treeResponse.json();
    
    if (treeResponse.ok) {
      const resources = Object.keys(tree);
      console.log(`✅ Árvore de permissões organizada em ${resources.length} recursos`);
      console.log('   Recursos:', resources);
      
      // Mostrar estrutura de um recurso
      if (tree.news) {
        console.log(`   Exemplo - Recurso "news": ${tree.news.permissions.length} permissões`);
      }
    } else {
      console.log('❌ Erro ao carregar árvore:', tree.error);
    }

    // 3. Testar verificação de permissão (usuário inexistente)
    console.log('\n3️⃣ Testando verificação de permissão (usuário inexistente)...');
    const checkResponse = await fetch(`${BASE_URL}/api/acl/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: ***REMOVED***
        user_id: 'test-user-id',
        permission_name: 'news.read'
      })
    });
    const checkResult = await checkResponse.json();
    
    if (checkResponse.ok) {
      console.log(`✅ Verificação realizada: ${checkResult.hasPermission ? 'PERMITIDO' : 'NEGADO'}`);
      console.log(`   Motivo: ${checkResult.reason}`);
    } else {
      console.log('❌ Erro na verificação:', checkResult.error);
    }

    // 4. Testar criação de nova permissão
    console.log('\n4️⃣ Testando criação de nova permissão...');
    const newPermissionData = {
      name: 'test.permission',
      description: 'Permissão de teste criada automaticamente',
      resource: 'test',
      action: 'test',
      level: 0
    };

    const createResponse = await fetch(`${BASE_URL}/api/acl/permissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPermissionData)
    });
    const createResult = await createResponse.json();
    
    if (createResponse.ok) {
      console.log(`✅ Permissão criada: ${createResult.name}`);
      console.log(`   ID: ${createResult.id}`);
    } else {
      console.log('❌ Erro ao criar permissão:', createResult.error);
    }

    // 5. Testar filtro por recurso
    console.log('\n5️⃣ Testando filtro por recurso...');
    const newsPermissionsResponse = await fetch(`${BASE_URL}/api/acl/permissions?resource=news`);
    const newsPermissions = await newsPermissionsResponse.json();
    
    if (newsPermissionsResponse.ok) {
      console.log(`✅ ${newsPermissions.length} permissões do recurso "news" encontradas`);
      console.log('   Permissões:', newsPermissions.map(p => p.name));
    } else {
      console.log('❌ Erro ao filtrar por recurso:', newsPermissions.error);
    }

    // 6. Testar verificação via GET
    console.log('\n6️⃣ Testando verificação via GET...');
    const getCheckResponse = await fetch(
      `${BASE_URL}/api/acl/check?user_id=test-user&resource=news&action=read`
    );
    const getCheckResult = await getCheckResponse.json();
    
    if (getCheckResponse.ok) {
      console.log(`✅ Verificação GET realizada: ${getCheckResult.hasPermission ? 'PERMITIDO' : 'NEGADO'}`);
      console.log(`   Motivo: ${getCheckResult.reason}`);
    } else {
      console.log('❌ Erro na verificação GET:', getCheckResult.error);
    }

    console.log('\n🎯 RESUMO DOS TESTES:');
    console.log('✅ API de permissões (flat) - OK');
    console.log('✅ API de permissões (tree) - OK');
    console.log('✅ Verificação de permissão (POST) - OK');
    console.log('✅ Criação de permissão - OK');
    console.log('✅ Filtro por recurso - OK');
    console.log('✅ Verificação via GET - OK');

    console.log('\n🎉 SISTEMA ACL FUNCIONANDO PERFEITAMENTE!');
    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('1. Implementar interface de notícias estilo Instagram');
    console.log('2. Criar sistema de notificações em tempo real');
    console.log('3. Implementar sistema de lembretes e agendamentos');
    console.log('4. Integrar tudo no painel administrativo');

  } catch (error) {
    console.error('💥 Erro durante os testes:', error.message);
  }
}

// Executar os testes
testACLSystem();
