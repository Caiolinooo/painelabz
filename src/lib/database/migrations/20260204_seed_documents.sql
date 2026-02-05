-- Seed documents table if empty
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.documents) THEN
        INSERT INTO public.documents (title, description, category, language, file, enabled, "order", created_at, updated_at)
        VALUES 
        -- Políticas
        ('Política de HSE', 'Diretrizes de Saúde, Segurança e Meio Ambiente do ABZ Group', 'HSE', 'Português', '/documentos/politicas/PL-HSE-R0 - Política de HSE_ABZ Group-PORT.pdf', true, 1, NOW(), NOW()),
        ('Política da Qualidade', 'Política de Qualidade e Gestão do ABZ Group', 'Qualidade', 'Português', '/documentos/politicas/PL-QUA-R8 - Politica da Qualidade_ABZ Group-PORT.pdf', true, 2, NOW(), NOW()),
        ('Quality Policy', 'ABZ Group Quality Management Policy', 'Qualidade', 'English', '/documentos/politicas/PL-QUA-a-R8 - Quality Policy_ABZ Group-ENG.pdf', true, 3, NOW(), NOW()),
        
        -- Manuais
        ('Manual de Logística', 'Guia completo com as diretrizes e informações sobre os processos logísticos.', 'Manual', 'Português', '/documentos/manuais/Manual de logística.pdf', true, 1, NOW(), NOW()),
        
        -- Procedimentos de Logística
        ('Procedimento de Recebimento', 'Procedimento para recebimento de materiais.', 'Logística', 'Português', '/documentos/procedimentos/recebimento.pdf', true, 1, NOW(), NOW()),
        ('Procedimento de Expedição', 'Procedimento para expedição de materiais.', 'Logística', 'Português', '/documentos/procedimentos/expedicao.pdf', true, 2, NOW(), NOW()),
        
        -- Procedimentos Gerais
        ('Procedimento de Compras', 'Procedimento para compras de materiais e serviços.', 'Compras', 'Português', '/documentos/procedimentos/compras.pdf', true, 1, NOW(), NOW()),
        ('Procedimento de RH', 'Procedimento para gestão de recursos humanos.', 'RH', 'Português', '/documentos/procedimentos/rh.pdf', true, 2, NOW(), NOW());
    END IF;
END $$;
