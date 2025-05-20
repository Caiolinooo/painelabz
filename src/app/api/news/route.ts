import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';

// GET - Obter todas as notícias
export async function GET(request: NextRequest) {
  try {
    console.log('API de notícias - Iniciando busca');
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const featured = searchParams.get('featured');

    console.log('Parâmetros de busca:', { category, featured });

    // Construir a consulta Supabase
    let query = supabaseAdmin
      .from('News')
      .select('*')
      .order('date', { ascending: false });

    // Aplicar filtros
    if (category) {
      query = query.eq('category', category);
    }

    if (featured === 'true') {
      query = query.eq('featured', true);
    }

    console.log('Executando consulta Supabase...');

    // Executar a consulta
    const { data: news, error } = await query;

    // Verificar se houve erro
    if (error) {
      console.error('Erro ao buscar notícias:', error);

      // Tentar com nome de tabela em minúsculas
      console.log('Tentando com nome de tabela em minúsculas...');

      let fallbackQuery = supabaseAdmin
        .from('news')
        .select('*')
        .order('date', { ascending: false });

      // Aplicar os mesmos filtros
      if (category) {
        fallbackQuery = fallbackQuery.eq('category', category);
      }

      if (featured === 'true') {
        fallbackQuery = fallbackQuery.eq('featured', true);
      }

      const { data: fallbackNews, error: fallbackError } = await fallbackQuery;

      if (fallbackError) {
        console.error('Erro ao buscar notícias (fallback):', fallbackError);

        // Se ambas as tentativas falharem, retornar dados de exemplo
        console.log('Retornando dados de exemplo...');

        // Importar dados de exemplo
        const { mockNews } = await import('./mock/data');

        // Filtrar dados de exemplo
        let filteredNews = [...mockNews];

        if (category) {
          filteredNews = filteredNews.filter(news => news.category === category);
        }

        if (featured === 'true') {
          filteredNews = filteredNews.filter(news => news.featured);
        }

        console.log(`Retornando ${filteredNews.length} notícias de exemplo`);
        return NextResponse.json(filteredNews);
      }

      console.log(`Encontradas ${fallbackNews?.length || 0} notícias (fallback)`);
      return NextResponse.json(fallbackNews || []);
    }

    console.log(`Encontradas ${news?.length || 0} notícias`);

    // Mesmo que não encontre notícias, retornar um array vazio
    return NextResponse.json(news || []);
  } catch (error) {
    console.error('Erro ao obter notícias:', error);

    // Retornar dados de exemplo em caso de erro
    try {
      console.log('Retornando dados de exemplo devido a erro...');

      // Importar dados de exemplo
      const { mockNews } = await import('./mock/data');

      console.log(`Retornando ${mockNews.length} notícias de exemplo`);
      return NextResponse.json(mockNews);
    } catch (mockError) {
      console.error('Erro ao carregar dados de exemplo:', mockError);
      return NextResponse.json(
        { error: 'Erro interno do servidor', details: String(error) },
        { status: 500 }
      );
    }
  }
}

// POST - Criar uma nova notícia
export async function POST(request: NextRequest) {
  try {
    console.log('API de notícias - Iniciando criação de notícia');
    const body = await request.json();
    console.log('Dados recebidos:', body);

    const { title, description, date, file, enabled, featured, category, author, thumbnail } = body;

    // Validar os dados de entrada
    if (!title || !description || !date || !category || !author) {
      console.log('Validação falhou - campos obrigatórios ausentes');
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    // Preparar dados para inserção
    const newsData = {
      title,
      description,
      content: description, // Usar a descrição como conteúdo por padrão
      date: new Date(date).toISOString(),
      file: file || '', // Tornar o arquivo opcional
      enabled: enabled !== false,
      featured: featured || false,
      category,
      author,
      thumbnail: thumbnail || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Tentar inserir na tabela News
    console.log('Inserindo notícia na tabela News...');
    const { data: newsData1, error: newsError1 } = await supabaseAdmin
      .from('News')
      .insert(newsData)
      .select()
      .single();

    // Se falhar, tentar com nome de tabela em minúsculas
    if (newsError1) {
      console.error('Erro ao inserir na tabela News:', newsError1);
      console.log('Tentando inserir na tabela news...');

      const { data: newsData2, error: newsError2 } = await supabaseAdmin
        .from('news')
        .insert(newsData)
        .select()
        .single();

      if (newsError2) {
        console.error('Erro ao inserir na tabela news:', newsError2);
        return NextResponse.json(
          { error: 'Erro ao criar notícia', details: newsError2.message },
          { status: 500 }
        );
      }

      console.log('Notícia criada com sucesso (tabela news):', newsData2?.id);
      return NextResponse.json(newsData2, { status: 201 });
    }

    console.log('Notícia criada com sucesso (tabela News):', newsData1?.id);
    return NextResponse.json(newsData1, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar notícia:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: String(error) },
      { status: 500 }
    );
  }
}
