/**
 * Integração com Google Drive para armazenamento de anexos
 * Este módulo fornece funções para armazenar anexos no Google Drive
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

// Tipos
interface DriveCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  refreshToken: string;
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
 * Obtém as credenciais do Google Drive a partir das variáveis de ambiente
 * @returns Credenciais do Google Drive ou null se não estiverem configuradas
 */
function getDriveCredentials(): DriveCredentials | null {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  
  if (!clientId || !clientSecret || !redirectUri || !refreshToken) {
    console.error('Credenciais do Google Drive não configuradas');
    return null;
  }
  
  return {
    clientId,
    clientSecret,
    redirectUri,
    refreshToken
  };
}

/**
 * Cria um cliente autenticado do Google Drive
 * @returns Cliente do Google Drive ou null se não for possível autenticar
 */
async function createDriveClient() {
  try {
    const credentials = getDriveCredentials();
    if (!credentials) {
      return null;
    }
    
    const { clientId, clientSecret, redirectUri, refreshToken } = credentials;
    
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
    
    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });
    
    return google.drive({
      version: 'v3',
      auth: oauth2Client
    });
  } catch (error) {
    console.error('Erro ao criar cliente do Google Drive:', error);
    return null;
  }
}

/**
 * Cria uma pasta no Google Drive se não existir
 * @param folderName Nome da pasta
 * @param parentFolderId ID da pasta pai (opcional)
 * @returns ID da pasta criada ou existente, ou null se não for possível criar
 */
async function createFolderIfNotExists(folderName: string, parentFolderId?: string): Promise<string | null> {
  try {
    const drive = await createDriveClient();
    if (!drive) {
      return null;
    }
    
    // Verificar se a pasta já existe
    const query = parentFolderId
      ? `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed=false`
      : `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    
    const response = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive'
    });
    
    // Se a pasta já existe, retornar o ID
    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id || null;
    }
    
    // Criar a pasta
    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentFolderId ? [parentFolderId] : undefined
    };
    
    const folder = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id'
    });
    
    return folder.data.id || null;
  } catch (error) {
    console.error(`Erro ao criar pasta ${folderName} no Google Drive:`, error);
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
    const drive = await createDriveClient();
    if (!drive) {
      return null;
    }
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(filePath)) {
      console.error(`Arquivo não encontrado: ${filePath}`);
      return null;
    }
    
    // Preparar metadados do arquivo
    const fileMetadata = {
      name: fileName,
      parents: folderId ? [folderId] : undefined
    };
    
    // Fazer upload do arquivo
    const media = {
      mimeType,
      body: fs.createReadStream(filePath)
    };
    
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id, name, mimeType, webViewLink, size, createdTime'
    });
    
    if (!response.data.id) {
      console.error('Erro ao fazer upload do arquivo: ID não retornado');
      return null;
    }
    
    return {
      id: response.data.id,
      name: response.data.name || fileName,
      mimeType: response.data.mimeType || mimeType,
      webViewLink: response.data.webViewLink || '',
      size: response.data.size || '0',
      createdTime: response.data.createdTime || new Date().toISOString()
    };
  } catch (error) {
    console.error(`Erro ao fazer upload do arquivo ${fileName} para o Google Drive:`, error);
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
    const rootFolderId = await createFolderIfNotExists('Reembolsos ABZ');
    if (!rootFolderId) {
      console.error('Não foi possível criar a pasta raiz de reembolsos');
      return null;
    }
    
    // Criar pasta do protocolo se não existir
    const protocoloFolderId = await createFolderIfNotExists(
      `Reembolso ${metadata.protocolo} - ${metadata.nome}`,
      rootFolderId
    );
    
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
