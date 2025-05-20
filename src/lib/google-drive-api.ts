/**
 * Integração com Google Drive usando API Key
 * Este módulo fornece funções para armazenar anexos no Google Drive usando uma API Key
 */

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';

// Tipos
interface DriveApiConfig {
  apiKey: string;
  folderId: string; // ID da pasta raiz no Google Drive
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  size: string;
  createdTime: string;
}

/**
 * Obtém a configuração da API do Google Drive a partir das variáveis de ambiente
 * @returns Configuração da API do Google Drive ou null se não estiver configurada
 */
function getDriveApiConfig(): DriveApiConfig | null {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  
  if (!apiKey || !folderId) {
    console.error('Configuração da API do Google Drive não encontrada');
    return null;
  }
  
  return {
    apiKey,
    folderId
  };
}

/**
 * Cria uma pasta no Google Drive
 * @param folderName Nome da pasta
 * @param parentFolderId ID da pasta pai (opcional)
 * @returns ID da pasta criada ou null se não for possível criar
 */
export async function createDriveFolder(
  folderName: string,
  parentFolderId?: string
): Promise<string | null> {
  try {
    const config = getDriveApiConfig();
    if (!config) {
      return null;
    }
    
    const { apiKey } = config;
    const parent = parentFolderId || config.folderId;
    
    // Verificar se a pasta já existe
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(folderName)}' and mimeType='application/vnd.google-apps.folder' and '${parent}' in parents and trashed=false&key=${apiKey}`;
    
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json() as any;
    
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }
    
    // Criar nova pasta
    const createUrl = `https://www.googleapis.com/drive/v3/files?key=${apiKey}`;
    
    const metadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parent]
    };
    
    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metadata)
    });
    
    const createData = await createResponse.json() as any;
    
    if (createData.id) {
      return createData.id;
    } else {
      console.error('Erro ao criar pasta no Google Drive:', createData.error);
      return null;
    }
  } catch (error) {
    console.error('Erro ao criar pasta no Google Drive:', error);
    return null;
  }
}

/**
 * Faz upload de um arquivo para o Google Drive
 * @param filePath Caminho do arquivo local
 * @param fileName Nome do arquivo no Google Drive
 * @param mimeType Tipo MIME do arquivo
 * @param folderId ID da pasta no Google Drive (opcional)
 * @returns Informações do arquivo no Google Drive ou null se não for possível fazer upload
 */
export async function uploadFileToDrive(
  filePath: string,
  fileName: string,
  mimeType: string,
  folderId?: string
): Promise<DriveFile | null> {
  try {
    const config = getDriveApiConfig();
    if (!config) {
      return null;
    }
    
    const { apiKey } = config;
    const parent = folderId || config.folderId;
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(filePath)) {
      console.error(`Arquivo não encontrado: ${filePath}`);
      return null;
    }
    
    // Preparar o upload
    const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&key=${apiKey}`;
    
    const metadata = {
      name: fileName,
      parents: [parent]
    };
    
    const fileContent = fs.readFileSync(filePath);
    
    // Criar um FormData para o upload multipart
    const formData = new FormData();
    
    // Adicionar a parte de metadados
    formData.append('metadata', JSON.stringify(metadata), {
      contentType: 'application/json'
    });
    
    // Adicionar a parte do arquivo
    formData.append('file', fileContent, {
      filename: fileName,
      contentType: mimeType
    });
    
    // Fazer o upload
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      body: formData as any
    });
    
    const uploadData = await uploadResponse.json() as any;
    
    if (uploadData.id) {
      // Obter mais detalhes do arquivo
      const fileUrl = `https://www.googleapis.com/drive/v3/files/${uploadData.id}?fields=id,name,mimeType,webViewLink,size,createdTime&key=${apiKey}`;
      
      const fileResponse = await fetch(fileUrl);
      const fileData = await fileResponse.json() as any;
      
      return {
        id: fileData.id,
        name: fileData.name,
        mimeType: fileData.mimeType,
        webViewLink: fileData.webViewLink || '',
        size: fileData.size || '0',
        createdTime: fileData.createdTime || new Date().toISOString()
      };
    } else {
      console.error('Erro ao fazer upload para o Google Drive:', uploadData.error);
      return null;
    }
  } catch (error) {
    console.error('Erro ao fazer upload para o Google Drive:', error);
    return null;
  }
}

/**
 * Faz upload de um arquivo de reembolso para o Google Drive
 * @param filePath Caminho do arquivo local
 * @param fileName Nome do arquivo
 * @param mimeType Tipo MIME do arquivo
 * @param metadata Metadados do reembolso
 * @returns Informações do arquivo no Google Drive ou null se não for possível fazer upload
 */
export async function uploadReimbursementFileToDrive(
  filePath: string,
  fileName: string,
  mimeType: string,
  metadata: {
    protocolo: string;
    nome: string;
    data: string;
    tipo: string;
  }
): Promise<DriveFile | null> {
  try {
    // Criar pasta raiz de reembolsos se não existir
    const rootFolderName = 'Reembolsos ABZ';
    const rootFolderId = await createDriveFolder(rootFolderName);
    
    if (!rootFolderId) {
      console.error('Não foi possível criar a pasta raiz de reembolsos');
      return null;
    }
    
    // Criar pasta do protocolo se não existir
    const protocoloFolderName = `Reembolso ${metadata.protocolo} - ${metadata.nome}`;
    const protocoloFolderId = await createDriveFolder(protocoloFolderName, rootFolderId);
    
    if (!protocoloFolderId) {
      console.error(`Não foi possível criar a pasta para o protocolo ${metadata.protocolo}`);
      return null;
    }
    
    // Fazer upload do arquivo
    return await uploadFileToDrive(
      filePath,
      fileName,
      mimeType,
      protocoloFolderId
    );
  } catch (error) {
    console.error(`Erro ao fazer upload do arquivo de reembolso ${fileName}:`, error);
    return null;
  }
}
