-- ============================================
-- MÓDULO E-SOCIAL
-- Migration: 20260520_000002
-- ============================================

-- 1. CATÁLOGO DE EVENTOS
CREATE TABLE IF NOT EXISTS esocial_eventos_catalogo (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    codigo_evento TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    grupo TEXT CHECK (grupo IN ('cadastramento','contratual','tabela','nao_periodico','periodico')),
    versao_leiaute TEXT DEFAULT 'S-1.3',
    prazo_envio_dias INTEGER,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. EVENTOS PREPARADOS PARA ENVIO
CREATE TABLE IF NOT EXISTS esocial_eventos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    evento_codigo TEXT NOT NULL,
    cpf_trabalhador TEXT,
    cnpj_empregador TEXT,
    matricula TEXT,
    dados_evento JSONB NOT NULL,
    xml_gerado TEXT,
    modulo_origem TEXT NOT NULL,
    entidade_origem_id UUID,
    entidade_origem_tipo TEXT,
    status TEXT CHECK (status IN (
        'rascunho','pendente_revisao','revisao_aprovado','revisao_rejeitado',
        'fila_envio','enviando','enviado','processado','erro','devolvido'
    )) DEFAULT 'rascunho',
    revisado_por UUID REFERENCES users_unified(id) ON DELETE SET NULL,
    revisado_em TIMESTAMPTZ,
    comentario_revisao TEXT,
    protocolo_envio TEXT,
    numero_recibo TEXT,
    data_envio TIMESTAMPTZ,
    data_processamento TIMESTAMPTZ,
    retorno_completo JSONB,
    erros_processamento JSONB,
    tentativas_envio INTEGER DEFAULT 0,
    ultimo_erro TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_esocial_eventos_status ON esocial_eventos(status);
CREATE INDEX IF NOT EXISTS idx_esocial_eventos_codigo ON esocial_eventos(evento_codigo);
CREATE INDEX IF NOT EXISTS idx_esocial_eventos_origem ON esocial_eventos(modulo_origem, entidade_origem_id);
CREATE INDEX IF NOT EXISTS idx_esocial_eventos_cpf ON esocial_eventos(cpf_trabalhador);
CREATE INDEX IF NOT EXISTS idx_esocial_eventos_pendentes ON esocial_eventos(status) WHERE status IN ('pendente_revisao','fila_envio');

-- 3. CERTIFICADOS DIGITAIS
CREATE TABLE IF NOT EXISTS esocial_certificados (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    arquivo_path TEXT NOT NULL,
    senha_criptografada TEXT,
    emissor TEXT,
    valido_ate DATE,
    status TEXT CHECK (status IN ('valido','expirado','revogado')) DEFAULT 'valido',
    ativo BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. CONFIGURAÇÕES
CREATE TABLE IF NOT EXISTS esocial_configuracoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chave TEXT UNIQUE NOT NULL,
    valor JSONB NOT NULL,
    descricao TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_esocial_config_updated_at ON esocial_configuracoes;
CREATE TRIGGER trg_esocial_config_updated_at
    BEFORE UPDATE ON esocial_configuracoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. LOG DE ENVIOS
CREATE TABLE IF NOT EXISTS esocial_envios_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    evento_id UUID REFERENCES esocial_eventos(id) ON DELETE SET NULL,
    acao TEXT NOT NULL CHECK (acao IN ('envio','consulta','retorno','cancelamento','geracao_xml')),
    request_body TEXT,
    response_body TEXT,
    status_code INTEGER,
    sucesso BOOLEAN,
    mensagem_erro TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- CONFIGURAÇÕES PADRÃO
INSERT INTO esocial_configuracoes (chave, valor, descricao) VALUES
('geral', '{"ambiente": "homologacao", "autonomia_envio": false, "consultar_automatico": true}', 'Configurações gerais'),
('webservice', '{"url_homologacao": "https://webserviceshom.envio.esocial.gov.br/servicos/empregador/enviarloteeventos", "url_producao": "https://webservices.producao.esocial.gov.br/servicos/empregador/enviarloteeventos", "timeout_segundos": 60, "tentativas_maximas": 3}', 'Configurações do webservice'),
('notificacoes', '{"notificar_erro": true, "notificar_sucesso": false, "notificar_revisao": true}', 'Notificações do módulo')
ON CONFLICT (chave) DO NOTHING;

-- CATÁLOGO DE EVENTOS (seed inicial)
INSERT INTO esocial_eventos_catalogo (codigo_evento, nome, descricao, grupo, prazo_envio_dias) VALUES
('S-2200', 'Cadastramento Inicial do Trabalhador', 'Registro inicial do vínculo trabalhista', 'cadastramento', 5),
('S-2205', 'Alteração de Dados Cadastrais', 'Alteração dos dados do trabalhador', 'cadastramento', 1),
('S-2206', 'Alteração de Contrato de Trabalho', 'Mudança de salário, cargo, jornada', 'contratual', 1),
('S-2210', 'Comunicação de Acidente de Trabalho', 'Registro de CAT (Comunicação de Acidente de Trabalho)', 'nao_periodico', 1),
('S-2220', 'Monitoramento da Saúde do Trabalhador', 'ASO (Atestado de Saúde Ocupacional)', 'periodico', 1),
('S-2230', 'Afastamento Temporário', 'Licença médica, acidente, maternidade', 'nao_periodico', 1),
('S-2240', 'Condições Ambientais do Trabalho', 'Fatores de risco e exposição', 'periodico', 1),
('S-2298', 'Reintegração', 'Retorno do trabalhador ao emprego', 'nao_periodico', 1),
('S-2299', 'Desligamento', 'Rescisão contratual', 'nao_periodico', 1),
('S-2300', 'Tomador de Serviço', 'Trabalhador temporário/terceirizado', 'cadastramento', 1),
('S-2399', 'Desligamento de Tomador', 'Fim de prestação de serviços', 'nao_periodico', 1),
('S-2400', 'Cadastro de Benefícios Previdenciários', 'Aposentadoria, pensão', 'cadastramento', 1),
('S-3000', 'Exclusão de Eventos', 'Exclusão de eventos enviados incorretamente', 'nao_periodico', 1)
ON CONFLICT (codigo_evento) DO NOTHING;

-- VIEWS
CREATE OR REPLACE VIEW esocial_vw_dashboard AS
SELECT
    (SELECT COUNT(*) FROM esocial_eventos) AS total_eventos,
    (SELECT COUNT(*) FROM esocial_eventos WHERE status = 'pendente_revisao') AS pendentes_revisao,
    (SELECT COUNT(*) FROM esocial_eventos WHERE status = 'fila_envio') AS fila_envio,
    (SELECT COUNT(*) FROM esocial_eventos WHERE status = 'enviado') AS enviados,
    (SELECT COUNT(*) FROM esocial_eventos WHERE status = 'processado') AS processados,
    (SELECT COUNT(*) FROM esocial_eventos WHERE status = 'erro') AS com_erro;

CREATE OR REPLACE VIEW esocial_vw_eventos_pendentes AS
SELECT e.*, ec.nome AS evento_nome, ec.grupo AS evento_grupo
FROM esocial_eventos e
JOIN esocial_eventos_catalogo ec ON e.evento_codigo = ec.codigo_evento
WHERE e.status IN ('pendente_revisao', 'fila_envio')
ORDER BY e.created_at DESC;

-- RLS
ALTER TABLE esocial_eventos_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE esocial_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE esocial_certificados ENABLE ROW LEVEL SECURITY;
ALTER TABLE esocial_configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE esocial_envios_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS esocial_admin_all ON esocial_eventos FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users_unified WHERE id = auth.uid() AND role = 'ADMIN'));

CREATE POLICY IF NOT EXISTS esocial_view_eventos ON esocial_eventos FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM users_unified WHERE id = auth.uid()
        AND (role IN ('ADMIN','MANAGER') OR (access_permissions->'modules'->>'e-social')::boolean = true)));

-- Bucket storage
INSERT INTO storage.buckets (id, name, public) 
SELECT 'esocial-certificados', 'esocial-certificados', false
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'esocial-certificados');
