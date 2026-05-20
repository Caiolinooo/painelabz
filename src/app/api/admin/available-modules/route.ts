import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET - Obter todos os módulos/cards disponíveis para configuração de permissões
export async function GET() {
  try {
    console.log('🔄 API Available Modules - Buscando módulos...');

    // Buscar todos os cards do Supabase
    const { data: cards, error } = await supabaseAdmin
      .from('cards')
      .select('id, title, description, enabled')
      .order('order', { ascending: true });

    // Usar SYSTEM_MODULES como fonte principal
    const { SYSTEM_MODULES } = await import('@/config/modules');

    // Mapear para o formato esperado
    const modules = SYSTEM_MODULES.map(mod => ({
      id: mod.key,
      label: mod.name,
      description: mod.description || '',
      enabled: true,
      category: mod.category,
      defaultRoles: mod.defaultRoles
    }));

    // Adicionar cards do Supabase que não estão em SYSTEM_MODULES
    if (!error && cards) {
      for (const card of cards) {
        const exists = modules.find(m => m.id === card.id);
        if (!exists) {
          modules.push({
            id: card.id,
            label: card.title,
            description: card.description || '',
            enabled: card.enabled !== false,
            category: 'system',
            defaultRoles: ['ADMIN', 'MANAGER', 'USER']
          });
        }
      }
    }

    // Ordenar por label
    modules.sort((a, b) => a.label.localeCompare(b.label));

    console.log(`✅ ${modules.length} módulos carregados`);
    return NextResponse.json(modules);

  } catch (error) {
    console.error('Erro ao buscar módulos disponíveis:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
