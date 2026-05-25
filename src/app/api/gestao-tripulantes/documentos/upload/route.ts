import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || undefined;
    const token = extractTokenFromHeader(authHeader);
    if (!token) {
      return NextResponse.json({ error: 'Token de autorização necessário' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const colaborador_id = formData.get('colaborador_id') as string;
    const tipo_documento = formData.get('tipo_documento') as string;
    const titulo = formData.get('titulo') as string;
    const descricao = formData.get('descricao') as string | null;
    const numero_documento = formData.get('numero_documento') as string | null;
    const orgao_emissor = formData.get('orgao_emissor') as string | null;
    const data_emissao = formData.get('data_emissao') as string | null;
    const data_validade = formData.get('data_validade') as string | null;

    if (!file || !colaborador_id || !tipo_documento || !titulo) {
      return NextResponse.json({
        error: 'file, colaborador_id, tipo_documento e titulo são obrigatórios'
      }, { status: 400 });
    }

    const { data: colaborador, error: colError } = await supabaseAdmin
      .from('gt_colaboradores')
      .select('id')
      .eq('id', colaborador_id)
      .is('deleted_at', null)
      .maybeSingle();

    if (colError || !colaborador) {
      return NextResponse.json({ error: 'Colaborador não encontrado' }, { status: 404 });
    }

    const tiposValidos = ['aso', 'treinamento', 'passaporte', 'cnh', 'certidao_nascimento',
      'certidao_casamento', 'reservista', 'titulo_eleitor', 'ctps',
      'documento_pessoal', 'certificado', 'contrato', 'laudo', 'outro'];

    if (!tiposValidos.includes(tipo_documento)) {
      return NextResponse.json({ error: 'Tipo de documento inválido' }, { status: 400 });
    }

    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Arquivo muito grande. Tamanho máximo: 20MB' }, { status: 400 });
    }

    const allowedMimes = [
      'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!allowedMimes.includes(file.type)) {
      return NextResponse.json({ error: 'Formato de arquivo não permitido. Use PDF, JPEG, PNG ou WebP' }, { status: 400 });
    }

    const ext = file.name.split('.').pop() || 'pdf';
    const filePath = `gestao-tripulantes/${colaborador_id}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from('gestao-tripulantes-documentos')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Erro ao fazer upload do arquivo:', uploadError);
      return NextResponse.json({ error: 'Erro ao fazer upload do arquivo' }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('gestao-tripulantes-documentos')
      .getPublicUrl(filePath);

    const arquivo_url = urlData?.publicUrl || '';

    const status_validacao = data_validade
      ? (new Date(data_validade) < new Date() ? 'vencido' :
         new Date(data_validade) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'vencendo' : 'valido')
      : 'pendente';

    const { data: documento, error: insertError } = await supabaseAdmin
      .from('gt_documentos')
      .insert({
        colaborador_id,
        tipo_documento,
        titulo,
        descricao: descricao || null,
        numero_documento: numero_documento || null,
        orgao_emissor: orgao_emissor || null,
        data_emissao: data_emissao || null,
        data_validade: data_validade || null,
        arquivo_url,
        arquivo_path: filePath,
        arquivo_tamanho_bytes: file.size,
        arquivo_tipo: file.type,
        origem: 'upload',
        ocr_status: 'pendente',
        status_validacao,
        notificado_vencimento: false,
        status_revisao: 'nao_necessita',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('Erro ao salvar registro do documento:', insertError);
      await supabaseAdmin.storage.from('gestao-tripulantes-documentos').remove([filePath]);
      return NextResponse.json({ error: 'Erro ao salvar registro do documento' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: documento,
      message: 'Documento enviado com sucesso'
    }, { status: 201 });
  } catch (error) {
    console.error('Erro no upload de documento:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
