-- ============================================
-- MÓDULO GESTÃO DE TRIPULANTES
-- Migration: 20260520_000001
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. CENTROS DE CUSTO
CREATE TABLE IF NOT EXISTS gt_centros_custo (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    codigo TEXT UNIQUE,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_gt_centros_custo_updated_at ON gt_centros_custo;
CREATE TRIGGER trg_gt_centros_custo_updated_at
    BEFORE UPDATE ON gt_centros_custo FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. EMPRESAS
CREATE TABLE IF NOT EXISTS gt_empresas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    cnpj TEXT,
    centro_custo_id UUID REFERENCES gt_centros_custo(id) ON DELETE SET NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_gt_empresas_updated_at ON gt_empresas;
CREATE TRIGGER trg_gt_empresas_updated_at
    BEFORE UPDATE ON gt_empresas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_gt_empresas_centro_custo ON gt_empresas(centro_custo_id);

-- 3. EMBARCAÇÕES
CREATE TABLE IF NOT EXISTS gt_embarcacoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    imo TEXT,
    empresa_id UUID REFERENCES gt_empresas(id) ON DELETE SET NULL,
    tipo TEXT,
    capacidade INTEGER,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_gt_embarcacoes_updated_at ON gt_embarcacoes;
CREATE TRIGGER trg_gt_embarcacoes_updated_at
    BEFORE UPDATE ON gt_embarcacoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_gt_embarcacoes_empresa ON gt_embarcacoes(empresa_id);

-- 4. CARGOS
CREATE TABLE IF NOT EXISTS gt_cargos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    descricao TEXT,
    nivel INTEGER DEFAULT 0,
    ordem_exibicao INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_gt_cargos_updated_at ON gt_cargos;
CREATE TRIGGER trg_gt_cargos_updated_at
    BEFORE UPDATE ON gt_cargos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. COLABORADORES
CREATE TABLE IF NOT EXISTS gt_colaboradores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users_unified(id) ON DELETE SET NULL,
    nome_completo TEXT NOT NULL,
    cpf TEXT UNIQUE,
    rg TEXT,
    data_nascimento DATE,
    email TEXT,
    telefone TEXT,
    nacionalidade TEXT DEFAULT 'BRASILEIRA',
    naturalidade TEXT,
    nome_mae TEXT,
    nome_pai TEXT,
    estado_civil TEXT,
    endereco_logradouro TEXT,
    endereco_numero TEXT,
    endereco_complemento TEXT,
    endereco_bairro TEXT,
    endereco_cidade TEXT,
    endereco_uf TEXT,
    endereco_cep TEXT,
    dados_bancarios JSONB,
    centro_custo_id UUID REFERENCES gt_centros_custo(id) ON DELETE SET NULL,
    empresa_id UUID REFERENCES gt_empresas(id) ON DELETE SET NULL,
    embarcacao_atual_id UUID REFERENCES gt_embarcacoes(id) ON DELETE SET NULL,
    cargo_id UUID REFERENCES gt_cargos(id) ON DELETE SET NULL,
    data_admissao DATE,
    data_demissao DATE,
    matricula TEXT,
    status_embarque TEXT CHECK (status_embarque IN (
        'embarcado','standby','folga','desembarcado','afastado','ferias','treinamento'
    )) DEFAULT 'desembarcado',
    standby BOOLEAN DEFAULT false,
    data_ultimo_embarque DATE,
    data_ultimo_desembarque DATE,
    data_proximo_embarque DATE,
    origem TEXT DEFAULT 'local' CHECK (origem IN ('local','mio','importado','manual')),
    mio_id TEXT,
    mio_data JSONB,
    ultimo_sync_mio TIMESTAMPTZ,
    foto_url TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_gt_colaboradores_updated_at ON gt_colaboradores;
CREATE TRIGGER trg_gt_colaboradores_updated_at
    BEFORE UPDATE ON gt_colaboradores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_gt_colab_cpf ON gt_colaboradores(cpf);
CREATE INDEX IF NOT EXISTS idx_gt_colab_status ON gt_colaboradores(status_embarque);
CREATE INDEX IF NOT EXISTS idx_gt_colab_empresa ON gt_colaboradores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_gt_colab_embarcacao ON gt_colaboradores(embarcacao_atual_id);
CREATE INDEX IF NOT EXISTS idx_gt_colab_cargo ON gt_colaboradores(cargo_id);
CREATE INDEX IF NOT EXISTS idx_gt_colab_centro_custo ON gt_colaboradores(centro_custo_id);
CREATE INDEX IF NOT EXISTS idx_gt_colab_user ON gt_colaboradores(user_id);
CREATE INDEX IF NOT EXISTS idx_gt_colab_standby ON gt_colaboradores(standby) WHERE standby = true;

-- 6. DOCUMENTOS
CREATE TABLE IF NOT EXISTS gt_documentos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    colaborador_id UUID REFERENCES gt_colaboradores(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users_unified(id) ON DELETE SET NULL,
    tipo_documento TEXT NOT NULL CHECK (tipo_documento IN (
        'aso','treinamento','passaporte','cnh','certidao_nascimento',
        'certidao_casamento','reservista','titulo_eleitor','ctps',
        'documento_pessoal','certificado','contrato','laudo','outro'
    )),
    subtipo TEXT,
    titulo TEXT NOT NULL,
    descricao TEXT,
    numero_documento TEXT,
    orgao_emissor TEXT,
    data_emissao DATE,
    data_validade DATE,
    arquivo_url TEXT,
    arquivo_path TEXT,
    arquivo_tamanho_bytes BIGINT,
    arquivo_tipo TEXT,
    ocr_status TEXT CHECK (ocr_status IN ('pendente','processando','concluido','erro','nao_aplicavel')) DEFAULT 'pendente',
    ocr_texto TEXT,
    ocr_dados_extraidos JSONB,
    ocr_data TIMESTAMPTZ,
    ocr_erro TEXT,
    status_validacao TEXT CHECK (status_validacao IN ('valido','vencendo','vencido','pendente','reprovado','cancelado')) DEFAULT 'pendente',
    notificado_vencimento BOOLEAN DEFAULT false,
    origem TEXT CHECK (origem IN ('upload','poliweb','mio','manual','ocr')) DEFAULT 'upload',
    origem_ref TEXT,
    status_revisao TEXT CHECK (status_revisao IN ('nao_necessita','pendente_revisao','aprovado','rejeitado')) DEFAULT 'nao_necessita',
    revisado_por UUID REFERENCES users_unified(id) ON DELETE SET NULL,
    revisado_em TIMESTAMPTZ,
    comentario_revisao TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_gt_documentos_updated_at ON gt_documentos;
CREATE TRIGGER trg_gt_documentos_updated_at
    BEFORE UPDATE ON gt_documentos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_gt_docs_colaborador ON gt_documentos(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_gt_docs_tipo ON gt_documentos(tipo_documento);
CREATE INDEX IF NOT EXISTS idx_gt_docs_status ON gt_documentos(status_validacao);
CREATE INDEX IF NOT EXISTS idx_gt_docs_validade ON gt_documentos(data_validade);
CREATE INDEX IF NOT EXISTS idx_gt_docs_revisao ON gt_documentos(status_revisao) WHERE status_revisao = 'pendente_revisao';
CREATE INDEX IF NOT EXISTS idx_gt_docs_colaborador_tipo ON gt_documentos(colaborador_id, tipo_documento);

-- 7. DOCUMENTOS ASO
CREATE TABLE IF NOT EXISTS gt_documentos_aso (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    documento_id UUID REFERENCES gt_documentos(id) ON DELETE CASCADE NOT NULL UNIQUE,
    colaborador_id UUID REFERENCES gt_colaboradores(id) ON DELETE CASCADE,
    tipo_exame TEXT CHECK (tipo_exame IN ('admissional','periodico','demissional','retorno','mudanca_funcao')) NOT NULL,
    resultado TEXT CHECK (resultado IN ('apto','inapto','apto_condicional')),
    data_realizacao DATE,
    medico_nome TEXT,
    medico_crm TEXT,
    cnpj_clinica TEXT,
    nome_clinica TEXT,
    exames_realizados JSONB,
    esocial_status TEXT CHECK (esocial_status IN ('nao_enviado','pendente','enviado','processado','erro')) DEFAULT 'nao_enviado',
    esocial_evento_id UUID,
    esocial_protocolo TEXT,
    esocial_numero_recibo TEXT,
    esocial_data_envio TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_gt_documentos_aso_updated_at ON gt_documentos_aso;
CREATE TRIGGER trg_gt_documentos_aso_updated_at
    BEFORE UPDATE ON gt_documentos_aso FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_gt_aso_colaborador ON gt_documentos_aso(colaborador_id);

-- 8. DOCUMENTOS TREINAMENTO
CREATE TABLE IF NOT EXISTS gt_documentos_treinamento (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    documento_id UUID REFERENCES gt_documentos(id) ON DELETE CASCADE NOT NULL UNIQUE,
    colaborador_id UUID REFERENCES gt_colaboradores(id) ON DELETE CASCADE,
    nome_curso TEXT NOT NULL,
    instituicao TEXT,
    carga_horaria INTEGER,
    tipo_curso TEXT,
    aproveitamento DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gt_trein_colaborador ON gt_documentos_treinamento(colaborador_id);

-- 9. HISTÓRICO DE EMBARQUES
CREATE TABLE IF NOT EXISTS gt_historico_embarques (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    colaborador_id UUID REFERENCES gt_colaboradores(id) ON DELETE CASCADE NOT NULL,
    embarcacao_id UUID REFERENCES gt_embarcacoes(id) ON DELETE SET NULL,
    tipo TEXT CHECK (tipo IN ('normal','dobra','folga_indenizada','standby','substituicao','treinamento')) DEFAULT 'normal',
    data_embarque DATE NOT NULL,
    data_desembarque DATE,
    data_prevista_desembarque DATE,
    local_embarque TEXT,
    local_desembarque TEXT,
    voo_ida TEXT,
    voo_volta TEXT,
    observacoes TEXT,
    substituindo_id UUID REFERENCES gt_colaboradores(id) ON DELETE SET NULL,
    mio_embarque_id TEXT,
    origem TEXT DEFAULT 'local' CHECK (origem IN ('local','mio','importado')),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gt_emb_colaborador ON gt_historico_embarques(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_gt_emb_datas ON gt_historico_embarques(data_embarque, data_desembarque);

-- 10. HISTÓRICO DE SUBSTITUIÇÕES
CREATE TABLE IF NOT EXISTS gt_historico_substituicoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    substituto_id UUID REFERENCES gt_colaboradores(id) ON DELETE SET NULL NOT NULL,
    substituido_id UUID REFERENCES gt_colaboradores(id) ON DELETE SET NULL NOT NULL,
    embarque_id UUID REFERENCES gt_historico_embarques(id) ON DELETE SET NULL,
    periodo_inicio DATE NOT NULL,
    periodo_fim DATE,
    cargo_id UUID REFERENCES gt_cargos(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gt_sub_substituto ON gt_historico_substituicoes(substituto_id);
CREATE INDEX IF NOT EXISTS idx_gt_sub_substituido ON gt_historico_substituicoes(substituido_id);

-- 11. LOG DE NOTIFICAÇÕES
CREATE TABLE IF NOT EXISTS gt_notificacoes_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    documento_id UUID REFERENCES gt_documentos(id) ON DELETE SET NULL,
    colaborador_id UUID REFERENCES gt_colaboradores(id) ON DELETE SET NULL,
    tipo_notificacao TEXT CHECK (tipo_notificacao IN (
        'vencimento','novo_documento','embarque','substituicao','revisao_aso','sistema','back_sugestao'
    )),
    canal TEXT CHECK (canal IN ('inapp','email','push')),
    titulo TEXT NOT NULL,
    mensagem TEXT,
    destinatario_id UUID REFERENCES users_unified(id) ON DELETE SET NULL,
    data_envio TIMESTAMPTZ DEFAULT now(),
    sucesso BOOLEAN DEFAULT true,
    erro TEXT
);

-- 12. LOG DE CRON
CREATE TABLE IF NOT EXISTS gt_cron_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tipo TEXT NOT NULL CHECK (tipo IN ('poliweb_scraper','verificar_vencimentos','sync_mio')),
    status TEXT CHECK (status IN ('executando','sucesso','erro')) DEFAULT 'executando',
    detalhes JSONB,
    registros_processados INTEGER DEFAULT 0,
    registros_erro INTEGER DEFAULT 0,
    mensagem_erro TEXT,
    iniciado_em TIMESTAMPTZ DEFAULT now(),
    finalizado_em TIMESTAMPTZ
);

-- 13. CONFIGURAÇÕES
CREATE TABLE IF NOT EXISTS gt_configuracoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chave TEXT UNIQUE NOT NULL,
    valor JSONB NOT NULL,
    descricao TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_gt_config_updated_at ON gt_configuracoes;
CREATE TRIGGER trg_gt_config_updated_at
    BEFORE UPDATE ON gt_configuracoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- CONFIGURAÇÕES PADRÃO
INSERT INTO gt_configuracoes (chave, valor, descricao) VALUES
('geral', '{"modulo_ativo": true, "nome_personalizado": null}', 'Configurações gerais do módulo'),
('mio_integracao', '{"habilitado": true, "escrita_habilitada": false, "auto_sync": true, "intervalo_minutos": 60}', 'Integração com MIO'),
('poliweb', '{"username": "", "password": "", "habilitado": false}', 'Credenciais globais PoliWeb'),
('notificacoes', '{"aso_dias_aviso": [30,15,7], "treinamento_dias_aviso": [30,15], "passaporte_dias_aviso": [60,30], "cnh_dias_aviso": [30,15], "canal_email": true, "canal_push": true, "canal_inapp": true, "enviar_automatico": false}', 'Config. de notificação'),
('ocr', '{"qualidade": "normal", "automatico_upload": true, "fallback_api_url": "", "fallback_api_key": "", "idioma": "por"}', 'Config. de OCR'),
('algoritmo_back', '{"peso_mesmo_centro_custo": 40, "peso_mesma_empresa": 30, "peso_mesma_embarcacao": 25, "peso_mesmo_cargo": 20, "peso_standby": 35, "peso_substituiu_antes": 15, "peso_documentos_validos": 20, "peso_folga_compativel": 5, "peso_senioridade_similar": 10, "limite_resultados": 5, "sugestao_automatica": false}', 'Algoritmo de sugestão de back'),
('autonomia', '{"notificacoes_automaticas": false, "sugestao_back_automatica": false, "scraping_poliweb_automatico": false, "ocr_automatico": true}', 'Toggles de autonomia'),
('dashboard', '{"colunas_visiveis": ["nome","foto","cargo","empresa","embarcacao","status","documentos","proximo_embarque"], "atualizacao_intervalo_segundos": 60}', 'Config. do dashboard')
ON CONFLICT (chave) DO NOTHING;

-- VIEWS
CREATE OR REPLACE VIEW gt_vw_colaboradores_completo AS
SELECT
    c.*,
    cc.nome AS centro_custo_nome, cc.codigo AS centro_custo_codigo,
    e.nome AS empresa_nome, e.cnpj AS empresa_cnpj,
    emb.nome AS embarcacao_nome, emb.imo AS embarcacao_imo,
    ca.nome AS cargo_nome, ca.nivel AS cargo_nivel, ca.ordem_exibicao AS cargo_ordem,
    u.avatar, u.first_name, u.last_name, u.email AS user_email,
    (SELECT COUNT(*) FROM gt_documentos d WHERE d.colaborador_id = c.id AND d.deleted_at IS NULL AND d.status_validacao = 'vencido') AS qtd_docs_vencidos,
    (SELECT COUNT(*) FROM gt_documentos d WHERE d.colaborador_id = c.id AND d.deleted_at IS NULL AND d.status_validacao = 'vencendo') AS qtd_docs_vencendo,
    (SELECT COUNT(*) FROM gt_documentos d WHERE d.colaborador_id = c.id AND d.deleted_at IS NULL AND d.status_validacao = 'valido') AS qtd_docs_validos,
    (SELECT COALESCE(jsonb_agg(sub.dados), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('tipo',d.tipo_documento,'status',d.status_validacao,'validade',d.data_validade,'titulo',d.titulo) AS dados
        FROM gt_documentos d
        WHERE d.colaborador_id = c.id AND d.deleted_at IS NULL AND d.status_validacao IN ('vencido','vencendo')
        ORDER BY d.data_validade ASC LIMIT 5
    ) sub) AS proximos_vencimentos,
    (SELECT jsonb_build_object('data_embarque',he.data_embarque,'data_desembarque',he.data_desembarque,'embarcacao',emb2.nome)
     FROM gt_historico_embarques he LEFT JOIN gt_embarcacoes emb2 ON he.embarcacao_id = emb2.id
     WHERE he.colaborador_id = c.id AND he.deleted_at IS NULL ORDER BY he.data_embarque DESC LIMIT 1) AS ultimo_embarque
FROM gt_colaboradores c
LEFT JOIN gt_centros_custo cc ON c.centro_custo_id = cc.id
LEFT JOIN gt_empresas e ON c.empresa_id = e.id
LEFT JOIN gt_embarcacoes emb ON c.embarcacao_atual_id = emb.id
LEFT JOIN gt_cargos ca ON c.cargo_id = ca.id
LEFT JOIN users_unified u ON c.user_id = u.id
WHERE c.deleted_at IS NULL;

CREATE OR REPLACE VIEW gt_vw_dashboard_resumo AS
SELECT
    (SELECT COUNT(*) FROM gt_colaboradores WHERE deleted_at IS NULL) AS total_colaboradores,
    (SELECT COUNT(*) FROM gt_colaboradores WHERE deleted_at IS NULL AND status_embarque = 'embarcado') AS total_embarcados,
    (SELECT COUNT(*) FROM gt_colaboradores WHERE deleted_at IS NULL AND standby = true) AS total_disponiveis,
    (SELECT COUNT(*) FROM gt_documentos WHERE deleted_at IS NULL AND status_validacao = 'vencido') AS total_docs_vencidos,
    (SELECT COUNT(*) FROM gt_documentos WHERE deleted_at IS NULL AND status_validacao = 'vencendo') AS total_docs_vencendo,
    (SELECT COUNT(*) FROM gt_documentos WHERE deleted_at IS NULL AND status_revisao = 'pendente_revisao') AS asos_pendentes_revisao;

-- RLS
ALTER TABLE gt_centros_custo ENABLE ROW LEVEL SECURITY;
ALTER TABLE gt_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE gt_embarcacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE gt_cargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE gt_colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE gt_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE gt_documentos_aso ENABLE ROW LEVEL SECURITY;
ALTER TABLE gt_documentos_treinamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE gt_historico_embarques ENABLE ROW LEVEL SECURITY;
ALTER TABLE gt_historico_substituicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE gt_notificacoes_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE gt_cron_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE gt_configuracoes ENABLE ROW LEVEL SECURITY;

DO $policy$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'gt_colaboradores_admin_manager' AND tablename = 'gt_colaboradores') THEN
        CREATE POLICY gt_colaboradores_admin_manager ON gt_colaboradores FOR ALL TO authenticated
        USING (
            EXISTS (SELECT 1 FROM users_unified WHERE id = auth.uid()
                AND (role IN ('ADMIN','MANAGER')
                    OR (access_permissions->'modules'->>'gestao-tripulantes')::boolean = true))
        );
    END IF;
END $policy$;

DO $policy$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'gt_documentos_admin_manager' AND tablename = 'gt_documentos') THEN
        CREATE POLICY gt_documentos_admin_manager ON gt_documentos FOR ALL TO authenticated
        USING (
            EXISTS (SELECT 1 FROM users_unified WHERE id = auth.uid()
                AND (role IN ('ADMIN','MANAGER')
                    OR (access_permissions->'modules'->>'gestao-tripulantes')::boolean = true))
        );
    END IF;
END $policy$;

DO $policy$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'gt_config_admin_manager' AND tablename = 'gt_configuracoes') THEN
        CREATE POLICY gt_config_admin_manager ON gt_configuracoes FOR ALL TO authenticated
        USING (
            EXISTS (SELECT 1 FROM users_unified WHERE id = auth.uid() AND role IN ('ADMIN','MANAGER'))
        );
    END IF;
END $policy$;

-- Bucket storage
INSERT INTO storage.buckets (id, name, public) 
SELECT 'gestao-tripulantes-documentos', 'gestao-tripulantes-documentos', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'gestao-tripulantes-documentos');
