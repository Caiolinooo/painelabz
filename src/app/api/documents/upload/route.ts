import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { authenticateUser, checkPermissions } from '@/lib/api-auth';
import { generateSHA256 } from '@/lib/services/CryptographyService';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

// POST — Upload a PDF document (HR only)
export async function POST(request: NextRequest) {
    try {
        const { user, error: authError } = await authenticateUser(request);
        if (authError) return authError;
        if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

        // Permission check: only contracts managers
        if (!checkPermissions(user, 'contracts_manager')) {
            return NextResponse.json({ error: 'Permissão insuficiente. Apenas gestores de contratos podem fazer upload.' }, { status: 403 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const titulo = formData.get('titulo') as string | null;
        const descricao = formData.get('descricao') as string | null;

        if (!file || !titulo) {
            return NextResponse.json({ error: 'Arquivo PDF e título são obrigatórios' }, { status: 400 });
        }

        // Validate file type
        if (!file.type.includes('pdf')) {
            return NextResponse.json({ error: 'Apenas arquivos PDF são permitidos' }, { status: 400 });
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: `Arquivo excede o limite de ${MAX_FILE_SIZE / (1024 * 1024)}MB` }, { status: 400 });
        }

        // Read file buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Generate SHA-256 hash of the original PDF
        const hashOriginal = generateSHA256(buffer);

        // Upload to Supabase Storage
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const storagePath = `documentos/${user.id}/${fileName}`;

        const { error: uploadError } = await supabaseAdmin
            .storage
            .from('documentos-trabalhistas')
            .upload(storagePath, buffer, {
                contentType: 'application/pdf',
                upsert: false,
            });

        if (uploadError) {
            console.error('Erro ao fazer upload do arquivo:', uploadError);
            return NextResponse.json({ error: 'Erro ao fazer upload do arquivo' }, { status: 500 });
        }

        // Get public URL
        const { data: urlData } = supabaseAdmin
            .storage
            .from('documentos-trabalhistas')
            .getPublicUrl(storagePath);

        const arquivoUrl = urlData?.publicUrl || storagePath;

        // Insert record in database
        const { data: documento, error: dbError } = await supabaseAdmin
            .from('documentos_trabalhistas')
            .insert({
                titulo,
                descricao: descricao || null,
                arquivo_url: arquivoUrl,
                arquivo_nome: file.name,
                arquivo_tamanho: file.size,
                hash_original: hashOriginal,
                enviado_por: user.id,
            })
            .select('*')
            .single();

        if (dbError) {
            console.error('Erro ao registrar documento:', dbError);
            return NextResponse.json({ error: 'Erro ao registrar documento no banco' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            documento,
            message: 'Documento enviado com sucesso',
        });
    } catch (error) {
        console.error('Erro em POST /api/documents/upload:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}
