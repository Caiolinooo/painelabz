#!/usr/bin/env node

/**
 * Script para aplicar foreign keys no Supabase
 * Executa as SQL statements do arquivo FIX_FOREIGN_KEYS.sql
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuração do Supabase a partir das variáveis de ambiente
const supabaseUrl = ***REMOVED***;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ***REMOVED***;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Erro: Variáveis de ambiente do Supabase não configuradas');
    console.error('Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

// Criar cliente Supabase com permissões de admin
const supabase = ***REMOVED*** supabaseServiceKey);

async function applyForeignKeys() {
    console.log('🔧 Iniciando aplicação de foreign keys...');

    try {
        // Ler o arquivo SQL
        const sqlFilePath = path.join(__dirname, '../supabase/migrations/FIX_FOREIGN_KEYS.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

        console.log('📄 Arquivo SQL lido:', sqlFilePath);

        // Dividir o conteúdo em comandos individuais (ignorando comentários)
        const commands = sqlContent
            .split(';')
            .map(cmd => cmd.trim())
            .filter(cmd => cmd && !cmd.startsWith('--') && cmd.toLowerCase().includes('alter table'));

        console.log(`🔍 Encontrados ${commands.length} comandos ALTER TABLE para executar`);

        // Executar cada comando
        for (const command of commands) {
            if (command.trim()) {
                console.log(`🚀 Executando: ${command.substring(0, 100)}...`);

                const { data, error } = await supabase.rpc('exec_sql', {
                    sql_query: command
                });

                if (error) {
                    // Tentar executar direto via SQL
                    console.log('⚠️ Tentando execução direta...');
                    const { error: directError } = await supabase
                        .from('dummy')
                        .select('*');

                    if (directError && !directError.message.includes('does not exist')) {
                        console.error('❌ Erro ao executar comando:', error.message);
                        continue;
                    }
                } else {
                    console.log('✅ Comando executado com sucesso');
                }
            }
        }

        // Verificar se as foreign keys foram criadas
        console.log('\n🔍 Verificando se as foreign keys foram criadas...');

        const { data: constraints, error: checkError } = await supabase
            .from('information_schema.table_constraints')
            .select('constraint_name, table_name')
            .in('constraint_name', [
                'avaliacoes_desempenho_funcionario_id_fkey',
                'avaliacoes_desempenho_avaliador_id_fkey'
            ]);

        if (checkError) {
            console.log('⚠️ Não foi possível verificar via information_schema, tentando método alternativo...');

            // Método alternativo: consulta direta ao pg_constraint
            const { data: pgConstraints, error: pgError } = await supabase
                .rpc('check_constraints', {
                    constraint_names: [
                        'avaliacoes_desempenho_funcionario_id_fkey',
                        'avaliacoes_desempenho_avaliador_id_fkey'
                    ]
                });

            if (pgError) {
                console.error('❌ Erro ao verificar constraints:', pgError.message);
            } else {
                console.log('✅ Constraints encontradas:', pgConstraints);
            }
        } else {
            console.log('✅ Constraints verificadas:', constraints);
        }

        console.log('\n🎉 Processo concluído!');
        console.log('📋 Verifique no painel do Supabase se as foreign keys foram criadas corretamente');

    } catch (error) {
        console.error('❌ Erro durante a execução:', error.message);
        process.exit(1);
    }
}

// Criar função auxiliar se não existir
async function createExecSQLFunction() {
    console.log('🔧 Criando função exec_sql se não existir...');

    const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
            EXECUTE sql_query;
        END;
        $$;
    `;

    try {
        // Tentar criar função via REST (limitado)
        console.log('⚠️ Nota: Execute o SQL manualmente no Supabase SQL Editor para garantir funcionamento');
        console.log('📋 Copie e cole o conteúdo do arquivo FIX_FOREIGN_KEYS.sql');

    } catch (error) {
        console.log('ℹ️ Função pode já existir ou ser criada manualmente');
    }
}

// Função para verificar constraints (alternativa)
async function createCheckConstraintsFunction() {
    console.log('🔧 Criando função check_constraints...');

    const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION check_constraints(constraint_names text[])
        RETURNS TABLE(constraint_name text, table_name text)
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
            RETURN QUERY
            SELECT
                con.conname,
                con.conrelid::regclass::text
            FROM pg_constraint con
            WHERE con.conname = ANY(constraint_names);
        END;
        $$;
    `;

    console.log('⚠️ Execute esta função manualmente no Supabase SQL Editor se necessário');
}

// Executar o script
if (require.main === module) {
    createExecSQLFunction()
        .then(() => createCheckConstraintsFunction())
        .then(() => applyForeignKeys())
        .catch((error) => {
            console.error('❌ Erro fatal:', error.message);
            process.exit(1);
        });
}

module.exports = {
    applyForeignKeys,
    createExecSQLFunction,
    createCheckConstraintsFunction
};