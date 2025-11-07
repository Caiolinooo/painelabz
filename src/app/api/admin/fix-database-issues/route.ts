import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Iniciando correção de problemas do banco de dados...');

    // 1. Verificar se a tabela users_unified existe e tem dados
    const { data: usersUnified, error: usersError } = await supabaseAdmin
      .from('users_unified')
      .select('*');

    if (usersError) {
      console.error('❌ Erro ao buscar users_unified:', usersError);
      return NextResponse.json({ 
        error: 'Erro ao acessar tabela users_unified',
        details: usersError 
      }, { status: 500 });
    }

    console.log(`✅ Encontrados ${usersUnified?.length || 0} usuários na tabela users_unified`);

    // 2. Verificar se a tabela user_permissions existe
    const { data: permissions, error: permissionsError } = await supabaseAdmin
      .from('user_permissions')
      .select('*');

    if (permissionsError) {
      console.error('❌ Erro ao buscar user_permissions:', permissionsError);
      return NextResponse.json({ 
        error: 'Erro ao acessar tabela user_permissions',
        details: permissionsError 
      }, { status: 500 });
    }

    console.log(`✅ Encontradas ${permissions?.length || 0} permissões na tabela user_permissions`);

    // 3. Verificar usuário administrador específico
    const adminEmail = '***REMOVED***';
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('users_unified')
      .select('*')
      .eq('email', adminEmail)
      .single();

    if (adminError) {
      console.error('❌ Erro ao buscar usuário admin:', adminError);
      return NextResponse.json({ 
        error: 'Usuário administrador não encontrado',
        details: adminError 
      }, { status: 404 });
    }

    console.log(`✅ Usuário administrador encontrado: ${adminUser.id}`);

    // 4. Verificar se existem permissões para este usuário
    const { data: adminPermissions, error: adminPermError } = await supabaseAdmin
      .from('user_permissions')
      .select('*')
      .eq('user_id', adminUser.id);

    if (adminPermError) {
      console.error('❌ Erro ao buscar permissões do admin:', adminPermError);
    } else {
      console.log(`✅ Permissões existentes para admin: ${adminPermissions?.length || 0}`);
    }

    // 5. Corrigir foreign key constraints se necessário
    const fixes = [];

    // Se não há permissões para o admin, criar as permissões básicas
    if (!adminPermissions || adminPermissions.length === 0) {
      console.log('🔧 Criando permissões básicas para o administrador...');
      
      const defaultPermissions = [
        { user_id: adminUser.id, module: 'admin', feature: null },
        { user_id: adminUser.id, module: 'dashboard', feature: null },
        { user_id: adminUser.id, module: 'users', feature: null },
        { user_id: adminUser.id, module: 'settings', feature: null },
        { user_id: adminUser.id, module: 'avaliacao', feature: null },
        { user_id: adminUser.id, module: 'reembolso', feature: null },
        { user_id: adminUser.id, module: 'noticias', feature: null },
        { user_id: adminUser.id, module: 'manual', feature: null },
        { user_id: adminUser.id, module: 'procedimentos', feature: null },
        { user_id: adminUser.id, module: 'politicas', feature: null },
        { user_id: adminUser.id, module: 'calendario', feature: null },
        { user_id: adminUser.id, module: 'contracheque', feature: null },
        { user_id: adminUser.id, module: 'ponto', feature: null }
      ];

      const { data: insertedPermissions, error: insertError } = await supabaseAdmin
        .from('user_permissions')
        .insert(defaultPermissions)
        .select();

      if (insertError) {
        console.error('❌ Erro ao inserir permissões:', insertError);
        fixes.push({
          action: 'create_admin_permissions',
          status: 'error',
          error: insertError
        });
      } else {
        console.log(`✅ ${insertedPermissions?.length || 0} permissões criadas para o administrador`);
        fixes.push({
          action: 'create_admin_permissions',
          status: 'success',
          count: insertedPermissions?.length || 0
        });
      }
    }

    // 6. Verificar e corrigir inconsistências na tabela user_permissions
    console.log('🔧 Verificando consistência da tabela user_permissions...');
    
    const { data: allPermissions, error: allPermError } = await supabaseAdmin
      .from('user_permissions')
      .select(`
        id,
        user_id,
        module,
        feature,
        users_unified!inner(id, email, first_name, last_name)
      `);

    if (allPermError) {
      console.error('❌ Erro ao verificar consistência:', allPermError);
      fixes.push({
        action: 'check_consistency',
        status: 'error',
        error: allPermError
      });
    } else {
      console.log(`✅ Verificação de consistência concluída: ${allPermissions?.length || 0} permissões válidas`);
      fixes.push({
        action: 'check_consistency',
        status: 'success',
        validPermissions: allPermissions?.length || 0
      });
    }

    // 7. Atualizar access_permissions no usuário admin se necessário
    if (!adminUser.access_permissions) {
      console.log('🔧 Atualizando access_permissions para o administrador...');
      
      const accessPermissions = {
        modules: {
          admin: true,
          dashboard: true,
          users: true,
          settings: true,
          avaliacao: true,
          reembolso: true,
          noticias: true,
          manual: true,
          procedimentos: true,
          politicas: true,
          calendario: true,
          contracheque: true,
          ponto: true
        },
        features: {}
      };

      const { error: updateError } = await supabaseAdmin
        .from('users_unified')
        .update({ access_permissions: accessPermissions })
        .eq('id', adminUser.id);

      if (updateError) {
        console.error('❌ Erro ao atualizar access_permissions:', updateError);
        fixes.push({
          action: 'update_access_permissions',
          status: 'error',
          error: updateError
        });
      } else {
        console.log('✅ access_permissions atualizado para o administrador');
        fixes.push({
          action: 'update_access_permissions',
          status: 'success'
        });
      }
    }

    return NextResponse.json({
      message: 'Correção de problemas do banco de dados concluída',
      adminUser: {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      },
      fixes,
      summary: {
        usersUnifiedCount: usersUnified?.length || 0,
        userPermissionsCount: permissions?.length || 0,
        adminPermissionsCount: adminPermissions?.length || 0,
        fixesApplied: fixes.length
      }
    });

  } catch (error) {
    console.error('❌ Erro geral na correção do banco:', error);
    return NextResponse.json({
      error: 'Erro interno na correção do banco de dados',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'API de correção de problemas do banco de dados',
    description: 'Use POST para executar as correções',
    endpoints: {
      POST: 'Executa correções automáticas no banco de dados'
    }
  });
}
