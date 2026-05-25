# Módulo Gestão de Tripulantes — Manual de Implementação

> **Versão:** 1.0 | **Module Key:** `gestao-tripulantes` | **URL:** `/department/gestao-tripulantes`
> **Admin URL:** `/admin/gestao-tripulantes` | **API Base:** `/api/gestao-tripulantes/`
> **Tabelas Prefixo:** `gt_` | **i18n Namespace:** `gestaoTripulantes`

---

## Sumário

1. [Database Migration](#1-database-migration)
2. [Registro do Módulo](#2-registro-do-módulo)
3. [Permissões (Role + Sector + ACL + Features)](#3-permissões)
4. [Traduções i18n](#4-traduções-i18n)
5. [Sidebar / Menu](#5-sidebar--menu)
6. [Admin Layout](#6-admin-layout)
7. [UserEditor](#7-usereditor)
8. [Estrutura de Diretórios (completa)](#8-estrutura-de-diretórios)
9. [API Routes](#9-api-routes)
10. [Dashboard Matriz (Frontend)](#10-dashboard-matriz)
11. [Modal de Perfil](#11-modal-de-perfil)
12. [Algoritmo de Sugestão de Back](#12-algoritmo-de-sugestão-de-back)
13. [OCR Híbrido](#13-ocr-híbrido)
14. [PoliWeb Scraper](#14-poliweb-scraper)
15. [Notificações de Vencimento](#15-notificações-de-vencimento)
16. [MIO Sync](#16-mio-sync)
17. [Admin Page](#17-admin-page)
18. [IA Tools](#18-ia-tools)
19. [Email Templates](#19-email-templates)
20. [CRUDs Estruturais](#20-cruds-estruturais)
21. [Types](#21-types)

---

## 1. Database Migration

**Arquivo:** `supabase/migrations/YYYYMMDD_HHMMSS_create_gestao_tripulantes.sql`

### 1.1 Tabelas

```sql
-- ============================================
-- MÓDULO GESTÃO DE TRIPULANTES
-- ============================================

-- Função auxiliar para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. CENTROS DE CUSTO
CREATE TABLE gt_centros_custo (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    codigo TEXT UNIQUE,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER trg_gt_centros_custo_updated_at
    BEFORE UPDATE ON gt_centros_custo FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. EMPRESAS
CREATE TABLE gt_empresas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    cnpj TEXT,
    centro_custo_id UUID REFERENCES gt_centros_custo(id) ON DELETE SET NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER trg_gt_empresas_updated_at
    BEFORE UPDATE ON gt_empresas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX idx_gt_empresas_centro_custo ON gt_empresas(centro_custo_id);

-- 3. EMBARCAÇÕES
CREATE TABLE gt_embarcacoes (
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
CREATE TRIGGER trg_gt_embarcacoes_updated_at
    BEFORE UPDATE ON gt_embarcacoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX idx_gt_embarcacoes_empresa ON gt_embarcacoes(empresa_id);

-- 4. CARGOS
CREATE TABLE gt_cargos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    descricao TEXT,
    nivel INTEGER DEFAULT 0,
    ordem_exibicao INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER trg_gt_cargos_updated_at
    BEFORE UPDATE ON gt_cargos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. COLABORADORES (Tabela principal)
CREATE TABLE gt_colaboradores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users_unified(id) ON DELETE SET NULL,
    -- Dados pessoais
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
    -- Endereço
    endereco_logradouro TEXT,
    endereco_numero TEXT,
    endereco_complemento TEXT,
    endereco_bairro TEXT,
    endereco_cidade TEXT,
    endereco_uf TEXT,
    endereco_cep TEXT,
    -- Dados bancários
    dados_bancarios JSONB,
    -- Vínculo
    centro_custo_id UUID REFERENCES gt_centros_custo(id) ON DELETE SET NULL,
    empresa_id UUID REFERENCES gt_empresas(id) ON DELETE SET NULL,
    embarcacao_atual_id UUID REFERENCES gt_embarcacoes(id) ON DELETE SET NULL,
    cargo_id UUID REFERENCES gt_cargos(id) ON DELETE SET NULL,
    data_admissao DATE,
    data_demissao DATE,
    matricula TEXT,
    -- Status
    status_embarque TEXT CHECK (status_embarque IN (
        'embarcado','standby','folga','desembarcado','afastado','ferias','treinamento'
    )) DEFAULT 'desembarcado',
    standby BOOLEAN DEFAULT false,
    data_ultimo_embarque DATE,
    data_ultimo_desembarque DATE,
    data_proximo_embarque DATE,
    -- Origem
    origem TEXT DEFAULT 'local' CHECK (origem IN ('local','mio','importado','manual')),
    mio_id TEXT,
    mio_data JSONB,
    ultimo_sync_mio TIMESTAMPTZ,
    foto_url TEXT,
    -- Soft delete
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER trg_gt_colaboradores_updated_at
    BEFORE UPDATE ON gt_colaboradores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX idx_gt_colab_cpf ON gt_colaboradores(cpf);
CREATE INDEX idx_gt_colab_status ON gt_colaboradores(status_embarque);
CREATE INDEX idx_gt_colab_empresa ON gt_colaboradores(empresa_id);
CREATE INDEX idx_gt_colab_embarcacao ON gt_colaboradores(embarcacao_atual_id);
CREATE INDEX idx_gt_colab_cargo ON gt_colaboradores(cargo_id);
CREATE INDEX idx_gt_colab_centro_custo ON gt_colaboradores(centro_custo_id);
CREATE INDEX idx_gt_colab_user ON gt_colaboradores(user_id);
CREATE INDEX idx_gt_colab_standby ON gt_colaboradores(standby) WHERE standby = true;

-- 6. DOCUMENTOS
CREATE TABLE gt_documentos (
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
    -- Arquivo
    arquivo_url TEXT,
    arquivo_path TEXT,
    arquivo_tamanho_bytes BIGINT,
    arquivo_tipo TEXT,
    -- OCR
    ocr_status TEXT CHECK (ocr_status IN ('pendente','processando','concluido','erro','nao_aplicavel')) DEFAULT 'pendente',
    ocr_texto TEXT,
    ocr_dados_extraidos JSONB,
    ocr_data TIMESTAMPTZ,
    ocr_erro TEXT,
    -- Status
    status_validacao TEXT CHECK (status_validacao IN ('valido','vencendo','vencido','pendente','reprovado','cancelado')) DEFAULT 'pendente',
    notificado_vencimento BOOLEAN DEFAULT false,
    -- Origem
    origem TEXT CHECK (origem IN ('upload','poliweb','mio','manual','ocr')) DEFAULT 'upload',
    origem_ref TEXT,
    -- Revisão (para E-Social)
    status_revisao TEXT CHECK (status_revisao IN ('nao_necessita','pendente_revisao','aprovado','rejeitado')) DEFAULT 'nao_necessita',
    revisado_por UUID REFERENCES users_unified(id) ON DELETE SET NULL,
    revisado_em TIMESTAMPTZ,
    comentario_revisao TEXT,
    -- Delete
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER trg_gt_documentos_updated_at
    BEFORE UPDATE ON gt_documentos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX idx_gt_docs_colaborador ON gt_documentos(colaborador_id);
CREATE INDEX idx_gt_docs_tipo ON gt_documentos(tipo_documento);
CREATE INDEX idx_gt_docs_status ON gt_documentos(status_validacao);
CREATE INDEX idx_gt_docs_validade ON gt_documentos(data_validade);
CREATE INDEX idx_gt_docs_revisao ON gt_documentos(status_revisao) WHERE status_revisao = 'pendente_revisao';
CREATE INDEX idx_gt_docs_colaborador_tipo ON gt_documentos(colaborador_id, tipo_documento);

-- 7. DOCUMENTOS ASO
CREATE TABLE gt_documentos_aso (
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
    -- E-Social (referência ao módulo E-Social)
    esocial_status TEXT CHECK (esocial_status IN ('nao_enviado','pendente','enviado','processado','erro')) DEFAULT 'nao_enviado',
    esocial_evento_id UUID,
    esocial_protocolo TEXT,
    esocial_numero_recibo TEXT,
    esocial_data_envio TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER trg_gt_documentos_aso_updated_at
    BEFORE UPDATE ON gt_documentos_aso FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX idx_gt_aso_colaborador ON gt_documentos_aso(colaborador_id);

-- 8. DOCUMENTOS TREINAMENTO
CREATE TABLE gt_documentos_treinamento (
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
CREATE INDEX idx_gt_trein_colaborador ON gt_documentos_treinamento(colaborador_id);

-- 9. HISTÓRICO DE EMBARQUES
CREATE TABLE gt_historico_embarques (
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
CREATE INDEX idx_gt_emb_colaborador ON gt_historico_embarques(colaborador_id);
CREATE INDEX idx_gt_emb_datas ON gt_historico_embarques(data_embarque, data_desembarque);

-- 10. HISTÓRICO DE SUBSTITUIÇÕES
CREATE TABLE gt_historico_substituicoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    substituto_id UUID REFERENCES gt_colaboradores(id) ON DELETE SET NULL NOT NULL,
    substituido_id UUID REFERENCES gt_colaboradores(id) ON DELETE SET NULL NOT NULL,
    embarque_id UUID REFERENCES gt_historico_embarques(id) ON DELETE SET NULL,
    periodo_inicio DATE NOT NULL,
    periodo_fim DATE,
    cargo_id UUID REFERENCES gt_cargos(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_gt_sub_substituto ON gt_historico_substituicoes(substituto_id);
CREATE INDEX idx_gt_sub_substituido ON gt_historico_substituicoes(substituido_id);

-- 11. LOG DE NOTIFICAÇÕES
CREATE TABLE gt_notificacoes_log (
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
CREATE TABLE gt_cron_log (
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
CREATE TABLE gt_configuracoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chave TEXT UNIQUE NOT NULL,
    valor JSONB NOT NULL,
    descricao TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER trg_gt_config_updated_at
    BEFORE UPDATE ON gt_configuracoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- CONFIGURAÇÕES PADRÃO
-- ============================================
INSERT INTO gt_configuracoes (chave, valor, descricao) VALUES
('geral', '{"modulo_ativo": true, "nome_personalizado": null}', 'Configurações gerais do módulo'),
('mio_integracao', '{"habilitado": true, "escrita_habilitada": false, "auto_sync": true, "intervalo_minutos": 60}', 'Integração com MIO'),
('poliweb', '{"username": "", "password": "", "habilitado": false}', 'Credenciais globais PoliWeb'),
('notificacoes', '{"aso_dias_aviso": [30,15,7], "treinamento_dias_aviso": [30,15], "passaporte_dias_aviso": [60,30], "cnh_dias_aviso": [30,15], "canal_email": true, "canal_push": true, "canal_inapp": true, "enviar_automatico": false}', 'Config. de notificação'),
('ocr', '{"qualidade": "normal", "automatico_upload": true, "fallback_api_url": "", "fallback_api_key": "", "idioma": "por"}', 'Config. de OCR'),
('algoritmo_back', '{"peso_mesmo_centro_custo": 40, "peso_mesma_empresa": 30, "peso_mesma_embarcacao": 25, "peso_mesmo_cargo": 20, "peso_standby": 35, "peso_substituiu_antes": 15, "peso_documentos_validos": 20, "peso_folga_compativel": 5, "peso_senioridade_similar": 10, "limite_resultados": 5, "sugestao_automatica": false}', 'Algoritmo de sugestão de back'),
('autonomia', '{"notificacoes_automaticas": false, "sugestao_back_automatica": false, "scraping_poliweb_automatico": false, "ocr_automatico": true}', 'Toggles de autonomia'),
('dashboard', '{"colunas_visiveis": ["nome","foto","cargo","empresa","embarcacao","status","documentos","proximo_embarque"], "atualizacao_intervalo_segundos": 60}', 'Config. do dashboard');

-- ============================================
-- VIEWS
-- ============================================
CREATE VIEW gt_vw_colaboradores_completo AS
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
    (SELECT jsonb_agg(jsonb_build_object('tipo',d.tipo_documento,'status',d.status_validacao,'validade',d.data_validade,'titulo',d.titulo)) 
     FROM gt_documentos d WHERE d.colaborador_id = c.id AND d.deleted_at IS NULL AND d.status_validacao IN ('vencido','vencendo')
     ORDER BY d.data_validade ASC LIMIT 5) AS proximos_vencimentos,
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

CREATE VIEW gt_vw_dashboard_resumo AS
SELECT
    (SELECT COUNT(*) FROM gt_colaboradores WHERE deleted_at IS NULL) AS total_colaboradores,
    (SELECT COUNT(*) FROM gt_colaboradores WHERE deleted_at IS NULL AND status_embarque = 'embarcado') AS total_embarcados,
    (SELECT COUNT(*) FROM gt_colaboradores WHERE deleted_at IS NULL AND standby = true) AS total_disponiveis,
    (SELECT COUNT(*) FROM gt_documentos WHERE deleted_at IS NULL AND status_validacao = 'vencido') AS total_docs_vencidos,
    (SELECT COUNT(*) FROM gt_documentos WHERE deleted_at IS NULL AND status_validacao = 'vencendo') AS total_docs_vencendo,
    (SELECT COUNT(*) FROM gt_documentos WHERE deleted_at IS NULL AND status_revisao = 'pendente_revisao') AS asos_pendentes_revisao;

-- ============================================
-- RLS
-- ============================================
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

CREATE POLICY gt_all_admin_manager ON gt_colaboradores FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM users_unified WHERE id = auth.uid()
            AND (role IN ('ADMIN','MANAGER')
                OR (access_permissions->'modules'->>'gestao-tripulantes')::boolean = true))
    );
-- Aplicar política similar para todas as tabelas gt_*
```

### 1.2 Bucket Storage

```sql
-- Criar bucket para documentos
INSERT INTO storage.buckets (id, name, public) VALUES ('gestao-tripulantes-documentos', 'gestao-tripulantes-documentos', true);

-- Política de acesso ao bucket
CREATE POLICY "GT Documentos Access" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'gestao-tripulantes-documentos');
```

---

## 2. Registro do Módulo

### `src/config/modules.ts` — Adicionar ao `SYSTEM_MODULES`:

```typescript
{
    key: 'gestao-tripulantes',
    name: 'Gestão de Tripulantes',
    description: 'Gestão inteligente de tripulantes, documentos e escala offshore',
    defaultRoles: ['ADMIN', 'MANAGER'],
    category: 'department'
}
```

### `src/constants/modules.ts` — Adicionar ao `SYSTEM_MODULES`:

```typescript
{
    id: 'gestao-tripulantes',
    label: 'Gestão de Tripulantes',
    description: 'Gestão inteligente de tripulantes e documentos',
    category: 'department',
    href: '/department/gestao-tripulantes',
    visible: true
}
```

---

## 3. Permissões

### `src/lib/permissions.ts` — Em `PermissionFeatures`:

```typescript
'gestao-tripulantes.view'?: boolean;
'gestao-tripulantes.manage'?: boolean;
'gestao-tripulantes.admin'?: boolean;
'gestao-tripulantes.documents.edit'?: boolean;
'gestao-tripulantes.documents.ocr'?: boolean;
'gestao-tripulantes.back.suggest'?: boolean;
'gestao-tripulantes.poliweb.scrape'?: boolean;
'gestao-tripulantes.notifications.manage'?: boolean;
```

### `src/lib/permissions.ts` — Em `DEFAULT_PERMISSIONS_BY_ROLE`:

```typescript
ADMIN: {
    modules: { 'gestao-tripulantes': true },
    features: { 'gestao-tripulantes.view': true, 'gestao-tripulantes.manage': true, 'gestao-tripulantes.admin': true, 'gestao-tripulantes.documents.edit': true, 'gestao-tripulantes.documents.ocr': true, 'gestao-tripulantes.back.suggest': true, 'gestao-tripulantes.poliweb.scrape': true, 'gestao-tripulantes.notifications.manage': true }
},
MANAGER: {
    modules: { 'gestao-tripulantes': true },
    features: { 'gestao-tripulantes.view': true, 'gestao-tripulantes.manage': true, 'gestao-tripulantes.documents.edit': true, 'gestao-tripulantes.back.suggest': true }
},
USER: {
    modules: { 'gestao-tripulantes': false }
}
```

### ACL Seed — `src/app/api/acl/init/route.ts`:

```typescript
{ resource: 'gestao-tripulantes', action: 'view',           description: 'Visualizar dashboard',   level: 0 },
{ resource: 'gestao-tripulantes', action: 'manage',         description: 'Gerenciar tripulantes',  level: 2 },
{ resource: 'gestao-tripulantes', action: 'admin',          description: 'Admin total',             level: 3 },
{ resource: 'gestao-tripulantes', action: 'documents.upload', description: 'Upload documentos',    level: 1 },
{ resource: 'gestao-tripulantes', action: 'documents.ocr',  description: 'Executar OCR',            level: 2 },
{ resource: 'gestao-tripulantes', action: 'back.suggest',   description: 'Sugerir back',            level: 2 },
{ resource: 'gestao-tripulantes', action: 'poliweb.scrape', description: 'Scraping PoliWeb',        level: 3 },
{ resource: 'gestao-tripulantes', action: 'notifications.send', description: 'Enviar notificações', level: 2 },
```

---

## 4. Traduções i18n

### `src/i18n/locales/pt-BR.ts`

```typescript
// No namespace menu:
menu: {
    // ...existing...
    gestaoTripulantes: 'Gestão de Tripulantes',
}

// No namespace modules:
modules: {
    // ...existing...
    'gestao-tripulantes': 'Gestão de Tripulantes',
}

// NOVO namespace dedicado (~200 linhas):
gestaoTripulantes: {
    title: 'Gestão de Tripulantes',
    subtitle: 'Dashboard inteligente de tripulantes e escala offshore',
    dashboard: 'Dashboard',
    colaboradores: 'Colaboradores',
    colaborador: 'Colaborador',
    // Filtros
    filters: {
        search: 'Buscar tripulante...',
        searchLabel: 'Buscar',
        companyLabel: 'Empresa',
        vesselLabel: 'Embarcação',
        positionLabel: 'Cargo',
        costCenterLabel: 'Centro de Custo',
        statusLabel: 'Status',
        allCompanies: 'Todas as Empresas',
        allVessels: 'Todas as Embarcações',
        allPositions: 'Todos os Cargos',
        allStatus: 'Todos os Status',
        allCostCenters: 'Todos os Centros de Custo',
        dateStart: 'Data Início',
        dateEnd: 'Data Fim',
        onlyStandby: 'Apenas Standby',
        onlyVencidos: 'Docs Vencidos',
        empty: 'Nenhum registro encontrado',
    },
    // Tabela
    table: {
        name: 'NOME', photo: 'FOTO', rank: 'CARGO', company: 'EMPRESA',
        vessel: 'EMBARCAÇÃO', status: 'STATUS', documents: 'DOCUMENTOS',
        nextEmbark: 'PRÓX. EMBARQUE', qtdEmbarc: 'QTD', actions: 'AÇÕES',
    },
    // Legendas
    legend: {
        onboard: 'Embarcado', standby: 'StandBy', off: 'Folga',
        crewChange: 'Troca de Turma', indemnifiedLeave: 'Folga Indenizada',
        doubleRotation: 'Dobra', training: 'Treinamento', onLeave: 'Afastado',
    },
    // Status colaborador
    status: {
        embarcado: 'Embarcado', standby: 'StandBy', folga: 'Folga',
        desembarcado: 'Desembarcado', afastado: 'Afastado',
        ferias: 'Férias', treinamento: 'Treinamento',
    },
    // Perfil (7 abas)
    profile: {
        title: 'Perfil do Colaborador', personalData: 'Dados Pessoais',
        trainings: 'Treinamentos', aso: 'ASO', passports: 'Passaportes',
        documents: 'Documentos', embarkations: 'Histórico de Embarques',
        substitutions: 'Substituições', close: 'Fechar', edit: 'Editar',
        save: 'Salvar', cancel: 'Cancelar', suggestBack: 'Sugerir Back',
        uploadDocument: 'Upload Documento', notify: 'Notificar',
        loading: 'Carregando perfil...', notFound: 'Colaborador não encontrado',
    },
    // Dados Pessoais
    personalData: {
        fullName: 'Nome Completo', cpf: 'CPF', rg: 'RG', birthDate: 'Data de Nascimento',
        email: 'Email', phone: 'Telefone', nationality: 'Nacionalidade',
        birthplace: 'Naturalidade', motherName: 'Nome da Mãe', fatherName: 'Nome do Pai',
        maritalStatus: 'Estado Civil', address: 'Endereço', bankData: 'Dados Bancários',
        company: 'Empresa', costCenter: 'Centro de Custo', vessel: 'Embarcação',
        position: 'Cargo', admissionDate: 'Data de Admissão', resignationDate: 'Data de Demissão',
        registrationNumber: 'Matrícula',
    },
    // Treinamentos
    trainings: {
        title: 'Treinamentos', courseName: 'Nome do Curso', institution: 'Instituição',
        date: 'Data de Realização', validity: 'Validade', workload: 'Carga Horária',
        status: 'Status', certificate: 'Certificado', uploadCertificate: 'Upload Certificado',
        noTrainings: 'Nenhum treinamento cadastrado',
    },
    // ASO
    aso: {
        title: 'ASO', examType: 'Tipo de Exame', admission: 'Admissional',
        periodic: 'Periódico', dismissal: 'Demissional',
        returnToWork: 'Retorno ao Trabalho', functionChange: 'Mudança de Função',
        examDate: 'Data de Realização', validity: 'Validade', result: 'Resultado',
        fit: 'Apto', unfit: 'Inapto', conditionalFit: 'Apto Condicional',
        doctor: 'Médico', clinic: 'Clínica', pdf: 'Download PDF',
        uploadAso: 'Upload ASO', sendESocial: 'Enviar para E-Social',
        eSocialStatus: 'Status E-Social', pendingReview: 'Pendente Revisão',
        reviewed: 'Revisado', noAso: 'Nenhum ASO cadastrado',
    },
    // Passaportes
    passports: {
        title: 'Passaportes', number: 'Número', country: 'País',
        issueDate: 'Data de Emissão', expiryDate: 'Data de Validade',
        scan: 'Scan do Passaporte', uploadPassport: 'Upload Passaporte',
        noPassports: 'Nenhum passaporte cadastrado',
    },
    // Documentos (geral)
    documents: {
        title: 'Documentos', type: 'Tipo', title_label: 'Título', number: 'Número',
        issueDate: 'Emissão', expiryDate: 'Validade', status: 'Status',
        ocr: 'OCR', uploadDate: 'Upload', download: 'Download', delete: 'Excluir',
        uploadDocument: 'Upload Documento', confirmDelete: 'Confirmar exclusão?',
        dragAndDrop: 'Arraste arquivos ou clique para selecionar',
        acceptedFormats: 'Formatos aceitos: PDF, PNG, JPG',
    },
    // Status documentos
    documentStatus: {
        valid: 'Válido', expiring: 'Vencendo', expired: 'Vencido',
        pending: 'Pendente', disapproved: 'Reprovado', cancelled: 'Cancelado',
        daysRemaining: '{{days}} dias restantes', expiredDays: 'Vencido há {{days}} dias',
    },
    // OCR
    ocr: {
        processing: 'Processando OCR...', completed: 'OCR Concluído',
        error: 'Erro no OCR', notApplicable: 'N/A', extractedData: 'Dados Extraídos',
        runOcr: 'Executar OCR', confidence: 'Confiança: {{percent}}%',
    },
    // Embarques
    embarkations: {
        title: 'Histórico de Embarques', embarkDate: 'Embarque',
        disembarkDate: 'Desembarque', predictedDisembark: 'Prev. Desemb.',
        vessel: 'Embarcação', type: 'Tipo', location: 'Local',
        flight: 'Voo', substitution: 'Substituindo',
        registerNew: 'Registrar Embarque', noHistory: 'Nenhum histórico de embarque',
        types: {
            normal: 'Normal', dobra: 'Dobra', folgaIndenizada: 'Folga Indenizada',
            standby: 'StandBy', substituicao: 'Substituição', treinamento: 'Treinamento',
        },
    },
    // Substituições
    substitutions: {
        title: 'Histórico de Substituições', substituted: 'Substituiu',
        substitutedBy: 'Foi Substituído por', period: 'Período',
        position: 'Cargo', noSubstitutions: 'Nenhum histórico de substituições',
    },
    // Sugestão de Back
    back: {
        title: 'Sugestão de Substituto', subtitle: 'Melhores candidatos para substituir {{name}}',
        noCandidates: 'Nenhum candidato encontrado', score: 'Pontuação',
        justification: 'Justificativas', substituteNow: 'Substituir Agora',
        loading: 'Calculando melhores opções...',
        criteria: {
            sameCostCenter: 'Mesmo centro de custo', sameCompany: 'Mesma empresa',
            sameVessel: 'Mesma embarcação', samePosition: 'Mesmo cargo',
            standby: 'Em standby', substitutedBefore: 'Já substituiu este colaborador antes',
            similarPosition: 'Já atuou neste cargo', compatibleLeave: 'Folga compatível',
            similarSeniority: 'Senioridade similar', validDocuments: 'Documentos válidos',
        },
    },
    // Notificações
    notifications: {
        title: 'Central de Notificações', sendNotification: 'Enviar Notificação',
        type: 'Tipo', message: 'Mensagem', sendTo: 'Enviar para',
        collaborator: 'Colaborador', allStandby: 'Todos em Standby',
        custom: 'Personalizado', sent: 'Notificação enviada com sucesso',
        sendError: 'Erro ao enviar notificação', history: 'Histórico de Notificações',
    },
    // Dashboard cards
    dashboard: {
        totalCollaborators: 'Total de Tripulantes', onboardNow: 'Embarcados Agora',
        availableBackup: 'Disponíveis p/ Back', expiredDocs: 'Documentos Vencidos',
    },
    // Upload
    upload: {
        uploading: 'Enviando...', success: 'Arquivo enviado com sucesso',
        error: 'Erro no upload', tooLarge: 'Arquivo muito grande (máx 20MB)',
        invalidType: 'Tipo de arquivo não permitido',
    },
    // Comuns
    common: {
        exportXLSX: 'Exportar Planilha (XLSX)', refresh: 'Atualizar',
        loading: 'Carregando...', save: 'Salvar', cancel: 'Cancelar',
        confirm: 'Confirmar', delete: 'Excluir', edit: 'Editar',
        create: 'Novo', search: 'Buscar', clear: 'Limpar',
        noResults: 'Nenhum registro encontrado', exportedSuccess: 'Exportado com sucesso!',
    },
    // Erros
    errors: {
        notFound: 'Página não encontrada', unauthorized: 'Sem permissão',
        loadError: 'Erro ao carregar dados', saveError: 'Erro ao salvar',
        deleteError: 'Erro ao excluir', networkError: 'Erro de rede',
    },
}
```

### `src/i18n/locales/en-US.ts` — Mesma estrutura, traduzida para inglês:

```typescript
menu: { gestaoTripulantes: 'Crew Management' }
modules: { 'gestao-tripulantes': 'Crew Management' }
gestaoTripulantes: {
    title: 'Crew Management',
    subtitle: 'Intelligent crew management dashboard',
    // ... mesma estrutura do pt-BR com valores em inglês
}
```

---

## 5. Sidebar

### `src/data/menu.ts`

```typescript
{
    id: 'gestao-tripulantes',
    title: t('menu.gestaoTripulantes') || 'Gestão de Tripulantes',
    href: '/department/gestao-tripulantes',
    icon: FiUsers,
    moduleKey: 'gestao-tripulantes',
    enabled: true,
    order: 13,
}
```

> **Nota:** Import `import { FiUsers } from 'react-icons/fi'` no topo se não existir.

---

## 6. Admin Layout

### `src/app/admin/layout.tsx` — Adicionar link:

```tsx
// Na categoria apropriada:
<NavLink href="/admin/gestao-tripulantes" icon={FiUsers}>
    Gestão de Tripulantes
</NavLink>
```

---

## 7. UserEditor

### `src/components/admin/UserEditor.tsx`

```typescript
// Em defaultPermissions de cada role:
ADMIN: { 'gestao-tripulantes': true }
MANAGER: { 'gestao-tripulantes': true }
USER: { 'gestao-tripulantes': false }
```

---

## 8. Estrutura de Diretórios

```
src/
├── app/
│   ├── api/gestao-tripulantes/
│   │   ├── route.ts                              # GET - health check
│   │   ├── dashboard/route.ts                     # GET - dados da matriz
│   │   ├── colaboradores/
│   │   │   ├── route.ts                          # GET (list) + POST (create)
│   │   │   └── [id]/
│   │   │       ├── route.ts                      # GET + PUT + DELETE
│   │   │       ├── documentos/route.ts            # GET + POST docs
│   │   │       ├── embarques/route.ts             # GET + POST embarques
│   │   │       └── sugerir-back/route.ts          # POST - algoritmo
│   │   ├── centros-custo/route.ts + [id]/route.ts
│   │   ├── empresas/route.ts + [id]/route.ts
│   │   ├── embarcacoes/route.ts + [id]/route.ts
│   │   ├── cargos/route.ts + [id]/route.ts
│   │   ├── documentos/
│   │   │   ├── route.ts                          # GET + POST
│   │   │   ├── upload/route.ts                   # POST + FormData
│   │   │   └── [id]/
│   │   │       ├── route.ts                      # GET + PUT + DELETE
│   │   │       └── ocr/route.ts                  # POST - OCR
│   │   ├── poliweb/
│   │   │   ├── route.ts                          # POST - test/scrape
│   │   │   ├── asos-pendentes/route.ts            # GET
│   │   │   └── revisar/[id]/route.ts             # PUT - aprovar/rejeitar
│   │   ├── sugestao-back/route.ts                 # POST - algoritmo geral
│   │   ├── notificar/route.ts                     # POST - disparar notif
│   │   ├── configuracoes/route.ts                 # GET + PUT
│   │   └── cron/
│   │       ├── poliweb-scraper/route.ts            # POST (9h/18h)
│   │       ├── verificar-vencimentos/route.ts      # POST (diário)
│   │       └── sync-mio/route.ts                  # POST (1h)
│   │
│   ├── department/gestao-tripulantes/
│   │   ├── layout.tsx
│   │   ├── page.tsx                              # Dashboard matriz
│   │   └── admin/
│   │       ├── page.tsx
│   │       ├── centros-custo/page.tsx
│   │       ├── empresas/page.tsx
│   │       ├── embarcacoes/page.tsx
│   │       ├── cargos/page.tsx
│   │       └── revisao-aso/page.tsx
│   │
│   └── admin/gestao-tripulantes/page.tsx         # Configuração admin
│
├── components/gestao-tripulantes/
│   ├── GTMatrix.tsx                               # Matriz/Gantt
│   ├── GTMatrixFilters.tsx                        # Filtros
│   ├── GTMatrixLegend.tsx                         # Legenda
│   ├── GTMatrixExport.tsx                         # Export XLSX
│   ├── DashboardCards.tsx                         # Cards resumo
│   ├── CollaboratorModal.tsx                      # Modal perfil
│   ├── SugestaoBackModal.tsx                      # Modal sugestão back
│   ├── DocumentUploader.tsx                       # Upload drag-drop
│   ├── AsoReviewPanel.tsx                         # Revisão ASO
│   ├── tabs/
│   │   ├── DadosPessoaisTab.tsx
│   │   ├── TreinamentosTab.tsx
│   │   ├── ASOTab.tsx
│   │   ├── PassaportesTab.tsx
│   │   ├── DocumentosTab.tsx
│   │   ├── HistoricoEmbarquesTab.tsx
│   │   └── SubstituicoesTab.tsx
│   └── admin/
│       ├── ConfiguracaoGeral.tsx
│       ├── ConfiguracaoMIO.tsx
│       ├── ConfiguracaoPoliWeb.tsx
│       ├── ConfiguracaoNotificacoes.tsx
│       ├── ConfiguracaoOCR.tsx
│       ├── ConfiguracaoAlgoritmo.tsx
│       ├── ConfiguracaoAutonomia.tsx
│       └── ConfiguracaoDashboard.tsx
│
├── lib/gestao-tripulantes/
│   ├── dashboard-service.ts
│   ├── colaborador-service.ts
│   ├── documento-service.ts
│   ├── algoritmo-back.ts          # Algoritmo de sugestão
│   ├── poliweb-scraper.ts         # Scraper PoliWeb
│   ├── ocr-processor.ts           # OCR Tesseract + fallback
│   ├── notificacoes.ts            # Notificações de vencimento
│   ├── mio-sync.ts                # Sync com MIO
│   └── config-service.ts
│
├── types/gestao-tripulantes.ts
└── services/gestaoTripulantesService.ts
```

---

## 9. API Routes

Todas as API routes seguem o padrão abaixo. Incluindo as principais:

### 9.1 Auth Helper (usado em todas as routes)

```typescript
// Helper: extrair e verificar token
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';

function getUserId(request: NextRequest): string | null {
    const token = extractTokenFromHeader(request.headers.get('authorization') || '')
        || request.cookies.get('token')?.value;
    if (!token) return null;
    const payload = verifyToken(token);
    return payload?.userId || null;
}
```

### 9.2 Resumo de Todos os Endpoints

| Método | Rota | Função |
|--------|------|--------|
| GET | `/api/gestao-tripulantes` | Health check do módulo |
| GET | `/api/gestao-tripulantes/dashboard` | Dados da matriz (cores, status) |
| GET | `/api/gestao-tripulantes/colaboradores` | Lista colaboradores (filtros, paginação) |
| POST | `/api/gestao-tripulantes/colaboradores` | Criar colaborador |
| GET | `/api/gestao-tripulantes/colaboradores/[id]` | Dados completos (docs, embarques, subs) |
| PUT | `/api/gestao-tripulantes/colaboradores/[id]` | Atualizar colaborador |
| DELETE | `/api/gestao-tripulantes/colaboradores/[id]` | Soft delete |
| GET | `/api/gestao-tripulantes/colaboradores/[id]/documentos` | Documentos do colaborador |
| POST | `/api/gestao-tripulantes/colaboradores/[id]/documentos` | Adicionar documento |
| GET | `/api/gestao-tripulantes/colaboradores/[id]/embarques` | Histórico de embarques |
| POST | `/api/gestao-tripulantes/colaboradores/[id]/embarques` | Registrar embarque |
| POST | `/api/gestao-tripulantes/colaboradores/[id]/sugerir-back` | Sugerir back p/ este colaborador |
| GET/POST/DELETE | `/api/gestao-tripulantes/centros-custo` | CRUD centros de custo |
| GET/POST/DELETE | `/api/gestao-tripulantes/empresas` | CRUD empresas |
| GET/POST/DELETE | `/api/gestao-tripulantes/embarcacoes` | CRUD embarcações |
| GET/POST/DELETE | `/api/gestao-tripulantes/cargos` | CRUD cargos |
| POST | `/api/gestao-tripulantes/documentos/upload` | Upload file + OCR automático |
| GET/PUT/DELETE | `/api/gestao-tripulantes/documentos/[id]` | CRUD documento |
| POST | `/api/gestao-tripulantes/documentos/[id]/ocr` | Executar OCR manual |
| POST | `/api/gestao-tripulantes/poliweb` | Testar/scrape PoliWeb |
| GET | `/api/gestao-tripulantes/poliweb/asos-pendentes` | ASOs p/ revisão |
| PUT | `/api/gestao-tripulantes/poliweb/revisar/[id]` | Aprovar/rejeitar ASO |
| POST | `/api/gestao-tripulantes/sugestao-back` | Algoritmo geral |
| POST | `/api/gestao-tripulantes/notificar` | Disparar notificação |
| GET/PUT | `/api/gestao-tripulantes/configuracoes` | Configurações |
| POST | `/api/gestao-tripulantes/cron/poliweb-scraper` | Cron 9h/18h |
| POST | `/api/gestao-tripulantes/cron/verificar-vencimentos` | Cron diário |
| POST | `/api/gestao-tripulantes/cron/sync-mio` | Sync MIO |

---

## 10. Dashboard Matriz

### `src/app/department/gestao-tripulantes/layout.tsx`

```typescript
import MainLayout from '@/components/Layout/MainLayout';
export default function Layout({ children }: { children: React.ReactNode }) {
    return <MainLayout>{children}</MainLayout>;
}
```

### `src/app/department/gestao-tripulantes/page.tsx` — Estrutura principal

```typescript
'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import DashboardCards from '@/components/gestao-tripulantes/DashboardCards';
import GTMatrixFilters from '@/components/gestao-tripulantes/GTMatrixFilters';
import GTMatrix from '@/components/gestao-tripulantes/GTMatrix';
import CollaboratorModal from '@/components/gestao-tripulantes/CollaboratorModal';

export default function GestaoTripulantesPage() {
    const { t } = useI18n();
    const [data, setData] = useState<any[]>([]);
    const [meta, setMeta] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ search: '', company: '', vessel: '', position: '', costCenter: '', status: '', onlyStandby: false, onlyVencidos: false });
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/gestao-tripulantes/dashboard');
            const json = await res.json();
            if (json.success) { setData(json.data); setMeta(json.meta); }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    return (
        <div className="p-4 md:p-6 min-h-screen bg-gray-50/50">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">{t('gestaoTripulantes.title')}</h1>
                <p className="text-gray-500 text-sm mt-1">{t('gestaoTripulantes.subtitle')}</p>
            </div>
            <DashboardCards data={data} loading={loading} />
            <GTMatrixFilters filters={filters} onChange={setFilters} meta={meta} />
            <GTMatrix data={data} filters={filters} loading={loading}
                onCollaboratorClick={(c: any) => { setSelectedId(c.id); setModalOpen(true); }}
                onRefresh={fetchData} />
            {modalOpen && selectedId &&
                <CollaboratorModal collaboratorId={selectedId} onClose={() => { setModalOpen(false); setSelectedId(null); }} />}
        </div>
    );
}
```

### `GTMatrix.tsx` — Componente Principal da Matriz

Características:
- Lista de colaboradores com foto, nome, cargo, empresa, embarcação, status
- Badge STB para standby
- Indicador de docs vencidos (ícone vermelho)
- Agrupamento por cargo
- Células coloridas por status (verde=embarcado, laranja=standby, azul=folga, vermelho=afastado)
- Ao clicar no colaborador, abre modal de perfil
- Botão "Sugerir Back" por linha
- Toolbar com: legenda, export XLSX, refresh
- Filtragem local por todos os critérios

### `GTMatrixExport.tsx`

```typescript
// Reutiliza lógica de xlsx-js-style (como no ManSchedule)
// Lê a tabela, aplica cores e formatação, baixa como .xlsx
```

---

## 11. Modal de Perfil

### `CollaboratorModal.tsx`

- Overlay fullscreen com backdrop blur
- Animação Framer Motion (scale + opacity)
- 7 abas via tabs horizontais
- Carrega dados de `GET /api/gestao-tripulantes/colaboradores/[id]`
- Cada aba é um componente separado
- Botão "Sugerir Back" no header
- Botão "Upload Documento" no header
- Botão "Notificar" no header (abre modal de envio)

### Abas:

1. **DadosPessoaisTab** — Exibe todos os campos do colaborador (edição futura via PUT)
2. **TreinamentosTab** — Lista de treinamentos com status de validade, upload de certificado
3. **ASOTab** — Lista de ASOs com tipo, resultado, validade, botão "Enviar E-Social", upload
4. **PassaportesTab** — Lista de passaportes com número, validade, país, upload scan
5. **DocumentosTab** — Grid de todos documentos com tipo, status, OCR status, download, upload
6. **HistoricoEmbarquesTab** — Timeline de embarques com tipo, datas, embarcação
7. **SubstituicoesTab** — Histórico de quem substituiu/quem foi substituído

---

## 12. Algoritmo de Sugestão de Back

### `src/lib/gestao-tripulantes/algoritmo-back.ts`

```typescript
import { createRouteClient } from '@/lib/supabase';

interface SugestaoBackParams {
    colaborador_embarcado_id: string;
    data_inicio: string;
    limite?: number;
}

interface SugestaoBackResult {
    colaborador: { id: string; nome_completo: string; cpf: string; cargo_nome: string; empresa_nome: string; embarcacao_nome: string; status_embarque: string; standby: boolean; avatar: string | null; };
    pontuacao: number;
    pontuacao_maxima: number;
    justificativas: string[];
}

export async function sugerirBack(params: SugestaoBackParams): Promise<SugestaoBackResult[]> {
    const supabase = createRouteClient();
    const limite = params.limite || 5;

    // Buscar config
    const { data: cfg } = await supabase.from('gt_configuracoes').select('valor').eq('chave', 'algoritmo_back').single();
    const pesos = (cfg?.valor as any) || {};

    // Buscar colaborador embarcado
    const { data: colaborador } = await supabase.from('gt_vw_colaboradores_completo').select('*').eq('id', params.colaborador_embarcado_id).single();
    if (!colaborador) return [];

    // Buscar candidatos (standby, folga, desembarcado, não deletados)
    const { data: candidatos } = await supabase.from('gt_vw_colaboradores_completo')
        .select('*').is('deleted_at', null).neq('id', params.colaborador_embarcado_id)
        .in('status_embarque', ['standby', 'folga', 'desembarcado'])
        .order('standby', { ascending: false }).limit(50);

    if (!candidatos?.length) return [];

    // Buscar substituições anteriores
    const { data: subs } = await supabase.from('gt_historico_substituicoes').select('*').eq('substituido_id', params.colaborador_embarcado_id);
    const subCount: Record<string, number> = {};
    for (const s of subs || []) subCount[s.substituto_id] = (subCount[s.substituto_id] || 0) + 1;

    // Buscar substituições por cargo
    const { data: subsCargo } = await supabase.from('gt_historico_substituicoes').select('substituto_id').eq('cargo_id', colaborador.cargo_id);
    const subCargoCount: Record<string, number> = {};
    for (const s of subsCargo || []) subCargoCount[s.substituto_id] = (subCargoCount[s.substituto_id] || 0) + 1;

    // Calcular pontuação máxima teórica
    const pontuacaoMaxima =
        (pesos.peso_mesmo_centro_custo || 40) + (pesos.peso_mesma_empresa || 30) +
        (pesos.peso_mesma_embarcacao || 25) + (pesos.peso_mesmo_cargo || 20) +
        (pesos.peso_standby || 35) + (pesos.peso_substituiu_antes || 15) +
        (pesos.peso_documentos_validos || 20) + (pesos.peso_folga_compativel || 5) +
        (pesos.peso_senioridade_similar || 10);

    const resultados: SugestaoBackResult[] = candidatos.map(c => {
        let pts = 0;
        const j: string[] = [];
        if (c.centro_custo_id === colaborador.centro_custo_id) { pts += (pesos.peso_mesmo_centro_custo || 40); j.push('Mesmo centro de custo'); }
        if (c.empresa_id === colaborador.empresa_id) { pts += (pesos.peso_mesma_empresa || 30); j.push('Mesma empresa'); }
        if (c.embarcacao_atual_id === colaborador.embarcacao_atual_id) { pts += (pesos.peso_mesma_embarcacao || 25); j.push('Mesma embarcação'); }
        if (c.cargo_id === colaborador.cargo_id) { pts += (pesos.peso_mesmo_cargo || 20); j.push('Mesmo cargo'); }
        if (c.standby) { pts += (pesos.peso_standby || 35); j.push('Em standby'); }
        if (subCount[c.id]) { pts += (subCount[c.id] * (pesos.peso_substituiu_antes || 15)); j.push(`Já substituiu ${subCount[c.id]}x`); }
        if (subCargoCount[c.id]) { pts += (pesos.peso_substituiu_antes || 15); j.push('Já atuou neste cargo'); }
        if (c.qtd_docs_vencidos === 0) { pts += (pesos.peso_documentos_validos || 20); j.push('Documentos válidos'); }
        if (Math.abs((c.cargo_nivel || 0) - (colaborador.cargo_nivel || 0)) <= 1) { pts += (pesos.peso_senioridade_similar || 10); j.push('Senioridade similar'); }
        return { colaborador: { id: c.id, nome_completo: c.nome_completo, cpf: c.cpf, cargo_nome: c.cargo_nome, empresa_nome: c.empresa_nome, embarcacao_nome: c.embarcacao_nome, status_embarque: c.status_embarque, standby: c.standby, avatar: c.avatar }, pontuacao: pts, pontuacao_maxima: pontuacaoMaxima, justificativas: j };
    });

    return resultados.sort((a, b) => b.pontuacao - a.pontuacao).slice(0, limite);
}
```

---

## 13. OCR Híbrido

### `src/lib/gestao-tripulantes/ocr-processor.ts`

```typescript
import { createRouteClient } from '@/lib/supabase';

interface OCRResult {
    texto: string;
    dadosExtraidos: Record<string, any> | null;
    confianca: number;
}

export async function processarDocumentoOCR(arquivoUrl: string, tipoDocumento: string): Promise<OCRResult> {
    // 1. Baixar o arquivo
    const response = await fetch(arquivoUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    // 2. Tentar Tesseract.js primeiro
    try {
        const Tesseract = await import('tesseract.js');
        const { data } = await Tesseract.recognize(buffer, 'por', {
            logger: () => {} // silent
        });
        
        const texto = data.text;
        const confianca = data.confidence;

        // 3. Extrair dados estruturados baseado no tipo
        const dadosExtraidos = extrairDadosPorTipo(texto, tipoDocumento);

        return { texto, dadosExtraidos, confianca };
    } catch (tesseractError) {
        // 4. Fallback para API externa (se configurada)
        const supabase = createRouteClient();
        const { data: config } = await supabase.from('gt_configuracoes').select('valor').eq('chave', 'ocr').single();
        const ocrConfig = config?.valor as any;

        if (ocrConfig?.fallback_api_url) {
            try {
                const fallbackRes = await fetch(ocrConfig.fallback_api_url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ocrConfig.fallback_api_key}` },
                    body: JSON.stringify({ image: buffer.toString('base64'), language: ocrConfig.idioma || 'por' })
                });
                const fallbackData = await fallbackRes.json();
                const texto = fallbackData.text || fallbackData.textos?.join('\n') || '';
                const dadosExtraidos = extrairDadosPorTipo(texto, tipoDocumento);
                return { texto, dadosExtraidos, confianca: 85 };
            } catch (fallbackError) {
                throw new Error(`OCR falhou: Tesseract e fallback API não funcionaram`);
            }
        }

        throw new Error(`OCR falhou: ${(tesseractError as any).message}`);
    }
}

function extrairDadosPorTipo(texto: string, tipo: string): Record<string, any> | null {
    if (tipo === 'aso') return extrairASO(texto);
    if (tipo === 'passaporte') return extrairPassaporte(texto);
    if (tipo === 'treinamento') return extrairTreinamento(texto);
    return null;
}

function extrairASO(texto: string): Record<string, any> {
    // Regex patterns para campos comuns de ASO
    const patterns = {
        tipo_exame: /(admissional|peri[oó]dico|demissional|retorno|mudança de funç[ãa]o)/i,
        resultado: /(apto|inapto|apto\s*condicional)/i,
        data_realizacao: /(\d{2}\/\d{2}\/\d{4})/,
        medico_nome: /m[eé]dico:\s*([^\n]+)/i,
        medico_crm: /CRM[:\s]*([\d\s\.\-]+)/i,
        nome_clinica: /cl[ií]nica[:\s]*([^\n]+)/i,
        cpf: /CPF[:\s]*([\d\.\-]+)/i,
    } as Record<string, RegExp>;

    const dados: Record<string, string> = {};
    for (const [key, regex] of Object.entries(patterns)) {
        const match = texto.match(regex);
        if (match) dados[key] = match[1]?.trim() || match[0];
    }
    return dados;
}

function extrairPassaporte(texto: string): Record<string, any> {
    const patterns = {
        numero: /(passaporte|passport)[:\s]*([A-Z0-9]+)/i,
        validade: /(validade|expiry)[:\s]*(\d{2}\/\d{2}\/\d{4})/i,
        pais: /(país|country|nationality)[:\s]*([^\n]+)/i,
    };
    const dados: Record<string, string> = {};
    for (const [key, regex] of Object.entries(patterns)) {
        const match = texto.match(regex);
        if (match) dados[key] = match[match.length - 1]?.trim();
    }
    return dados;
}

function extrairTreinamento(texto: string): Record<string, any> {
    const patterns = {
        nome_curso: /(curso|training|course)[:\s]*([^\n]+)/i,
        instituicao: /(instituiç[ãa]o|institution|school)[:\s]*([^\n]+)/i,
        validade: /(validade|valid|expiry)[:\s]*(\d{2}\/\d{2}\/\d{4})/i,
        carga_horaria: /(carga hor[áa]ria|hours|workload)[:\s]*(\d+)/i,
    };
    const dados: Record<string, string> = {};
    for (const [key, regex] of Object.entries(patterns)) {
        const match = texto.match(regex);
        if (match) dados[key] = match[match.length - 1]?.trim();
    }
    return dados;
}
```

---

## 14. PoliWeb Scraper

### `src/lib/gestao-tripulantes/poliweb-scraper.ts`

```typescript
export class PoliwebScraper {
    private baseUrl = 'https://poliweb.com.br'; // Ajustar conforme necessário
    private session: any = null;

    async login(username: string, password: string): Promise<any> {
        // Reutilizar lógica existente de src/app/api/poliweb/login.ts
        const res = await fetch(`${this.baseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ email: username, password })
        });
        const cookies = res.headers.get('set-cookie');
        this.session = cookies;
        return { cookies };
    }

    async buscarASOs(session: any): Promise<any[]> {
        // Navegar pela página de exames e extrair ASOs
        const res = await fetch(`${this.baseUrl}/exames`, {
            headers: { 'Cookie': session.cookies }
        });
        const html = await res.text();
        // Parsear HTML para extrair exames
        // Retornar array de { id, cpf, tipo, data_realizacao, data_validade, resultado, medico, clinica }
        return [];
    }

    async verificarExamesNovos(session: any): Promise<any[]> {
        const todos = await this.buscarASOs(session);
        // Filtrar apenas exames novos desde a última verificação
        return todos;
    }

    async baixarPDF(session: any, exameId: string): Promise<Buffer> {
        const res = await fetch(`${this.baseUrl}/exames/${exameId}/pdf`, {
            headers: { 'Cookie': session.cookies }
        });
        return Buffer.from(await res.arrayBuffer());
    }
}
```

> **Nota:** A implementação real do scraper depende da estrutura exata do site da PoliWeb. Recomenda-se usar `cheerio` para parsing HTML ou `puppeteer` se houver JS pesado.

---

## 15. Notificações de Vencimento

### `src/lib/gestao-tripulantes/notificacoes.ts`

```typescript
import { createRouteClient } from '@/lib/supabase';
import { sendGlobalNotification } from '@/lib/global-notifications';
import { sendEmail } from '@/lib/email';

export async function verificarVencimentos() {
    const supabase = createRouteClient();
    let processados = 0;
    let erros = 0;

    // Buscar config de notificações
    const { data: cfg } = await supabase.from('gt_configuracoes').select('valor').eq('chave', 'notificacoes').single();
    const config = (cfg?.valor as any) || {};
    const diasAviso = config.aso_dias_aviso || [30, 15, 7];

    // Buscar docs vencendo
    const { data: docs } = await supabase
        .from('gt_vw_documentos_vencendo')
        .select('*');

    if (!docs) return { processados: 0, erros: 0 };

    for (const doc of docs) {
        try {
            if (!doc.colaborador_user_id) continue;
            const diasRestantes = Math.ceil((new Date(doc.data_validade).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            const urgencia = diasRestantes <= 7 ? 'urgent' : diasRestantes <= 15 ? 'warning' : 'info';

            // Verificar se já notificou
            if (doc.notificado_vencimento && diasRestantes > 7) continue;

            // Enviar in-app notification
            await sendGlobalNotification(doc.colaborador_user_id, {
                type: 'gestao_tripulantes',
                title: `${doc.tipo_documento.toUpperCase()} - ${diasRestantes <= 0 ? 'VENCIDO' : `Vence em ${diasRestantes} dias`}`,
                message: `${doc.titulo} - Validade: ${doc.data_validade}`,
                data: { modulo: 'gestao-tripulantes', documento_id: doc.id },
            });

            // Enviar email
            if (config.canal_email !== false && doc.colaborador_email) {
                await sendEmail({
                    to: doc.colaborador_email,
                    subject: `[ABZ] Documento vencendo: ${doc.titulo}`,
                    html: `<p>Olá ${doc.colaborador_nome},</p><p>O documento <strong>${doc.titulo}</strong> vence em ${diasRestantes} dias (${doc.data_validade}).</p>`,
                });
            }

            // Marcar como notificado
            await supabase.from('gt_documentos').update({ notificado_vencimento: true }).eq('id', doc.id);
            processados++;
        } catch (err) {
            erros++;
        }
    }

    return { processados, erros };
}
```

---

## 16. MIO Sync

### `src/lib/gestao-tripulantes/mio-sync.ts`

```typescript
import { createRouteClient } from '@/lib/supabase';
import { mioClient } from '@/lib/mio/client';

export async function syncFromMIO() {
    const supabase = createRouteClient();
    const result = { processados: 0, erros: 0, total: 0 };

    try {
        // Verificar se MIO está habilitado
        const { data: cfg } = await supabase.from('gt_configuracoes').select('valor').eq('chave', 'mio_integracao').single();
        const mioConfig = (cfg?.valor as any) || {};
        if (!mioConfig.habilitado) return { ...result, message: 'MIO desabilitado' };

        // Log início
        const { data: logEntry } = await supabase.from('gt_cron_log').insert({
            tipo: 'sync_mio', status: 'executando',
        }).select().single();

        // Buscar integrantes do MIO
        const integrantes = await mioClient.getIntegrantes();
        result.total = integrantes.length;

        for (const integ of integrantes) {
            try {
                const cpf = integ.cpf?.replace(/\D/g, '');
                if (!cpf) continue;

                // Verificar se já existe
                const { data: existente } = await supabase
                    .from('gt_colaboradores')
                    .select('id')
                    .eq('cpf', cpf)
                    .is('deleted_at', null)
                    .maybeSingle();

                if (existente) {
                    // Atualizar existente
                    await supabase.from('gt_colaboradores').update({
                        nome_completo: integ.nome,
                        email: integ.email,
                        telefone: integ.celular || integ.telefone,
                        data_nascimento: integ.data_nascimento,
                        origem: 'mio',
                        mio_data: integ,
                        ultimo_sync_mio: new Date().toISOString(),
                    }).eq('id', existente.id);
                } else {
                    // Criar novo
                    await supabase.from('gt_colaboradores').insert({
                        nome_completo: integ.nome,
                        cpf: cpf,
                        email: integ.email,
                        telefone: integ.celular || integ.telefone,
                        data_nascimento: integ.data_nascimento,
                        origem: 'mio',
                        mio_id: String(integ.id),
                        mio_data: integ,
                        ultimo_sync_mio: new Date().toISOString(),
                    });
                }
                result.processados++;
            } catch (err) {
                result.erros++;
            }
        }

        // Atualizar log
        await supabase.from('gt_cron_log').update({
            status: 'sucesso',
            registros_processados: result.processados,
            registros_erro: result.erros,
            finalizado_em: new Date().toISOString(),
        }).eq('id', logEntry.id);

    } catch (error: any) {
        result.erros++;
    }

    return result;
}
```

---

## 17. Admin Page

### `src/app/admin/gestao-tripulantes/page.tsx`

Página completa de configuração com abas/seções:

1. **Geral** — Nome personalizado, ativar/desativar módulo
2. **MIO** — Habilitar integração, habilitar escrita, auto-sync, status conexão, botão "Sync Agora"
3. **PoliWeb** — Credenciais (username/password), testar conexão, habilitar scraping
4. **Notificações** — Dias de aviso por tipo de documento, canais habilitados, enviar automático
5. **OCR** — Qualidade, automático no upload, fallback API URL, idioma
6. **Algoritmo Back** — Sliders para cada peso, limite resultados, sugestão automática
7. **Autonomia** — Toggles individuais: notificações, scraping, OCR, sugestão back
8. **Dashboard** — Colunas visíveis, intervalo de atualização
9. **Cron Jobs** — Status de cada cron, última execução, botão "Executar Agora", logs

---

## 18. IA Tools

### `src/lib/ia/registry/definitions/gestao-tripulantes.tools.ts`

```typescript
export const gestaoTripulantesToolDefinitions = [
    { name: 'buscar_colaborador_gt', description: 'Busca colaborador na Gestão de Tripulantes por nome ou CPF', requireModule: 'gestao-tripulantes', parameters: { query: { type: 'string' } } },
    { name: 'consultar_documentos_gt', description: 'Consulta documentos de um colaborador', requireModule: 'gestao-tripulantes', parameters: { colaborador_id: { type: 'string' } } },
    { name: 'sugerir_back_gt', description: 'Sugere substitutos para um colaborador embarcado', requireModule: 'gestao-tripulantes', parameters: { colaborador_id: { type: 'string' } } },
    { name: 'consultar_vencimentos_gt', description: 'Lista documentos vencendo/vencidos', requireModule: 'gestao-tripulantes', parameters: { dias: { type: 'number' } } },
];
```

### `src/lib/ia/tools.ts` — Adicionar handlers no `executeToolCall()`

---

## 19. Email Templates

### `src/lib/emailTemplates.ts` — Adicionar:

```typescript
export function documentoVencendoTemplate(
    colaboradorNome: string, documentoTipo: string, documentoNome: string,
    dataValidade: string, diasRestantes: number, linkPerfil?: string
): string;
export function documentoVencidoTemplate(
    colaboradorNome: string, documentoTipo: string, documentoNome: string,
    diasVencido: number, linkPerfil?: string
): string;
export function novoDocumentoAdicionadoTemplate(
    colaboradorNome: string, documentoTipo: string, documentoNome: string,
    linkPerfil?: string
): string;
export function sugestaoBackTemplate(
    colaboradorNome: string, substitutoNome: string, dataInicio: string,
    linkAcao?: string
): string;
export function embarqueConfirmadoTemplate(
    colaboradorNome: string, embarcacao: string, dataEmbarque: string,
    dataDesembarque: string, linkDetalhes?: string
): string;
```

---

## 20. CRUDs Estruturais

### Padrão para todos CRUDs (centros-custo, empresas, embarcacoes, cargos)

```typescript
// route.ts — GET (listar) POST (criar)
export async function GET(request: NextRequest) {
    const supabase = createRouteClient();
    const { data, error } = await supabase.from('gt_centros_custo').select('*').order('nome');
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data });
}
export async function POST(request: NextRequest) {
    const body = await request.json();
    const { data, error } = await supabase.from('gt_centros_custo').insert(body).select().single();
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data }, { status: 201 });
}

// [id]/route.ts — GET (individual) PUT (atualizar) DELETE (soft delete)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    const body = await request.json();
    const { data, error } = await supabase.from('gt_centros_custo').update(body).eq('id', params.id).select().single();
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data });
}
```

---

## 21. Types

### `src/types/gestao-tripulantes.ts`

```typescript
export interface GTCentroCusto {
    id: string; nome: string; codigo?: string; ativo: boolean;
    created_at: string; updated_at: string;
}
export interface GTEmpresa {
    id: string; nome: string; cnpj?: string; centro_custo_id?: string;
    centro_custo_nome?: string; ativo: boolean;
}
export interface GTEmbarcacao {
    id: string; nome: string; imo?: string; empresa_id?: string;
    empresa_nome?: string; tipo?: string; capacidade?: number; ativo: boolean;
}
export interface GTCargo {
    id: string; nome: string; descricao?: string; nivel: number;
    ordem_exibicao: number; ativo: boolean;
}
export interface GTColaborador {
    id: string; user_id?: string; nome_completo: string; cpf?: string;
    rg?: string; data_nascimento?: string; email?: string; telefone?: string;
    nacionalidade: string; centro_custo_id?: string; empresa_id?: string;
    embarcacao_atual_id?: string; cargo_id?: string; data_admissao?: string;
    data_demissao?: string; matricula?: string;
    status_embarque: 'embarcado'|'standby'|'folga'|'desembarcado'|'afastado'|'ferias'|'treinamento';
    standby: boolean; deleted_at?: string; created_at: string;
    // Joined fields
    centro_custo_nome?: string; empresa_nome?: string; embarcacao_nome?: string;
    cargo_nome?: string; avatar?: string; qtd_docs_vencidos?: number;
    qtd_docs_vencendo?: number; ultimo_embarque?: any;
}
export interface GTDocumento {
    id: string; colaborador_id: string; user_id?: string;
    tipo_documento: string; subtipo?: string; titulo: string;
    numero_documento?: string; data_emissao?: string; data_validade?: string;
    arquivo_url?: string; status_validacao: string;
    ocr_status: string; origem: string; status_revisao: string;
    aso?: GTAsoData; treinamento?: GTTreinamentoData;
}
export interface GTAsoData {
    id: string; documento_id: string; tipo_exame: string;
    resultado?: string; data_realizacao?: string; medico_nome?: string;
    medico_crm?: string; nome_clinica?: string;
    esocial_status: string; esocial_evento_id?: string; esocial_protocolo?: string;
}
export interface GTTreinamentoData {
    id: string; documento_id: string; nome_curso: string;
    instituicao?: string; carga_horaria?: number;
}
export interface GTEmbarque {
    id: string; colaborador_id: string; embarcacao_id?: string;
    tipo: string; data_embarque: string; data_desembarque?: string;
    data_prevista_desembarque?: string; local_embarque?: string;
    local_desembarque?: string; substituindo_id?: string;
    embarcacao_nome?: string; deleted_at?: string;
}
export interface GTSubstituicao {
    id: string; substituto_id: string; substituido_id: string;
    embarque_id?: string; periodo_inicio: string; periodo_fim?: string;
    substituto_nome?: string; substituido_nome?: string; cargo_nome?: string;
}
export interface GTConfigGerais { modulo_ativo: boolean; nome_personalizado: string | null; }
export interface GTConfigMIO { habilitado: boolean; escrita_habilitada: boolean; auto_sync: boolean; intervalo_minutos: number; }
export interface GTConfigPoliWeb { username: string; password: string; habilitado: boolean; }
export interface GTConfigNotificacoes { aso_dias_aviso: number[]; treinamento_dias_aviso: number[]; passaporte_dias_aviso: number[]; canal_email: boolean; canal_push: boolean; canal_inapp: boolean; enviar_automatico: boolean; }
export interface GTConfigOCR { qualidade: string; automatico_upload: boolean; fallback_api_url: string; fallback_api_key: string; idioma: string; }
export interface GTConfigAlgoritmo { [key: string]: number; }
export interface GTConfigAutonomia { notificacoes_automaticas: boolean; sugestao_back_automatica: boolean; scraping_poliweb_automatico: boolean; ocr_automatico: boolean; }
export interface GTConfigDashboard { colunas_visiveis: string[]; atualizacao_intervalo_segundos: number; }
export interface GTSugestaoBackResult {
    colaborador: { id: string; nome_completo: string; cpf: string; cargo_nome: string; empresa_nome: string; embarcacao_nome: string; status_embarque: string; standby: boolean; avatar: string | null; };
    pontuacao: number; pontuacao_maxima: number; justificativas: string[];
}
```

---

## Considerações Finais

### Vercel Cron Configuration

```json
// vercel.json - adicionar:
{
    "crons": [
        { "path": "/api/gestao-tripulantes/cron/poliweb-scraper", "schedule": "0 9,18 * * *" },
        { "path": "/api/gestao-tripulantes/cron/verificar-vencimentos", "schedule": "0 8 * * *" },
        { "path": "/api/gestao-tripulantes/cron/sync-mio", "schedule": "0 * * * *" }
    ]
}
```

### Checklist de Implantação

- [ ] Executar migration SQL no Supabase
- [ ] Criar bucket `gestao-tripulantes-documentos` no Storage
- [ ] Adicionar módulo em `config/modules.ts`
- [ ] Adicionar em `constants/modules.ts`
- [ ] Adicionar permissões em `lib/permissions.ts`
- [ ] Adicionar ACL seed permissions
- [ ] Adicionar traduções em pt-BR.ts e en-US.ts
- [ ] Adicionar menu item em `data/menu.ts`
- [ ] Adicionar link no admin layout
- [ ] Adicionar no UserEditor
- [ ] Criar todas as API routes
- [ ] Criar componentes frontend
- [ ] Criar lib services
- [ ] Criar admin page
- [ ] Adicionar email templates
- [ ] Adicionar IA tools
- [ ] Testar permissões (role, sector, user override, ACL)
- [ ] Testar fluxo completo: cadastro → upload → OCR → notificação → sugestão back
