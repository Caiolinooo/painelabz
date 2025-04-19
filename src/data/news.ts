/**
 * Definição das notícias e comunicados
 * Estes dados podem ser editados pelo painel de administração
 */

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  date: string;
  file: string;
  enabled: boolean;
  featured: boolean;
  category: string;
  author: string;
  thumbnail?: string;
}

// Lista de notícias
const newsItems: NewsItem[] = [
  {
    id: 'news-example-1',
    title: 'Exemplo de Notícia 1',
    description: 'Breve descrição do conteúdo desta notícia ou cartilha.',
    date: '2024-04-01',
    file: '/documentos/noticias/exemplo-noticia-1.pdf',
    enabled: true,
    featured: true,
    category: 'Comunicados',
    author: 'Equipe ABZ'
  },
  {
    id: 'news-example-2',
    title: 'Exemplo de Notícia 2',
    description: 'Outro exemplo de um comunicado importante em formato PDF.',
    date: '2024-03-25',
    file: '/documentos/noticias/exemplo-noticia-2.pdf',
    enabled: true,
    featured: false,
    category: 'Notícias',
    author: 'Equipe ABZ'
  }
];

export default newsItems;
