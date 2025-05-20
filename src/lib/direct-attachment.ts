/**
 * Utilitários para processamento direto de anexos
 * Este módulo fornece funções para processar anexos diretamente, sem depender do Supabase Storage
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';

// Tipos
interface FileData {
  nome: string;
  tipo: string;
  tamanho: number;
  buffer?: string; // Base64
  dados?: string; // Base64 ou outro formato
  url?: string;
  isLocalFile?: boolean;
  file?: any;
}

interface ProcessedAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

/**
 * Processa um arquivo para anexo direto
 * @param fileData Dados do arquivo
 * @returns Anexo processado ou null se não for possível processar
 */
export async function processDirectAttachment(fileData: FileData): Promise<ProcessedAttachment | null> {
  console.log(`Processando anexo direto: ${fileData.nome}`);
  
  try {
    // CASO 1: Arquivo com buffer base64
    if (fileData.buffer) {
      console.log(`Arquivo ${fileData.nome} tem buffer base64`);
      try {
        const buffer = Buffer.from(fileData.buffer, 'base64');
        if (buffer.length > 0) {
          return {
            filename: fileData.nome,
            content: buffer,
            contentType: fileData.tipo || 'application/octet-stream'
          };
        } else {
          console.error(`Buffer vazio para ${fileData.nome}`);
        }
      } catch (bufferError) {
        console.error(`Erro ao processar buffer base64 para ${fileData.nome}:`, bufferError);
      }
    }
    
    // CASO 2: Arquivo com dados base64
    if (fileData.dados) {
      console.log(`Arquivo ${fileData.nome} tem dados base64`);
      try {
        const buffer = Buffer.from(fileData.dados, 'base64');
        if (buffer.length > 0) {
          return {
            filename: fileData.nome,
            content: buffer,
            contentType: fileData.tipo || 'application/octet-stream'
          };
        } else {
          console.error(`Dados vazios para ${fileData.nome}`);
        }
      } catch (dadosError) {
        console.error(`Erro ao processar dados base64 para ${fileData.nome}:`, dadosError);
      }
    }
    
    // CASO 3: Arquivo no Supabase Storage
    if (fileData.url && !fileData.isLocalFile && !fileData.url.startsWith('blob:') && !fileData.url.startsWith('data:')) {
      console.log(`Arquivo ${fileData.nome} está no Supabase Storage: ${fileData.url}`);
      
      try {
        // Obter configuração do Supabase
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
        
        if (!supabaseUrl || !supabaseServiceKey) {
          console.error('Configuração do Supabase não encontrada');
          return null;
        }
        
        // Criar cliente Supabase
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        });
        
        // Extrair o caminho do arquivo
        let filePath = fileData.url;
        if (filePath.includes('/')) {
          filePath = filePath.split('/').pop() || filePath;
        }
        
        console.log(`Baixando arquivo do Supabase: ${filePath}`);
        
        // Tentar baixar o arquivo
        const { data, error } = await supabase
          .storage
          .from('comprovantes')
          .download(filePath);
        
        if (error) {
          console.error(`Erro ao baixar arquivo do Supabase: ${error.message}`);
          
          // Tentar obter URL público
          const { data: publicUrlData } = supabase
            .storage
            .from('comprovantes')
            .getPublicUrl(filePath);
          
          if (publicUrlData && publicUrlData.publicUrl) {
            console.log(`Tentando baixar via URL público: ${publicUrlData.publicUrl}`);
            
            const response = await fetch(publicUrlData.publicUrl);
            if (response.ok) {
              const blob = await response.blob();
              const buffer = Buffer.from(await blob.arrayBuffer());
              
              if (buffer.length > 0) {
                return {
                  filename: fileData.nome,
                  content: buffer,
                  contentType: fileData.tipo || 'application/octet-stream'
                };
              } else {
                console.error(`Buffer vazio ao baixar via URL público para ${fileData.nome}`);
              }
            } else {
              console.error(`Falha ao baixar via URL público: ${response.status} ${response.statusText}`);
            }
          }
          
          return null;
        }
        
        if (data) {
          const buffer = Buffer.from(await data.arrayBuffer());
          
          if (buffer.length > 0) {
            return {
              filename: fileData.nome,
              content: buffer,
              contentType: fileData.tipo || 'application/octet-stream'
            };
          } else {
            console.error(`Buffer vazio para arquivo baixado do Supabase: ${fileData.nome}`);
          }
        }
      } catch (supabaseError) {
        console.error(`Erro ao processar arquivo do Supabase: ${fileData.nome}`, supabaseError);
      }
    }
    
    // CASO 4: URL data:
    if (fileData.url && fileData.url.startsWith('data:')) {
      console.log(`Arquivo ${fileData.nome} tem URL data:`);
      
      try {
        // Extrair dados da URL data:
        const matches = fileData.url.match(/^data:([^;]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const contentType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');
          
          if (buffer.length > 0) {
            return {
              filename: fileData.nome,
              content: buffer,
              contentType: contentType || fileData.tipo || 'application/octet-stream'
            };
          } else {
            console.error(`Buffer vazio ao processar data URL para ${fileData.nome}`);
          }
        } else {
          console.error(`Formato inválido de data URL para ${fileData.nome}`);
        }
      } catch (dataUrlError) {
        console.error(`Erro ao processar data URL para ${fileData.nome}:`, dataUrlError);
      }
    }
    
    // Se chegamos aqui, não conseguimos processar o arquivo
    console.error(`Não foi possível processar o arquivo ${fileData.nome} - nenhum método funcionou`);
    return null;
    
  } catch (error) {
    console.error(`Erro ao processar anexo direto: ${fileData.nome}`, error);
    return null;
  }
}

/**
 * Cria um anexo de teste
 * @returns Anexo de teste
 */
export function createTestAttachment(): ProcessedAttachment {
  const testId = uuidv4().substring(0, 8);
  const testContent = `Este é um anexo de teste (ID: ${testId}) criado em ${new Date().toISOString()}.
  
Este arquivo foi gerado automaticamente pelo sistema de reembolso para garantir que os anexos estejam funcionando corretamente.
  
Se você está vendo este arquivo, significa que o sistema conseguiu gerar e enviar anexos, mas pode ter havido problemas com os comprovantes originais.
  
Por favor, entre em contato com o suporte técnico e informe que você recebeu este anexo de teste em vez dos comprovantes originais.
  
ID do teste: ${testId}
Data e hora: ${new Date().toLocaleString('pt-BR')}
`;

  return {
    filename: `comprovante_teste_${testId}.txt`,
    content: Buffer.from(testContent),
    contentType: 'text/plain'
  };
}
