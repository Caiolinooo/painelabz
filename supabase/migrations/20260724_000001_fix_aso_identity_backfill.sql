-- Backfill script to fix ASOs with wrong identity assignment
-- Re-evaluates all gt_documentos_aso rows where identity_match = 'unknown' AND cpf_documento IS NOT NULL

DO $$
DECLARE
    r RECORD;
    v_colaborador_id UUID;
    v_clean_cpf TEXT;
BEGIN
    FOR r IN
        SELECT a.id as aso_id, a.documento_id, a.cpf_documento, a.esocial_status, a.identity_match, a.colaborador_id
        FROM gt_documentos_aso a
        WHERE a.identity_match = 'unknown' 
          AND a.cpf_documento IS NOT NULL
          AND (a.esocial_status IS NULL OR a.esocial_status NOT IN ('pendente', 'enviado', 'processado'))
    LOOP
        -- Extract only digits for comparison
        v_clean_cpf := regexp_replace(r.cpf_documento, '[^0-9]', '', 'g');
        
        -- Search for exact CPF match in gt_colaboradores
        SELECT id INTO v_colaborador_id
        FROM gt_colaboradores
        WHERE regexp_replace(cpf, '[^0-9]', '', 'g') = v_clean_cpf
        LIMIT 1;
        
        IF v_colaborador_id IS NOT NULL THEN
            -- Update to reassigned
            UPDATE gt_documentos_aso 
            SET colaborador_id = v_colaborador_id,
                identity_match = 'reassigned'
            WHERE id = r.aso_id;
            
            UPDATE gt_documentos
            SET colaborador_id = v_colaborador_id
            WHERE id = r.documento_id;
            
            RAISE NOTICE 'ASO ID %: reassigned to Colaborador ID %', r.aso_id, v_colaborador_id;
        ELSE
            -- Quarantine
            UPDATE gt_documentos_aso 
            SET colaborador_id = NULL,
                identity_match = 'quarantine',
                esocial_status = 'quarentena'
            WHERE id = r.aso_id;
            
            UPDATE gt_documentos
            SET colaborador_id = NULL
            WHERE id = r.documento_id;
            
            RAISE NOTICE 'ASO ID %: quarantined due to no matching CPF in gt_colaboradores', r.aso_id;
        END IF;
    END LOOP;
END $$;
