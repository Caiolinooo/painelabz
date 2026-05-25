import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function filterCacheDataByCPF(tipo: string, dados: any, cpfClean: string): any {
    if (!Array.isArray(dados)) {
        return dados;
    }

    if (!cpfClean) {
        return []; // Se não tem CPF limpo e precisa filtrar, retorna vazio por segurança
    }

    return dados.filter((item: any) => {
        if (!item) return false;
        
        // Procurar possíveis campos de CPF no item
        const itemCPF = (
            item.cpf || 
            item.CPF || 
            item.cpf_numero || 
            item['CPF'] || 
            item['Cpf'] || 
            ''
        ).toString().replace(/\D/g, '');
        
        return itemCPF === cpfClean;
    });
}

export async function GET(request: NextRequest) {
    try {
        // 1. Extrair token de autenticação (Header ou Cookies)
        let token: string | null = null;
        const authHeader = request.headers.get('authorization');
        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else {
            token = request.cookies.get('abzToken')?.value || request.cookies.get('token')?.value || null;
        }

        if (!token) {
            return NextResponse.json({ success: false, error: 'Não autorizado: Token não fornecido' }, { status: 401 });
        }

        // 2. Verificar token JWT
        const decoded = verifyToken(token);
        if (!decoded || !decoded.userId) {
            return NextResponse.json({ success: false, error: 'Não autorizado: Token inválido ou expirado' }, { status: 401 });
        }

        // 3. Buscar informações e role do usuário no banco de dados
        const { data: userUnified, error: userError } = await supabaseAdmin
            .from('users_unified')
            .select('tax_id, role, active')
            .eq('id', decoded.userId)
            .single();

        if (userError || !userUnified) {
            return NextResponse.json({ success: false, error: 'Usuário não encontrado' }, { status: 401 });
        }

        if (!userUnified.active) {
            return NextResponse.json({ success: false, error: 'Conta inativa' }, { status: 403 });
        }

        // 4. Determinar se precisa de filtragem granular (USER ou MANAGER sem acesso admin/gestao-tripulantes/users/settings)
        let needsFiltering = true;
        if (userUnified.role === 'ADMIN') {
            needsFiltering = false;
        } else if (userUnified.role === 'MANAGER') {
            const { data: perms } = await supabaseAdmin
                .from('user_permissions')
                .select('module')
                .eq('user_id', decoded.userId);

            const privilegedModules = ['admin', 'users', 'gestao-tripulantes', 'settings'];
            const hasPrivilegedAccess = perms?.some(p => privilegedModules.includes(p.module)) || false;
            
            if (hasPrivilegedAccess) {
                needsFiltering = false;
            }
        }

        const cleanCPF = (userUnified.tax_id || '').replace(/\D/g, '');

        // 5. Obter parâmetros da URL
        const { searchParams } = new URL(request.url);
        const tipo = searchParams.get('tipo') || 'integrantes';
        const tipos = tipo.split(',').map(t => t.trim()).filter(Boolean);

        if (tipos.length === 0) {
            return NextResponse.json({ success: false, error: 'Parâmetro "tipo" é obrigatório' }, { status: 400 });
        }

        // 6. Buscar cache do banco
        const { data, error } = await supabaseAdmin
            .from('mio_cache')
            .select('*')
            .in('tipo', tipos);

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        if (!data || data.length === 0) {
            return NextResponse.json({
                success: true,
                data: null,
                message: 'Cache vazio — execute /api/mio/cache/atualizar primeiro',
            });
        }

        // 7. Filtrar e formatar retorno
        const result: Record<string, any> = {};
        for (const row of data) {
            let filteredDados = row.dados;
            if (needsFiltering) {
                filteredDados = filterCacheDataByCPF(row.tipo, row.dados, cleanCPF);
            }
            result[row.tipo] = {
                dados: filteredDados,
                total_registros: Array.isArray(filteredDados) ? filteredDados.length : row.total_registros,
                atualizado_em: row.atualizado_em,
            };
        }

        // Se pediu apenas um tipo, retorna direto
        if (tipos.length === 1) {
            const single = data[0];
            let filteredDados = single.dados;
            if (needsFiltering) {
                filteredDados = filterCacheDataByCPF(single.tipo, single.dados, cleanCPF);
            }
            return NextResponse.json({
                success: true,
                data: filteredDados,
                total_registros: Array.isArray(filteredDados) ? filteredDados.length : single.total_registros,
                atualizado_em: single.atualizado_em,
            });
        }

        return NextResponse.json({ success: true, data: result });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

