-- Script para adicionar a coluna data_criacao à tabela avaliacoes se ela não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'avaliacoes' AND column_name = 'data_criacao'
    ) THEN
        RAISE NOTICE 'Adicionando coluna data_criacao à tabela avaliacoes...';
        
        ALTER TABLE avaliacoes
        ADD COLUMN data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        -- Atualizar os registros existentes para usar created_at como data_criacao
        UPDATE avaliacoes
        SET data_criacao = created_at
        WHERE data_criacao IS NULL;
        
        RAISE NOTICE 'Coluna data_criacao adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna data_criacao já existe na tabela avaliacoes';
    END IF;
END
$$;
