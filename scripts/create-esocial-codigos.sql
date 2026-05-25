-- Criação das tabelas para as Tabelas 27 e 50 do e-Social

-- Tabela 27: Procedimentos Diagnósticos (Exames)
CREATE TABLE IF NOT EXISTS public.esocial_tabela_27 (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    descricao TEXT NOT NULL,
    dt_inicio VARCHAR(10),
    dt_fim VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela 50: Cargos e Ocupações (CBO)
CREATE TABLE IF NOT EXISTS public.esocial_tabela_50 (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    descricao TEXT NOT NULL,
    dt_inicio VARCHAR(10),
    dt_fim VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Permissões (RLS)
ALTER TABLE public.esocial_tabela_27 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esocial_tabela_50 ENABLE ROW LEVEL SECURITY;

-- Políticas de leitura pública (autenticados)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'esocial_tabela_27' AND policyname = 'Permitir leitura para todos os usuários logados na Tabela 27'
    ) THEN
        CREATE POLICY "Permitir leitura para todos os usuários logados na Tabela 27" ON public.esocial_tabela_27 FOR SELECT USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'esocial_tabela_50' AND policyname = 'Permitir leitura para todos os usuários logados na Tabela 50'
    ) THEN
        CREATE POLICY "Permitir leitura para todos os usuários logados na Tabela 50" ON public.esocial_tabela_50 FOR SELECT USING (auth.role() = 'authenticated');
    END IF;

    -- Políticas de inserção/atualização (somente admin ou service_role)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'esocial_tabela_27' AND policyname = 'Permitir full access para service_role na Tabela 27'
    ) THEN
        CREATE POLICY "Permitir full access para service_role na Tabela 27" ON public.esocial_tabela_27 USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'esocial_tabela_50' AND policyname = 'Permitir full access para service_role na Tabela 50'
    ) THEN
        CREATE POLICY "Permitir full access para service_role na Tabela 50" ON public.esocial_tabela_50 USING (true) WITH CHECK (true);
    END IF;
END $$;
