-- Script para verificar a estrutura da tabela avaliacoes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'avaliacoes'
ORDER BY ordinal_position;
