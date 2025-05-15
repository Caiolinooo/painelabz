import { supabase } from '@/lib/supabase';
import { Tables } from '@/types/supabase';

// Tipo para criação de documento
export interface CreateDocumentData {
  title: string;
  description?: string;
  content?: string;
  file_url?: string;
  category: string;
  subcategory?: string;
  created_by: string;
}

// Tipo para atualização de documento
export interface UpdateDocumentData {
  title?: string;
  description?: string;
  content?: string;
  file_url?: string;
  category?: string;
  subcategory?: string;
  updated_by: string;
}

// Função para buscar todos os documentos
export async function getAllDocuments() {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    return data as Tables<'documents'>[];
  } catch (error) {
    console.error('Erro ao buscar documentos:', error);
    throw error;
  }
}

// Função para buscar documentos por categoria
export async function getDocumentsByCategory(category: string) {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    return data as Tables<'documents'>[];
  } catch (error) {
    console.error('Erro ao buscar documentos por categoria:', error);
    throw error;
  }
}

// Função para buscar um documento pelo ID
export async function getDocumentById(id: string) {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      throw error;
    }
    
    return data as Tables<'documents'>;
  } catch (error) {
    console.error('Erro ao buscar documento:', error);
    throw error;
  }
}

// Função para criar um documento
export async function createDocument(documentData: CreateDocumentData) {
  try {
    const { data, error } = await supabase
      .from('documents')
      .insert(documentData)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data as Tables<'documents'>;
  } catch (error) {
    console.error('Erro ao criar documento:', error);
    throw error;
  }
}

// Função para atualizar um documento
export async function updateDocument(id: string, documentData: UpdateDocumentData) {
  try {
    const { data, error } = await supabase
      .from('documents')
      .update(documentData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data as Tables<'documents'>;
  } catch (error) {
    console.error('Erro ao atualizar documento:', error);
    throw error;
  }
}

// Função para excluir um documento
export async function deleteDocument(id: string) {
  try {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao excluir documento:', error);
    throw error;
  }
}

// Função para fazer upload de um arquivo
export async function uploadFile(file: File, path: string) {
  try {
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(path, file);
    
    if (error) {
      throw error;
    }
    
    // Obter a URL pública do arquivo
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(data.path);
    
    return urlData.publicUrl;
  } catch (error) {
    console.error('Erro ao fazer upload de arquivo:', error);
    throw error;
  }
}

// Função para excluir um arquivo
export async function deleteFile(path: string) {
  try {
    const { error } = await supabase.storage
      .from('documents')
      .remove([path]);
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao excluir arquivo:', error);
    throw error;
  }
}
