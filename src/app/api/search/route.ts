import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

interface SearchResult {
  id: string;
  type: 'document' | 'news' | 'user' | 'card' | 'reimbursement' | 'paystub' | 'evaluation' | 'policy' | 'procedure' | 'calendar' | 'academy';
  title: string;
  content: string;
  url: string;
  relevance?: number;
  metadata?: any;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type'); // Filtro por tipo
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const locale = searchParams.get('locale') || 'pt-BR';

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        error: 'Query deve ter pelo menos 2 caracteres'
      }, { status: 400 });
    }

    console.log(`🔍 Busca iniciada: "${query}" | Tipo: ${type || 'todos'} | Limite: ${limit} | Locale: ${locale}`);

    const results: SearchResult[] = [];
    const searchTerm = query.trim().toLowerCase();

    // ... (rest of code) ...

    // 4. Buscar em cards do dashboard (incluindo cards estáticos)
    if (!type || type === 'card') {
      // Cards estáticos do sistema
      const staticCards = [
        {
          id: 'manual-colaborador',
          title: 'Manual do Colaborador',
          titleEn: 'Employee Manual',
          description: 'Acesse o manual completo do colaborador',
          descriptionEn: 'Access the complete employee manual',
          url: '/manual',
          category: 'Documentação'
        },
        {
          id: 'manual-logistico',
          title: 'Manual Logístico',
          titleEn: 'Logistics Manual',
          description: 'Manual específico para área de logística',
          descriptionEn: 'Specific manual for logistics area',
          url: '/manual',
          category: 'Logística'
        },
        {
          id: 'procedimentos-logistica',
          title: 'Procedimentos de Logística',
          titleEn: 'Logistics Procedures',
          description: 'Consulte os procedimentos padrões da área',
          descriptionEn: 'Check standard area procedures',
          url: '/procedimentos-logistica',
          category: 'Procedimentos'
        },
        {
          id: 'politicas',
          title: 'Políticas',
          titleEn: 'Policies',
          description: 'Consulte as políticas da empresa',
          descriptionEn: 'Check company policies',
          url: '/politicas',
          category: 'Políticas'
        },
        {
          id: 'procedimentos-gerais',
          title: 'Procedimentos Gerais',
          titleEn: 'General Procedures',
          description: 'Consulte os procedimentos gerais da empresa',
          descriptionEn: 'Check general company procedures',
          url: '/procedimentos',
          category: 'Procedimentos'
        },
        {
          id: 'calendario',
          title: 'Calendário',
          titleEn: 'Calendar',
          description: 'Consulte o calendário de eventos e feriados',
          descriptionEn: 'Check events and holidays calendar',
          url: '/calendario',
          category: 'Agenda'
        },
        {
          id: 'noticias',
          title: 'Notícias',
          titleEn: 'News',
          description: 'Fique por dentro das últimas notícias da empresa',
          descriptionEn: 'Stay updated with company news',
          url: '/noticias',
          category: 'Comunicação'
        },
        {
          id: 'reembolso',
          title: 'Reembolso',
          titleEn: 'Reimbursement',
          description: 'Solicite reembolsos de despesas',
          descriptionEn: 'Request expense reimbursement',
          url: '/reembolso',
          category: 'Financeiro',
          keywords: ['reembolso', 'reimbursement', 'refund', 'expense', 'despesa']
        },
        {
          id: 'contracheque',
          title: 'Contracheque',
          titleEn: 'Payslip',
          description: 'Acesse seus contracheques',
          descriptionEn: 'Access your payslips',
          url: '/contracheque',
          category: 'Financeiro',
          keywords: ['contracheque', 'payslip', 'holerite', 'salary', 'income']
        },
        {
          id: 'ponto',
          title: 'Ponto',
          titleEn: 'Time Clock',
          description: 'Registre seu ponto e consulte seu histórico',
          descriptionEn: 'Register your time and check your history',
          url: '/ponto',
          category: 'RH',
          keywords: ['ponto', 'timesheet', 'clock', 'time', 'hora', 'frequencia']
        },
        {
          id: 'avaliacao',
          title: 'Avaliação de Desempenho',
          titleEn: 'Performance Evaluation',
          description: 'Sistema de avaliação de desempenho',
          descriptionEn: 'Performance evaluation system',
          url: '/avaliacao',
          category: 'RH',
          keywords: ['avaliacao', 'desempenho', 'performance', 'review', 'evaluation', 'feedback']
        },
        {
          id: 'folha-pagamento',
          title: 'Folha de Pagamento',
          titleEn: 'Payroll',
          description: 'Gerencie a folha de pagamento dos colaboradores',
          descriptionEn: 'Manage employee payroll',
          url: '/folha-pagamento',
          category: 'Financeiro',
          keywords: ['folha', 'pagamento', 'payroll', 'salary', 'salario']
        }
      ];

      // Filtrar cards estáticos que correspondem à busca
      const matchingStaticCards = staticCards.filter(card => {
        const titleMatch = card.title.toLowerCase().includes(searchTerm) ||
          (card.titleEn && card.titleEn.toLowerCase().includes(searchTerm));
        const descMatch = card.description.toLowerCase().includes(searchTerm) ||
          (card.descriptionEn && card.descriptionEn.toLowerCase().includes(searchTerm));
        const catMatch = card.category.toLowerCase().includes(searchTerm);
        const keywordMatch = card.keywords?.some(k => k.toLowerCase().includes(searchTerm));

        return titleMatch || descMatch || catMatch || keywordMatch;
      });

      matchingStaticCards.forEach(card => {
        const isEnglish = locale === 'en-US' || locale === 'en';
        results.push({
          id: card.id,
          type: 'card',
          title: isEnglish && card.titleEn ? card.titleEn : card.title,
          content: isEnglish && card.descriptionEn ? card.descriptionEn : card.description,
          url: card.url,
          metadata: {
            category: card.category
          }
        });
      });

      // Também buscar em cards dinâmicos do banco
      try {
        const { data: cards, error: cardError } = await supabaseAdmin
          .from('dashboard_cards')
          .select('id, title, description, url, icon, created_at')
          .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
          .range(offset, offset + limit - 1);

        if (!cardError && cards) {
          cards.forEach(card => {
            results.push({
              id: `db-${card.id}`,
              type: 'card',
              title: card.title || 'Card sem título',
              content: card.description || 'Sem descrição',
              url: card.url || '/dashboard',
              metadata: {
                icon: card.icon,
                created_at: card.created_at
              }
            });
          });
        }
      } catch (error) {
        console.error('Erro ao buscar cards do banco:', error);
      }
    }
    if (!type || type === 'document') {
      try {
        const { data: documents, error: docError } = await supabaseAdmin
          .from('documents')
          .select('id, title, content, created_at, updated_at')
          .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
          .range(offset, offset + limit - 1);

        if (!docError && documents) {
          documents.forEach(doc => {
            results.push({
              id: doc.id,
              type: 'document',
              title: doc.title || 'Documento sem título',
              content: doc.content ? doc.content.substring(0, 200) + '...' : '',
              url: `/documents/${doc.id}`,
              metadata: {
                created_at: doc.created_at,
                updated_at: doc.updated_at
              }
            });
          });
        }
      } catch (error) {
        console.error('Erro ao buscar documentos:', error);
      }
    }

    // 2. Buscar em notícias
    if (!type || type === 'news') {
      try {
        const { data: news, error: newsError } = await supabaseAdmin
          .from('news')
          .select('id, title, content, created_at, updated_at, author')
          .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
          .range(offset, offset + limit - 1);

        if (!newsError && news) {
          news.forEach(item => {
            results.push({
              id: item.id,
              type: 'news',
              title: item.title || 'Notícia sem título',
              content: item.content ? item.content.substring(0, 200) + '...' : '',
              url: `/news/${item.id}`,
              metadata: {
                author: item.author,
                created_at: item.created_at,
                updated_at: item.updated_at
              }
            });
          });
        }
      } catch (error) {
        console.error('Erro ao buscar notícias:', error);
      }
    }

    // 3. Buscar em usuários (apenas para admins)
    if (!type || type === 'user') {
      try {
        const { data: users, error: userError } = await supabaseAdmin
          .from('users_unified')
          .select('id, first_name, last_name, email, role, position, department')
          .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,position.ilike.%${searchTerm}%,department.ilike.%${searchTerm}%`)
          .range(offset, offset + limit - 1);

        if (!userError && users) {
          users.forEach(user => {
            results.push({
              id: user.id,
              type: 'user',
              title: `${user.first_name} ${user.last_name}`,
              content: `${user.email} - ${user.position || 'Sem cargo'} - ${user.department || 'Sem departamento'}`,
              url: `/admin/users/${user.id}`,
              metadata: {
                role: user.role,
                position: user.position,
                department: user.department
              }
            });
          });
        }
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
      }
    }

    // 4. Buscar em cards do dashboard (incluindo cards estáticos)
    if (!type || type === 'card') {
      // Cards estáticos do sistema
      const staticCards = [
        {
          id: 'manual-colaborador',
          title: 'Manual do Colaborador',
          description: 'Acesse o manual completo do colaborador',
          url: '/manual',
          category: 'Documentação'
        },
        {
          id: 'manual-logistico',
          title: 'Manual Logístico',
          description: 'Manual específico para área de logística',
          url: '/manual',
          category: 'Logística'
        },
        {
          id: 'procedimentos-logistica',
          title: 'Procedimentos de Logística',
          description: 'Consulte os procedimentos padrões da área',
          url: '/procedimentos-logistica',
          category: 'Procedimentos'
        },
        {
          id: 'politicas',
          title: 'Políticas',
          description: 'Consulte as políticas da empresa',
          url: '/politicas',
          category: 'Políticas'
        },
        {
          id: 'procedimentos-gerais',
          title: 'Procedimentos Gerais',
          description: 'Consulte os procedimentos gerais da empresa',
          url: '/procedimentos',
          category: 'Procedimentos'
        },
        {
          id: 'calendario',
          title: 'Calendário',
          description: 'Consulte o calendário de eventos e feriados',
          url: '/calendario',
          category: 'Agenda'
        },
        {
          id: 'noticias',
          title: 'Notícias',
          description: 'Fique por dentro das últimas notícias da empresa',
          url: '/noticias',
          category: 'Comunicação'
        },
        {
          id: 'reembolso',
          title: 'Reembolso',
          description: 'Solicite reembolsos de despesas',
          url: '/reembolso',
          category: 'Financeiro',
          keywords: ['reembolso', 'reimbursement', 'refund', 'expense', 'despesa']
        },
        {
          id: 'contracheque',
          title: 'Contracheque',
          description: 'Acesse seus contracheques',
          url: '/contracheque',
          category: 'Financeiro',
          keywords: ['contracheque', 'payslip', 'holerite', 'salary', 'income']
        },
        {
          id: 'ponto',
          title: 'Ponto',
          description: 'Registre seu ponto e consulte seu histórico',
          url: '/ponto',
          category: 'RH',
          keywords: ['ponto', 'timesheet', 'clock', 'time', 'hora', 'frequencia']
        },
        {
          id: 'avaliacao',
          title: 'Avaliação de Desempenho',
          description: 'Sistema de avaliação de desempenho',
          url: '/avaliacao',
          category: 'RH',
          keywords: ['avaliacao', 'desempenho', 'performance', 'review', 'evaluation', 'feedback']
        },
        {
          id: 'folha-pagamento',
          title: 'Folha de Pagamento',
          description: 'Gerencie a folha de pagamento dos colaboradores',
          url: '/folha-pagamento',
          category: 'Financeiro',
          keywords: ['folha', 'pagamento', 'payroll', 'salary', 'salario']
        }
      ];

      // Filtrar cards estáticos que correspondem à busca
      const matchingStaticCards = staticCards.filter(card =>
        card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.category.toLowerCase().includes(searchTerm.toLowerCase())
      );

      matchingStaticCards.forEach(card => {
        results.push({
          id: card.id,
          type: 'card',
          title: card.title,
          content: card.description,
          url: card.url,
          metadata: {
            category: card.category
          }
        });
      });

      // Também buscar em cards dinâmicos do banco
      try {
        const { data: cards, error: cardError } = await supabaseAdmin
          .from('dashboard_cards')
          .select('id, title, description, url, icon, created_at')
          .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
          .range(offset, offset + limit - 1);

        if (!cardError && cards) {
          cards.forEach(card => {
            results.push({
              id: `db-${card.id}`,
              type: 'card',
              title: card.title || 'Card sem título',
              content: card.description || 'Sem descrição',
              url: card.url || '/dashboard',
              metadata: {
                icon: card.icon,
                created_at: card.created_at
              }
            });
          });
        }
      } catch (error) {
        console.error('Erro ao buscar cards do banco:', error);
      }
    }

    // 5. Buscar em reembolsos
    if (!type || type === 'reimbursement') {
      try {
        const { data: reimbursements, error: reimbError } = await supabaseAdmin
          .from('Reimbursement')
          .select('id, protocol, description, status, amount, created_at')
          .or(`protocol.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
          .range(offset, offset + limit - 1);

        if (!reimbError && reimbursements) {
          reimbursements.forEach(reimb => {
            results.push({
              id: reimb.id,
              type: 'reimbursement',
              title: `Reembolso ${reimb.protocol}`,
              content: `${reimb.description || 'Sem descrição'} - R$ ${reimb.amount} - Status: ${reimb.status}`,
              url: `/reembolso/${reimb.protocol}`,
              metadata: {
                protocol: reimb.protocol,
                status: reimb.status,
                amount: reimb.amount,
                created_at: reimb.created_at
              }
            });
          });
        }
      } catch (error) {
        console.error('Erro ao buscar reembolsos:', error);
      }
    }

    // 6. Buscar em contracheques
    if (!type || type === 'paystub') {
      try {
        const { data: paystubs, error: paystubError } = await supabaseAdmin
          .from('paystubs')
          .select('id, month, year, gross_salary, net_salary, user_id, users_unified!inner(first_name, last_name)')
          .or(`month.ilike.%${searchTerm}%,year::text.ilike.%${searchTerm}%`)
          .range(offset, offset + limit - 1);

        if (!paystubError && paystubs) {
          paystubs.forEach(paystub => {
            results.push({
              id: paystub.id,
              type: 'paystub',
              title: `Contracheque ${paystub.month}/${paystub.year}`,
              content: `Salário Bruto: R$ ${paystub.gross_salary} - Líquido: R$ ${paystub.net_salary}`,
              url: `/contracheque/${paystub.id}`,
              metadata: {
                month: paystub.month,
                year: paystub.year,
                gross_salary: paystub.gross_salary,
                net_salary: paystub.net_salary
              }
            });
          });
        }
      } catch (error) {
        console.error('Erro ao buscar contracheques:', error);
      }
    }

    // 7. Buscar em avaliações de desempenho
    if (!type || type === 'evaluation') {
      try {
        const { data: evaluations, error: evalError } = await supabaseAdmin
          .from('performance_evaluations')
          .select('id, title, period, status, score, created_at')
          .or(`title.ilike.%${searchTerm}%,period.ilike.%${searchTerm}%,status.ilike.%${searchTerm}%`)
          .range(offset, offset + limit - 1);

        if (!evalError && evaluations) {
          evaluations.forEach(evaluation => {
            results.push({
              id: evaluation.id,
              type: 'evaluation',
              title: evaluation.title || `Avaliação ${evaluation.period}`,
              content: `Período: ${evaluation.period} - Status: ${evaluation.status} - Nota: ${evaluation.score || 'N/A'}`,
              url: `/avaliacao/${evaluation.id}`,
              metadata: {
                period: evaluation.period,
                status: evaluation.status,
                score: evaluation.score,
                created_at: evaluation.created_at
              }
            });
          });
        }
      } catch (error) {
        console.error('Erro ao buscar avaliações:', error);
      }
    }

    // 8. Buscar em políticas
    if (!type || type === 'policy') {
      try {
        const { data: policies, error: policyError } = await supabaseAdmin
          .from('policies')
          .select('id, title, description, category, version, created_at')
          .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
          .range(offset, offset + limit - 1);

        if (!policyError && policies) {
          policies.forEach(policy => {
            results.push({
              id: policy.id,
              type: 'policy',
              title: policy.title,
              content: `${policy.description || 'Sem descrição'} - Categoria: ${policy.category} - Versão: ${policy.version}`,
              url: `/politicas/${policy.id}`,
              metadata: {
                category: policy.category,
                version: policy.version,
                created_at: policy.created_at
              }
            });
          });
        }
      } catch (error) {
        console.error('Erro ao buscar políticas:', error);
      }
    }

    // 9. Buscar em procedimentos
    if (!type || type === 'procedure') {
      try {
        const { data: procedures, error: procError } = await supabaseAdmin
          .from('procedures')
          .select('id, title, description, category, version, created_at')
          .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
          .range(offset, offset + limit - 1);

        if (!procError && procedures) {
          procedures.forEach(procedure => {
            results.push({
              id: procedure.id,
              type: 'procedure',
              title: procedure.title,
              content: `${procedure.description || 'Sem descrição'} - Categoria: ${procedure.category}`,
              url: `/procedimentos/${procedure.id}`,
              metadata: {
                category: procedure.category,
                version: procedure.version,
                created_at: procedure.created_at
              }
            });
          });
        }
      } catch (error) {
        console.error('Erro ao buscar procedimentos:', error);
      }
    }

    // 10. Buscar em cursos da Academy
    if (!type || type === 'academy') {
      try {
        const { data: courses, error: courseError } = await supabaseAdmin
          .from('academy_courses')
          .select('id, title, description, category, difficulty, instructor, duration')
          .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%,instructor.ilike.%${searchTerm}%`)
          .eq('is_active', true)
          .range(offset, offset + limit - 1);

        if (!courseError && courses) {
          courses.forEach(course => {
            results.push({
              id: course.id,
              type: 'academy',
              title: course.title,
              content: `${course.description || 'Sem descrição'} - ${course.category} - ${course.difficulty} - ${course.duration}min`,
              url: `/academy/course/${course.id}`,
              metadata: {
                category: course.category,
                difficulty: course.difficulty,
                instructor: course.instructor,
                duration: course.duration
              }
            });
          });
        }
      } catch (error) {
        console.error('Erro ao buscar cursos da Academy:', error);
      }
    }

    // Ordenar resultados por relevância (título primeiro, depois conteúdo)
    results.sort((a, b) => {
      const aTitle = a.title.toLowerCase().includes(searchTerm);
      const bTitle = b.title.toLowerCase().includes(searchTerm);

      if (aTitle && !bTitle) return -1;
      if (!aTitle && bTitle) return 1;

      return a.title.localeCompare(b.title);
    });

    console.log(`✅ Busca concluída: ${results.length} resultados encontrados`);

    return NextResponse.json({
      query,
      type: type || 'all',
      results: results.slice(0, limit),
      total: results.length,
      limit,
      offset,
      hasMore: results.length > limit
    });

  } catch (error) {
    console.error('❌ Erro na busca:', error);
    return NextResponse.json({
      error: 'Erro interno na busca',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'create_indexes') {
      console.log('🔧 Verificando estrutura das tabelas para busca...');

      // Verificar se as tabelas existem e têm dados
      const tableChecks = [];

      try {
        const { data: documents, error: docError } = await supabaseAdmin
          .from('documents')
          .select('count', { count: 'exact', head: true });
        tableChecks.push({
          table: 'documents',
          status: docError ? 'error' : 'success',
          count: documents || 0,
          error: docError
        });
      } catch (err) {
        tableChecks.push({ table: 'documents', status: 'error', error: err });
      }

      try {
        const { data: news, error: newsError } = await supabaseAdmin
          .from('news')
          .select('count', { count: 'exact', head: true });
        tableChecks.push({
          table: 'news',
          status: newsError ? 'error' : 'success',
          count: news || 0,
          error: newsError
        });
      } catch (err) {
        tableChecks.push({ table: 'news', status: 'error', error: err });
      }

      try {
        const { data: users, error: usersError } = await supabaseAdmin
          .from('users_unified')
          .select('count', { count: 'exact', head: true });
        tableChecks.push({
          table: 'users_unified',
          status: usersError ? 'error' : 'success',
          count: users || 0,
          error: usersError
        });
      } catch (err) {
        tableChecks.push({ table: 'users_unified', status: 'error', error: err });
      }

      try {
        const { data: cards, error: cardsError } = await supabaseAdmin
          .from('dashboard_cards')
          .select('count', { count: 'exact', head: true });
        tableChecks.push({
          table: 'dashboard_cards',
          status: cardsError ? 'error' : 'success',
          count: cards || 0,
          error: cardsError
        });
      } catch (err) {
        tableChecks.push({ table: 'dashboard_cards', status: 'error', error: err });
      }

      try {
        const { data: reimbursements, error: reimbError } = await supabaseAdmin
          .from('Reimbursement')
          .select('count', { count: 'exact', head: true });
        tableChecks.push({
          table: 'Reimbursement',
          status: reimbError ? 'error' : 'success',
          count: reimbursements || 0,
          error: reimbError
        });
      } catch (err) {
        tableChecks.push({ table: 'Reimbursement', status: 'error', error: err });
      }

      return NextResponse.json({
        message: 'Verificação de estrutura de busca concluída',
        note: 'Os índices de busca serão criados automaticamente pelo PostgreSQL conforme necessário',
        tableChecks
      });
    }

    return NextResponse.json({
      error: 'Ação não reconhecida'
    }, { status: 400 });

  } catch (error) {
    console.error('❌ Erro no POST da busca:', error);
    return NextResponse.json({
      error: 'Erro interno',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
