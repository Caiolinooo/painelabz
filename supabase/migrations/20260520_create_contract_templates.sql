-- 1. Create contrato_templates table
CREATE TABLE IF NOT EXISTS public.contrato_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo TEXT NOT NULL,
    descricao TEXT,
    papeis JSONB NOT NULL DEFAULT '[]'::jsonb,
    remetente_id UUID REFERENCES public.users_unified(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create contrato_template_documentos table
CREATE TABLE IF NOT EXISTS public.contrato_template_documentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES public.contrato_templates(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    arquivo_url TEXT NOT NULL,
    arquivo_nome TEXT NOT NULL,
    arquivo_tamanho INTEGER NOT NULL,
    hash_original TEXT NOT NULL,
    ordem INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create contrato_template_campos table
CREATE TABLE IF NOT EXISTS public.contrato_template_campos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES public.contrato_templates(id) ON DELETE CASCADE,
    documento_id UUID NOT NULL REFERENCES public.contrato_template_documentos(id) ON DELETE CASCADE,
    papel_nome TEXT,
    colaborador_id UUID REFERENCES public.users_unified(id) ON DELETE SET NULL,
    external_signer_name TEXT,
    external_signer_email TEXT,
    pagina_assinatura INTEGER NOT NULL,
    posicao_x DOUBLE PRECISION NOT NULL,
    posicao_y DOUBLE PRECISION NOT NULL,
    largura_assinatura DOUBLE PRECISION NOT NULL DEFAULT 150,
    altura_assinatura DOUBLE PRECISION NOT NULL DEFAULT 50,
    tipo TEXT NOT NULL CHECK (tipo IN ('assinatura', 'rubrica', 'texto', 'checkbox')),
    ordem INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS) on templates
ALTER TABLE public.contrato_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contrato_template_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contrato_template_campos ENABLE ROW LEVEL SECURITY;

-- 5. Enable Row Level Security (RLS) on envelopes
ALTER TABLE public.envelopes ENABLE ROW LEVEL SECURITY;

-- 6. Drop the unique constraint from solicitacoes_assinatura that blocks multiple fields per user
ALTER TABLE public.solicitacoes_assinatura DROP CONSTRAINT IF EXISTS solicitacoes_assinatura_documento_id_colaborador_id_key;

-- 7. Update check constraint on solicitacoes_assinatura tipo
ALTER TABLE public.solicitacoes_assinatura DROP CONSTRAINT IF EXISTS solicitacoes_assinatura_tipo_check;
ALTER TABLE public.solicitacoes_assinatura ADD CONSTRAINT solicitacoes_assinatura_tipo_check CHECK (tipo IN ('assinatura', 'rubrica', 'copia', 'texto', 'checkbox'));

-- 8. Add valor_preenchido column to solicitacoes_assinatura if not exists
ALTER TABLE public.solicitacoes_assinatura ADD COLUMN IF NOT EXISTS valor_preenchido TEXT;

-- 9. Setup triggers for updated_at
DROP TRIGGER IF EXISTS update_contrato_templates_updated_at ON public.contrato_templates;
CREATE TRIGGER update_contrato_templates_updated_at
BEFORE UPDATE ON public.contrato_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_contrato_template_campos_updated_at ON public.contrato_template_campos;
CREATE TRIGGER update_contrato_template_campos_updated_at
BEFORE UPDATE ON public.contrato_template_campos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 10. RLS Policies
-- For envelopes (Managers see all, Collaborators see theirs/where they are signers)
DROP POLICY IF EXISTS envelopes_all_managers_policy ON public.envelopes;
CREATE POLICY envelopes_all_managers_policy ON public.envelopes
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users_unified u
            WHERE u.id = auth.uid() AND (u.role IN ('ADMIN', 'MANAGER') OR EXISTS (
                SELECT 1 FROM public.user_permissions p 
                WHERE p.user_id = u.id AND p.module = 'contracts'
            ))
        )
    );

DROP POLICY IF EXISTS envelopes_select_collaborator_policy ON public.envelopes;
CREATE POLICY envelopes_select_collaborator_policy ON public.envelopes
    FOR SELECT
    USING (
        auth.uid() = remetente_id OR
        EXISTS (
            SELECT 1 FROM public.solicitacoes_assinatura s
            WHERE s.envelope_id = id AND (
                s.colaborador_id = auth.uid() OR 
                s.external_signer_email = (SELECT email FROM public.users_unified WHERE id = auth.uid())
            )
        )
    );

-- For contrato_templates
DROP POLICY IF EXISTS templates_manager_policy ON public.contrato_templates;
CREATE POLICY templates_manager_policy ON public.contrato_templates
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users_unified u
            WHERE u.id = auth.uid() AND (u.role IN ('ADMIN', 'MANAGER') OR EXISTS (
                SELECT 1 FROM public.user_permissions p 
                WHERE p.user_id = u.id AND p.module = 'contracts'
            ))
        )
    );

DROP POLICY IF EXISTS templates_select_policy ON public.contrato_templates;
CREATE POLICY templates_select_policy ON public.contrato_templates
    FOR SELECT
    USING (true); -- Anyone logged in can see templates to use them

-- For template documents & fields
DROP POLICY IF EXISTS template_docs_policy ON public.contrato_template_documentos;
CREATE POLICY template_docs_policy ON public.contrato_template_documentos
    FOR ALL
    USING (true);

DROP POLICY IF EXISTS template_fields_policy ON public.contrato_template_campos;
CREATE POLICY template_fields_policy ON public.contrato_template_campos
    FOR ALL
    USING (true);
