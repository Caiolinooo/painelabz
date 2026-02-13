#!/usr/bin/env npx tsx
/**
 * SMB Sync Script — Standalone
 * 
 * Roda fora do Next.js. Pode ser agendado via Windows Task Scheduler ou cron.
 * 
 * Uso:
 *   npx tsx scripts/smb-sync.ts
 * 
 * Variáveis de ambiente necessárias:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SMB_ENCRYPTION_KEY (opcional, para descriptografar passwords)
 */

import { createClient } from '@supabase/supabase-js';
import SMB2 from '@marsaud/smb2';
import crypto from 'crypto';
import path from 'path';
import dotenv from 'dotenv';

// Load env files
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Crypto ---
function decryptPassword(encrypted: string): string {
    const key = crypto.createHash('sha256')
        .update(process.env.SMB_ENCRYPTION_KEY || SUPABASE_URL || 'default-smb-key-change-me-asap!')
        .digest();

    const parts = encrypted.split(':');
    if (parts.length !== 3) throw new Error('Invalid encrypted password format');

    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const data = parts[2];

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    let dec = decipher.update(data, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
}

// --- MIME ---
function getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const types: Record<string, string> = {
        pdf: 'application/pdf',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ppt: 'application/vnd.ms-powerpoint',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        txt: 'text/plain',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
    };
    return types[ext || ''] || 'application/octet-stream';
}

// --- SMB helpers ---
function listDir(client: any, dirPath: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
        client.readdir(dirPath, (err: any, files: string[]) => {
            if (err) reject(err);
            else resolve(files);
        });
    });
}

function readFile(client: any, filePath: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        client.readFile(filePath, (err: any, data: Buffer) => {
            if (err) reject(err);
            else resolve(data);
        });
    });
}

async function isDir(client: any, p: string): Promise<boolean> {
    return new Promise(resolve => {
        client.readdir(p, (err: any) => resolve(!err));
    });
}

async function listAllFiles(client: any, basePath: string): Promise<{ name: string; path: string }[]> {
    const all: { name: string; path: string }[] = [];

    async function walk(dir: string) {
        try {
            const entries = await listDir(client, dir);
            for (const entry of entries) {
                const fullPath = dir ? `${dir}\\${entry}` : entry;
                if (await isDir(client, fullPath)) {
                    await walk(fullPath);
                } else {
                    all.push({ name: entry, path: fullPath });
                }
            }
        } catch (e: any) {
            console.warn(`⚠ Erro ao listar ${dir}: ${e.message}`);
        }
    }

    await walk(basePath);
    return all;
}

