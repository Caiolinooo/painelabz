import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET - Obter todos os módulos/cards disponíveis para configuração de permissões
export async function GET() {
  try {
    console.log('🔄 API Available Modules - Buscando cards/módulos disponíveis...');

    // Buscar todos os cards do Supabase
    const { data: cards, error } = await supabaseAdmin
      .from('cards')
      .select('id, title, description, enabled')
      .order('order', { ascending: true });

    if (error) {
      console.error('Erro ao buscar cards do Supabase:', error);

      // Fallback para módulos hardcoded se houver erro
      const fallbackModules = [
        { id: 'dashboard', label: 'Dashboard', description: 'Painel principal do sistema' },
        { id: 'manual', label: 'Manual', description: 'Manual do colaborador' },
        { id: 'procedimentos', label: 'Procedimentos', description: 'Procedimentos da empresa' },
        { id: 'politicas', label: 'Políticas', description: 'Políticas da empresa' },
        { id: 'calendario', label: 'Calendário', description: 'Calendário de eventos' },
        { id: 'noticias', label: 'Notícias', description: 'Notícias da empresa' },
        { id: 'reembolso', label: 'Reembolso', description: 'Sistema de reembolsos' },
        { id: 'contracheque', label: 'Contracheque', description: 'Contracheques dos funcionários' },
        { id: 'academy', label: 'ABZ Academy', description: 'Centro de treinamento e desenvolvimento profissional' },
        { id: 'ponto', label: 'Ponto', description: 'Sistema de ponto eletrônico' },
        { id: 'admin', label: 'Administração', description: 'Área administrativa do sistema' },
        { id: 'avaliacao', label: 'Avaliação', description: 'Sistema de avaliações' }
      ];

      return NextResponse.json(fallbackModules);
    }

    console.log(`✅ ${cards.length} cards/módulos carregados do Supabase`);

    // Mapear os cards para o formato de módulos
    const modules = cards.map(card => ({
      id: card.id,
      label: card.title,
      description: card.description || '',
      enabled: card.enabled !== false
    }));

    // Adicionar módulos especiais que não são cards
    const specialModules = [
      { id: 'admin', label: 'Administração', description: 'Área administrativa do sistema', enabled: true },
      { id: 'avaliacao', label: 'Avaliação', description: 'Sistema de avaliações', enabled: true },
      { id: 'biblioteca', label: 'Biblioteca', description: 'Repositório de arquivos e documentos', enabled: true }
    ];

    // Módulos que devem ser ocultos do seletor de permissões pois foram consolidados na Biblioteca
    const hiddenModules = ['manual', 'procedimentos', 'politicas', 'guia_offshore'];

    // Combinar cards e módulos especiais, removendo duplicatas e ocultos
    const allModules: any[] = [];

    // Adicionar cards (se não estiverem ocultos)
    modules.forEach(m => {
      if (!hiddenModules.includes(m.id) && !allModules.some(am => am.id === m.id)) {
        allModules.push(m);
      }
    });

    // Adicionar especiais
    specialModules.forEach(specialModule => {
      if (!allModules.find(m => m.id === specialModule.id)) {
        allModules.push(specialModule);
      }
    });

    // Ordenar por label
    allModules.sort((a, b) => a.label.localeCompare(b.label));

    return NextResponse.json(allModules);

  } catch (error) {
    console.error('Erro ao buscar módulos disponíveis:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
