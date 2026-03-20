import { supabase } from '@/lib/supabase';
import { Tables } from '@/types/supabase';
import { sendGlobalNotification } from '@/lib/global-notifications';
import { newsNotificationTemplate } from '@/lib/emailTemplates';
import { buildAppUrl } from '@/lib/app-url';

// Tipo para criação de notícia
export interface CreateNewsData {
  title: string;
  content: string;
  summary?: string;
  image_url?: string;
  published?: boolean;
  published_at?: string;
  created_by: string;
}

// Tipo para atualização de notícia
export interface UpdateNewsData {
  title?: string;
  content?: string;
  summary?: string;
  image_url?: string;
  published?: boolean;
  published_at?: string;
  updated_by: string;
}

// Função para buscar todas as notícias
export async function getAllNews() {
  try {
    const { data, error } = await supabase
      .from('news')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    return data as Tables<'news'>[];
  } catch (error) {
    console.error('Erro ao buscar notícias:', error);
    throw error;
  }
}

// Função para buscar notícias publicadas
export async function getPublishedNews() {
  try {
    const { data, error } = await supabase
      .from('news')
      .select('*')
      .eq('published', true)
      .order('published_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    return data as Tables<'news'>[];
  } catch (error) {
    console.error('Erro ao buscar notícias publicadas:', error);
    throw error;
  }
}

// Função para buscar uma notícia pelo ID
export async function getNewsById(id: string) {
  try {
    const { data, error } = await supabase
      .from('news')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      throw error;
    }
    
    return data as Tables<'news'>;
  } catch (error) {
    console.error('Erro ao buscar notícia:', error);
    throw error;
  }
}

// Função para criar uma notícia
export async function createNews(newsData: CreateNewsData) {
  try {
    const { data, error } = await supabase
      .from('news')
      .insert(newsData)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    if (data && newsData.published) {
      // Notificar todos os usuários sobre a nova notícia
      try {
        const { data: users } = await supabase.from('users_unified').select('id');
        if (users && users.length > 0) {
          const newsUrl = buildAppUrl(`/noticias/${data.id}`);
          const emailHtml = newsNotificationTemplate(data.title, data.summary || '', newsUrl);
          
          for (const user of users) {
             sendGlobalNotification({
              userId: user.id,
              submodule: 'news',
              type: 'new_post',
              title: `📰 Nova Notícia: ${data.title}`,
              message: data.summary || 'Uma nova notícia foi publicada no portal.',
              actionUrl: `/noticias/${data.id}`,
              emailHtml: emailHtml,
              channels: ['in-app', 'email']
            }).catch(e => console.error(`Erro ao notificar usuário ${user.id} sobre news:`, e));
          }
        }
      } catch (notifError) {
        console.error('Erro ao disparar notificações de news:', notifError);
      }
    }

    return data as Tables<'news'>;
  } catch (error) {
    console.error('Erro ao criar notícia:', error);
    throw error;
  }
}

// Função para atualizar uma notícia
export async function updateNews(id: string, newsData: UpdateNewsData) {
  try {
    const { data, error } = await supabase
      .from('news')
      .update(newsData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data as Tables<'news'>;
  } catch (error) {
    console.error('Erro ao atualizar notícia:', error);
    throw error;
  }
}

// Função para excluir uma notícia
export async function deleteNews(id: string) {
  try {
    const { error } = await supabase
      .from('news')
      .delete()
      .eq('id', id);
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao excluir notícia:', error);
    throw error;
  }
}

// Função para fazer upload de uma imagem
export async function uploadImage(file: File, path: string) {
  try {
    const { data, error } = await supabase.storage
      .from('news')
      .upload(path, file);
    
    if (error) {
      throw error;
    }
    
    // Obter a URL pública da imagem
    const { data: urlData } = supabase.storage
      .from('news')
      .getPublicUrl(data.path);
    
    return urlData.publicUrl;
  } catch (error) {
    console.error('Erro ao fazer upload de imagem:', error);
    throw error;
  }
}

// Função para excluir uma imagem
export async function deleteImage(path: string) {
  try {
    const { error } = await supabase.storage
      .from('news')
      .remove([path]);
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao excluir imagem:', error);
    throw error;
  }
}
