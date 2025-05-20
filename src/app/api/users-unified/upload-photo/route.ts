import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import { Readable } from 'stream';

// Configurar cliente do Google Drive
const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/drive']
});

const drive = google.drive({ version: 'v3', auth });

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader || '');

    if (!token) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    // Processar o formulário
    const formData = await request.formData();
    const photo = formData.get('photo') as File;
    const userId = formData.get('userId') as string;

    // Verificar se o usuário está tentando modificar seus próprios dados
    // ou se é um administrador
    if (payload.userId !== userId && payload.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    if (!photo) {
      return NextResponse.json(
        { error: 'Nenhuma foto enviada' },
        { status: 400 }
      );
    }

    // Verificar tipo de arquivo
    if (!photo.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Tipo de arquivo inválido. Por favor, envie uma imagem.' },
        { status: 400 }
      );
    }

    // Verificar tamanho do arquivo (máximo 5MB)
    if (photo.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. O tamanho máximo é 5MB.' },
        { status: 400 }
      );
    }

    // Inicializar cliente Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Buscar informações do usuário
    const { data: userData, error: userError } = await supabase
      .from('users_unified')
      .select('first_name, last_name, drive_photo_id')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Erro ao buscar usuário:', userError);
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Converter o arquivo para um buffer
    const arrayBuffer = await photo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Criar um stream a partir do buffer
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    // Nome do arquivo no Google Drive
    const fileName = `${userData.first_name}_${userData.last_name}_profile_${Date.now()}.${photo.name.split('.').pop()}`;

    // Se o usuário já tem uma foto, atualizar em vez de criar nova
    let fileId = userData.drive_photo_id;
    let fileUrl = '';

    if (fileId) {
      // Atualizar arquivo existente
      const response = await drive.files.update({
        fileId,
        media: {
          body: stream,
          mimeType: photo.type
        }
      });

      // Obter URL do arquivo
      const fileResponse = await drive.files.get({
        fileId,
        fields: 'webViewLink, webContentLink'
      });

      fileUrl = fileResponse.data.webContentLink || fileResponse.data.webViewLink || '';
    } else {
      // Criar novo arquivo
      const response = await drive.files.create({
        requestBody: {
          name: fileName,
          mimeType: photo.type,
          parents: [process.env.GOOGLE_DRIVE_FOLDER_ID || '']
        },
        media: {
          body: stream,
          mimeType: photo.type
        }
      });

      fileId = response.data.id || '';

      // Tornar o arquivo público
      await drive.permissions.create({
        fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });

      // Obter URL do arquivo
      const fileResponse = await drive.files.get({
        fileId,
        fields: 'webViewLink, webContentLink'
      });

      fileUrl = fileResponse.data.webContentLink || fileResponse.data.webViewLink || '';
    }

    // Atualizar referência no banco de dados
    const { error: updateError } = await supabase
      .from('users_unified')
      .update({
        drive_photo_id: fileId,
        drive_photo_url: fileUrl,
        avatar: fileUrl, // Manter compatibilidade com o campo avatar existente
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Erro ao atualizar referência da foto:', updateError);
      return NextResponse.json(
        { error: 'Erro ao atualizar referência da foto' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Foto de perfil atualizada com sucesso',
      photoUrl: fileUrl
    });
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
