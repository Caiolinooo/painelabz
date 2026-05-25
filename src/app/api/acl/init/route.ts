import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// POST - Inicializar permissões ACL básicas
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Inicializando sistema ACL...');

    // Verificar se as tabelas existem tentando fazer uma query simples
    try {
      const { data: testPermissions } = await supabaseAdmin
        .from('acl_permissions')
        .select('id')
        .limit(1);

      const { data: testRolePermissions } = await supabaseAdmin
        .from('role_acl_permissions')
        .select('id')
        .limit(1);

      const { data: testUserPermissions } = await supabaseAdmin
        .from('user_acl_permissions')
        .select('id')
        .limit(1);

      console.log('✅ Tabelas ACL existem e são acessíveis');
    } catch (tableError) {
      console.error('❌ Erro ao acessar tabelas ACL:', tableError);
      return NextResponse.json(
        {
          error: 'Tabelas ACL não existem ou não são acessíveis. Execute o script create-news-system-tables.sql primeiro.',
          details: tableError
        },
        { status: 500 }
      );
    }

    // Definir permissões básicas
    const basicPermissions = [
      // Permissões de notícias
      { name: 'news.create', description: 'Criar notícias', resource: 'news', action: 'create', level: 1 },
      { name: 'news.read', description: 'Visualizar notícias', resource: 'news', action: 'read', level: 0 },
      { name: 'news.update', description: 'Editar notícias', resource: 'news', action: 'update', level: 2 },
      { name: 'news.delete', description: 'Excluir notícias', resource: 'news', action: 'delete', level: 3 },
      { name: 'news.publish', description: 'Publicar notícias', resource: 'news', action: 'publish', level: 2 },
      
      // Permissões de comentários
      { name: 'comments.create', description: 'Criar comentários', resource: 'comments', action: 'create', level: 0 },
      { name: 'comments.moderate', description: 'Moderar comentários', resource: 'comments', action: 'moderate', level: 2 },
      
      // Permissões de notificações
      { name: 'notifications.send', description: 'Enviar notificações', resource: 'notifications', action: 'send', level: 2 },
      { name: 'notifications.manage', description: 'Gerenciar notificações', resource: 'notifications', action: 'manage', level: 3 },
      
      // Permissões de lembretes
      { name: 'reminders.create', description: 'Criar lembretes', resource: 'reminders', action: 'create', level: 1 },
      { name: 'reminders.manage', description: 'Gerenciar lembretes', resource: 'reminders', action: 'manage', level: 2 },
      
      // Permissões de reembolso
      { name: 'reimbursement.create', description: 'Criar reembolsos', resource: 'reimbursement', action: 'create', level: 0 },
      { name: 'reimbursement.approve', description: 'Aprovar reembolsos', resource: 'reimbursement', action: 'approve', level: 2 },
      { name: 'reimbursement.manage', description: 'Gerenciar reembolsos', resource: 'reimbursement', action: 'manage', level: 3 },

      // Permissões de férias
      { name: 'ferias.read', description: 'Visualizar férias e saldo', resource: 'ferias', action: 'read', level: 0 },
      { name: 'ferias.create', description: 'Solicitar férias', resource: 'ferias', action: 'create', level: 1 },
      { name: 'ferias.approve', description: 'Aprovar pedidos de férias', resource: 'ferias', action: 'approve', level: 2 },
      { name: 'ferias.manage', description: 'Gerenciar saldos e períodos de férias', resource: 'ferias', action: 'manage', level: 3 },
      { name: 'ferias.admin', description: 'Administrador de férias', resource: 'ferias', action: 'admin', level: 3 },

      // Permissões de contratos
      { name: 'contratos.read', description: 'Visualizar contratos atribuídos', resource: 'contratos', action: 'read', level: 0 },
      { name: 'contratos.sign', description: 'Assinar contratos atribuídos', resource: 'contratos', action: 'sign', level: 1 },
      { name: 'contratos.manage', description: 'Gerenciar uploads e assinaturas de contratos', resource: 'contratos', action: 'manage', level: 3 },

      // Permissões de lista de presença
      { name: 'lista-presenca.read', description: 'Visualizar listas de presença', resource: 'lista-presenca', action: 'read', level: 0 },
      { name: 'lista-presenca.create', description: 'Criar listas de presença', resource: 'lista-presenca', action: 'create', level: 1 },
      { name: 'lista-presenca.manage', description: 'Gerenciar e assinar listas de presença', resource: 'lista-presenca', action: 'manage', level: 3 },
      
      // Permissões administrativas
      { name: 'admin.users', description: 'Gerenciar usuários', resource: 'admin', action: 'users', level: 3 },
      { name: 'admin.settings', description: 'Gerenciar configurações', resource: 'admin', action: 'settings', level: 3 },
      { name: 'admin.acl', description: 'Gerenciar permissões ACL', resource: 'admin', action: 'acl', level: 3 },

      // Permissões Gestão de Tripulantes
      { name: 'gestao-tripulantes.view', description: 'Visualizar dashboard', resource: 'gestao-tripulantes', action: 'view', level: 0 },
      { name: 'gestao-tripulantes.manage', description: 'Gerenciar tripulantes', resource: 'gestao-tripulantes', action: 'manage', level: 2 },
      { name: 'gestao-tripulantes.admin', description: 'Admin total', resource: 'gestao-tripulantes', action: 'admin', level: 3 },
      { name: 'gestao-tripulantes.documents.upload', description: 'Upload documentos', resource: 'gestao-tripulantes', action: 'documents.upload', level: 1 },
      { name: 'gestao-tripulantes.documents.ocr', description: 'Executar OCR', resource: 'gestao-tripulantes', action: 'documents.ocr', level: 2 },
      { name: 'gestao-tripulantes.back.suggest', description: 'Sugerir back', resource: 'gestao-tripulantes', action: 'back.suggest', level: 2 },
      { name: 'gestao-tripulantes.poliweb.scrape', description: 'Scraping PoliWeb', resource: 'gestao-tripulantes', action: 'poliweb.scrape', level: 3 },
      { name: 'gestao-tripulantes.notifications.send', description: 'Enviar notificações', resource: 'gestao-tripulantes', action: 'notifications.send', level: 2 },

      // Permissões E-Social
      { name: 'e-social.view', description: 'Visualizar eventos', resource: 'e-social', action: 'view', level: 1 },
      { name: 'e-social.prepare', description: 'Preparar eventos', resource: 'e-social', action: 'prepare', level: 2 },
      { name: 'e-social.review', description: 'Revisar eventos', resource: 'e-social', action: 'review', level: 2 },
      { name: 'e-social.send', description: 'Enviar para E-Social', resource: 'e-social', action: 'send', level: 3 },
      { name: 'e-social.admin', description: 'Admin total', resource: 'e-social', action: 'admin', level: 3 }
    ];

    // Inserir permissões básicas
    for (const permission of basicPermissions) {
      const { data: existingPerm } = await supabaseAdmin
        .from('acl_permissions')
        .select('id')
        .eq('name', permission.name)
        .single();

      if (!existingPerm) {
        console.log(`Criando permissão: ${permission.name}`);
        const { error: insertError } = await supabaseAdmin
          .from('acl_permissions')
          .insert({
            ...permission,
            enabled: true,
            created_at: new Date().toISOString()
          });

        if (insertError) {
          console.error(`Erro ao criar permissão ${permission.name}:`, insertError);
        }
      }
    }

    // Definir permissões por role
    const rolePermissions = {
      'ADMIN': basicPermissions.map(p => p.name), // Admin tem todas as permissões
      'MANAGER': [
        'news.create', 'news.read', 'news.update', 'news.publish',
        'comments.create', 'comments.moderate',
        'notifications.send',
        'reminders.create', 'reminders.manage',
        'reimbursement.create', 'reimbursement.approve',
        'ferias.read', 'ferias.create', 'ferias.approve',
        'contratos.read', 'contratos.sign', 'contratos.manage',
        'lista-presenca.read', 'lista-presenca.create', 'lista-presenca.manage',
        'gestao-tripulantes.view', 'gestao-tripulantes.manage',
        'gestao-tripulantes.documents.upload', 'gestao-tripulantes.back.suggest'
      ],
      'USER': [
        'news.read',
        'comments.create',
        'reminders.create',
        'reimbursement.create',
        'ferias.read', 'ferias.create',
        'contratos.read', 'contratos.sign',
        'lista-presenca.read', 'lista-presenca.create'
      ]
    };

    // Inserir permissões por role
    for (const [role, permissions] of Object.entries(rolePermissions)) {
      for (const permissionName of permissions) {
        const { data: permission } = await supabaseAdmin
          .from('acl_permissions')
          .select('id')
          .eq('name', permissionName)
          .single();

        if (permission) {
          const { data: existingRolePerm } = await supabaseAdmin
            .from('role_acl_permissions')
            .select('id')
            .eq('role', role)
            .eq('permission_id', permission.id)
            .single();

          if (!existingRolePerm) {
            console.log(`Atribuindo permissão ${permissionName} ao role ${role}`);
            const { error: insertRolePermError } = await supabaseAdmin
              .from('role_acl_permissions')
              .insert({
                role,
                permission_id: permission.id,
                created_at: new Date().toISOString()
              });

            if (insertRolePermError) {
              console.error(`Erro ao atribuir permissão ${permissionName} ao role ${role}:`, insertRolePermError);
            }
          }
        }
      }
    }

    console.log('✅ Sistema ACL inicializado com sucesso');

    return NextResponse.json({
      success: true,
      message: 'Sistema ACL inicializado com sucesso',
      permissions_created: basicPermissions.length,
      roles_configured: Object.keys(rolePermissions).length
    });

  } catch (error) {
    console.error('Erro ao inicializar sistema ACL:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// GET - Verificar status do sistema ACL
export async function GET() {
  try {
    // Verificar quantas permissões existem
    const { data: permissions, error: permError } = await supabaseAdmin
      .from('acl_permissions')
      .select('id, name, resource, action')
      .eq('enabled', true);

    if (permError) {
      return NextResponse.json(
        { error: 'Erro ao verificar permissões' },
        { status: 500 }
      );
    }

    // Verificar quantas permissões por role existem
    const { data: rolePermissions, error: rolePermError } = await supabaseAdmin
      .from('role_acl_permissions')
      .select('role, permission_id');

    if (rolePermError) {
      return NextResponse.json(
        { error: 'Erro ao verificar permissões por role' },
        { status: 500 }
      );
    }

    const roleStats = rolePermissions?.reduce((acc, rp) => {
      acc[rp.role] = (acc[rp.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    return NextResponse.json({
      permissions_count: permissions?.length || 0,
      permissions: permissions || [],
      role_permissions_count: rolePermissions?.length || 0,
      role_stats: roleStats,
      initialized: (permissions?.length || 0) > 0
    });

  } catch (error) {
    console.error('Erro ao verificar status ACL:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