// --- Main ---
async function main() {
    console.log('🔄 SMB Sync — Iniciando...');
    console.log(`📅 ${new Date().toISOString()}`);

    // Load all active connections
    const { data: connections, error } = await supabase
        .from('smb_connections')
        .select('*')
        .eq('is_active', true);

    if (error || !connections || connections.length === 0) {
        console.log('ℹ Nenhuma conexão SMB ativa encontrada.');
        return;
    }

    console.log(`📡 ${connections.length} conexão(ões) encontrada(s).\n`);

    for (const conn of connections) {
        console.log(`━━━ Processando: ${conn.name} (${conn.host}\\${conn.share}) ━━━`);

        const sharePath = `\\\\${conn.host}\\${conn.share}`;
        let password: string;

        try {
            password = decryptPassword(conn.password_encrypted);
        } catch (e: any) {
            console.error(`❌ Falha ao descriptografar password: ${e.message}`);
            continue;
        }

        const client = new SMB2({
            share: sharePath,
            domain: conn.domain || '',
            username: conn.username,
            password,
            port: conn.port || 445,
            autoCloseTimeout: 60000,
        });

        // Create sync log
        const { data: syncLog } = await supabase
            .from('smb_sync_log')
            .insert({ connection_id: conn.id, status: 'running' })
            .select()
            .single();

        let synced = 0, failed = 0, skipped = 0;
        const errors: string[] = [];

        try {
            const basePath = (conn.base_path || '').replace(/\//g, '\\');
            console.log(`📂 Listando arquivos em: ${basePath || '(raiz)'}`);

            const files = await listAllFiles(client, basePath);
            console.log(`📋 ${files.length} arquivo(s) encontrado(s).`);

            for (const file of files) {
                // Skip system/temp files
                if (file.name.startsWith('.') || file.name.startsWith('~$') || file.name === 'Thumbs.db' || file.name === 'desktop.ini') {
                    skipped++;
                    continue;
                }

                // Check if already synced
                const { data: existing } = await supabase
                    .from('library_items')
                    .select('id')
                    .eq('metadata->>smb_source', file.path)
                    .eq('metadata->>smb_connection_id', conn.id)
                    .maybeSingle();

                if (existing) {
                    skipped++;
                    continue;
                }

                try {
                    console.log(`  📥 Baixando: ${file.name}`);
                    const data = await readFile(client, file.path);

                    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                    const storagePath = `smb-sync/${conn.id}/${Date.now()}_${safeName}`;
                    const mime = getMimeType(file.name);

                    // Upload
                    const { error: upErr } = await supabase.storage
                        .from('library')
                        .upload(storagePath, data, { contentType: mime, upsert: true });

                    if (upErr) {
                        const { error: upErr2 } = await supabase.storage
                            .from('documents')
                            .upload(storagePath, data, { contentType: mime, upsert: true });
                        if (upErr2) {
                            errors.push(`Upload: ${file.name}: ${upErr2.message}`);
                            failed++;
                            continue;
                        }
                    }

                    const bucket = 'library';
                    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(storagePath);

                    const ext = file.name.split('.').pop()?.toLowerCase();
                    let type = 'document';
                    if (ext === 'pdf') type = 'pdf';
                    else if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) type = 'image';

                    const slug = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase() + '-' + Date.now().toString(36);

                    const { error: insErr } = await supabase.from('library_items').insert({
                        title: file.name.replace(/\.[^/.]+$/, ''),
                        slug,
                        description: `Sincronizado de ${conn.name} — ${conn.sync_target_category || 'SMB'}`,
                        type,
                        content_url: urlData.publicUrl,
                        is_active: true,
                        metadata: {
                            smb_source: file.path,
                            smb_connection_id: conn.id,
                            smb_connection_name: conn.name,
                            category: conn.sync_target_category,
                            original_filename: file.name,
                            mime_type: mime,
                            synced_at: new Date().toISOString(),
                        },
                    });

                    if (insErr) {
                        errors.push(`Insert: ${file.name}: ${insErr.message}`);
                        failed++;
                    } else {
                        console.log(`  ✅ ${file.name}`);
                        synced++;
                    }
                } catch (e: any) {
                    errors.push(`${file.name}: ${e.message}`);
                    failed++;
                }
            }

        } catch (e: any) {
            console.error(`❌ Erro geral: ${e.message}`);
            errors.push(e.message);
        }

        // Update logs
        const status = failed > 0 ? 'completed_with_errors' : 'completed';

        if (syncLog) {
            await supabase.from('smb_sync_log').update({
                status, files_synced: synced, files_failed: failed, files_skipped: skipped,
                error_message: errors.length > 0 ? errors.join('\n') : null,
                completed_at: new Date().toISOString(),
            }).eq('id', syncLog.id);
        }

        await supabase.from('smb_connections').update({
            last_sync_at: new Date().toISOString(),
            last_sync_status: status,
            last_sync_files_count: synced,
            last_sync_error: errors.length > 0 ? errors[0] : null,
        }).eq('id', conn.id);

        try { client.close(); } catch { }

        console.log(`\n📊 Resultado: ${synced} sincronizados, ${failed} falhas, ${skipped} pulados`);
        if (errors.length) console.log(`⚠ Erros:\n${errors.map(e => `  - ${e}`).join('\n')}`);
        console.log('');
    }

    console.log('✅ Sync finalizado!');
}

main().catch(err => {
    console.error('❌ Erro fatal:', err);
    process.exit(1);
});
