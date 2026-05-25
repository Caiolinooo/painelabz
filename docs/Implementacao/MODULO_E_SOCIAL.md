# Módulo E-Social — Manual de Implementação

> **Versão:** 1.0 | **Module Key:** `e-social` | **URL:** `/admin/e-social`
> **API Base:** `/api/e-social/` | **Tabelas Prefixo:** `esocial_` | **i18n Namespace:** `eSocial`

---

## Sumário

1. [Database Migration](#1-database-migration)
2. [Registro do Módulo](#2-registro-do-módulo)
3. [Permissões (Role + Sector + ACL + Features)](#3-permissões)
4. [Traduções i18n](#4-traduções-i18n)
5. [Sidebar](#5-sidebar)
6. [Admin Layout](#6-admin-layout)
7. [Estrutura de Diretórios](#7-estrutura-de-diretórios)
8. [API Routes](#8-api-routes)
9. [Catálogo de Eventos](#9-catálogo-de-eventos)
10. [Geração de XML](#10-geração-de-xml)
11. [WebService Client](#11-webservice-client)
12. [Certificado Digital](#12-certificado-digital)
13. [Fluxo de Revisão e Envio](#13-fluxo-de-revisão-e-envio)
14. [Integração com Gestão de Tripulantes](#14-integração-com-gestão-de-tripulantes)
15. [Admin Page](#15-admin-page)
16. [Types](#16-types)

---

## 1. Database Migration

**Arquivo:** `supabase/migrations/YYYYMMDD_HHMMSS_create_e_social.sql`

```sql
-- ============================================
-- MÓDULO E-SOCIAL
-- ============================================

-- 1. CATÁLOGO DE EVENTOS (baseado no manual oficial do E-Social)
CREATE TABLE esocial_eventos_catalogo (
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
CREATE TABLE esocial_eventos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    evento_codigo TEXT NOT NULL,
    -- Identificação
    cpf_trabalhador TEXT,
    cnpj_empregador TEXT,
    matricula TEXT,
    -- Dados do evento
    dados_evento JSONB NOT NULL,
    xml_gerado TEXT,
    -- Origem
    modulo_origem TEXT NOT NULL,
    entidade_origem_id UUID,
    entidade_origem_tipo TEXT,
    -- Status
    status TEXT CHECK (status IN (
        'rascunho','pendente_revisao','revisao_aprovado','revisao_rejeitado',
        'fila_envio','enviando','enviado','processado','erro','devolvido'
    )) DEFAULT 'rascunho',
    -- Revisão
    revisado_por UUID REFERENCES users_unified(id) ON DELETE SET NULL,
    revisado_em TIMESTAMPTZ,
    comentario_revisao TEXT,
    -- Envio
    protocolo_envio TEXT,
    numero_recibo TEXT,
    data_envio TIMESTAMPTZ,
    data_processamento TIMESTAMPTZ,
    -- Retorno
    retorno_completo JSONB,
    erros_processamento JSONB,
    -- Tentativas
    tentativas_envio INTEGER DEFAULT 0,
    ultimo_erro TEXT,
    -- Controle
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_esocial_eventos_status ON esocial_eventos(status);
CREATE INDEX idx_esocial_eventos_codigo ON esocial_eventos(evento_codigo);
CREATE INDEX idx_esocial_eventos_origem ON esocial_eventos(modulo_origem, entidade_origem_id);
CREATE INDEX idx_esocial_eventos_cpf ON esocial_eventos(cpf_trabalhador);
CREATE INDEX idx_esocial_eventos_pendentes ON esocial_eventos(status) WHERE status IN ('pendente_revisao','fila_envio');

-- 3. CERTIFICADOS DIGITAIS
CREATE TABLE esocial_certificados (
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
CREATE TABLE esocial_configuracoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chave TEXT UNIQUE NOT NULL,
    valor JSONB NOT NULL,
    descricao TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_esocial_config_updated_at
    BEFORE UPDATE ON esocial_configuracoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. LOG DE ENVIOS
CREATE TABLE esocial_envios_log (
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

-- ============================================
-- CONFIGURAÇÕES PADRÃO
-- ============================================
INSERT INTO esocial_configuracoes (chave, valor, descricao) VALUES
('geral', '{"ambiente": "homologacao", "autonomia_envio": false, "consultar_automatico": true}', 'Configurações gerais'),
('webservice', '{
    "url_homologacao": "https://webserviceshom.envio.esocial.gov.br/servicos/empregador/enviarloteeventos",
    "url_producao": "https://webservices.producao.esocial.gov.br/servicos/empregador/enviarloteeventos",
    "timeout_segundos": 60,
    "tentativas_maximas": 3
}', 'Configurações do webservice'),
('notificacoes', '{"notificar_erro": true, "notificar_sucesso": false, "notificar_revisao": true}', 'Notificações do módulo');

-- ============================================
-- CATÁLOGO DE EVENTOS (seed inicial)
-- ============================================
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
('S-3000', 'Exclusão de Eventos', 'Exclusão de eventos enviados incorretamente', 'nao_periodico', 1);

-- ============================================
-- VIEWS
-- ============================================
CREATE VIEW esocial_vw_dashboard AS
SELECT
    (SELECT COUNT(*) FROM esocial_eventos) AS total_eventos,
    (SELECT COUNT(*) FROM esocial_eventos WHERE status = 'pendente_revisao') AS pendentes_revisao,
    (SELECT COUNT(*) FROM esocial_eventos WHERE status = 'fila_envio') AS fila_envio,
    (SELECT COUNT(*) FROM esocial_eventos WHERE status = 'enviado') AS enviados,
    (SELECT COUNT(*) FROM esocial_eventos WHERE status = 'processado') AS processados,
    (SELECT COUNT(*) FROM esocial_eventos WHERE status = 'erro') AS com_erro;

CREATE VIEW esocial_vw_eventos_pendentes AS
SELECT e.*, ec.nome AS evento_nome, ec.grupo AS evento_grupo
FROM esocial_eventos e
JOIN esocial_eventos_catalogo ec ON e.evento_codigo = ec.codigo_evento
WHERE e.status IN ('pendente_revisao', 'fila_envio')
ORDER BY e.created_at DESC;

-- ============================================
-- RLS
-- ============================================
ALTER TABLE esocial_eventos_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE esocial_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE esocial_certificados ENABLE ROW LEVEL SECURITY;
ALTER TABLE esocial_configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE esocial_envios_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY esocial_admin_all ON esocial_eventos FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users_unified WHERE id = auth.uid() AND role = 'ADMIN'));

CREATE POLICY esocial_view_eventos ON esocial_eventos FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM users_unified WHERE id = auth.uid()
        AND (role IN ('ADMIN','MANAGER') OR (access_permissions->'modules'->>'e-social')::boolean = true)));
```

---

## 2. Registro do Módulo

### `src/config/modules.ts` — Adicionar ao `SYSTEM_MODULES`:

```typescript
{
    key: 'e-social',
    name: 'E-Social',
    description: 'Envio de eventos trabalhistas ao sistema E-Social do governo',
    defaultRoles: ['ADMIN'],
    category: 'department'
}
```

### `src/constants/modules.ts` — Adicionar ao `SYSTEM_MODULES`:

```typescript
{
    id: 'e-social',
    label: 'E-Social',
    description: 'Envio de eventos trabalhistas ao E-Social',
    category: 'department',
    href: '/admin/e-social',
    visible: true
}
```

---

## 3. Permissões

### `src/lib/permissions.ts` — Em `PermissionFeatures`:

```typescript
'esocial.view'?: boolean;
'esocial.prepare'?: boolean;
'esocial.review'?: boolean;
'esocial.send'?: boolean;
'esocial.admin'?: boolean;
```

### `src/lib/permissions.ts` — Em `DEFAULT_PERMISSIONS_BY_ROLE`:

```typescript
ADMIN: {
    modules: { 'e-social': true },
    features: { 'esocial.view': true, 'esocial.prepare': true, 'esocial.review': true, 'esocial.send': true, 'esocial.admin': true }
},
MANAGER: {
    modules: { 'e-social': false },
    features: { 'esocial.view': true }
},
USER: {
    modules: { 'e-social': false }
}
```

### ACL Seed — `src/app/api/acl/init/route.ts`:

```typescript
{ resource: 'e-social', action: 'view',    description: 'Visualizar eventos',     level: 1 },
{ resource: 'e-social', action: 'prepare', description: 'Preparar eventos',       level: 2 },
{ resource: 'e-social', action: 'review',  description: 'Revisar eventos',        level: 2 },
{ resource: 'e-social', action: 'send',    description: 'Enviar para E-Social',   level: 3 },
{ resource: 'e-social', action: 'admin',   description: 'Admin total',            level: 3 },
```

---

## 4. Traduções i18n

### `src/i18n/locales/pt-BR.ts`

```typescript
menu: {
    // ...existing...
    eSocial: 'E-Social',
}
modules: {
    // ...existing...
    'e-social': 'E-Social',
}
eSocial: {
    title: 'E-Social',
    subtitle: 'Gerenciamento de eventos trabalhistas do E-Social',
    dashboard: 'Dashboard',
    eventos: 'Eventos',
    revisao: 'Revisão de Eventos',
    certificados: 'Certificados Digitais',
    configuracoes: 'Configurações',
    // Status
    eventStatus: {
        draft: 'Rascunho',
        pendingReview: 'Pendente Revisão',
        approved: 'Aprovado',
        rejected: 'Rejeitado',
        queued: 'Fila de Envio',
        sending: 'Enviando',
        sent: 'Enviado',
        processed: 'Processado',
        error: 'Erro',
        returned: 'Devolvido',
    },
    // Eventos
    eventosList: {
        title: 'Todos os Eventos',
        newEvent: 'Novo Evento',
        code: 'Código',
        name: 'Nome do Evento',
        worker: 'Trabalhador',
        status: 'Status',
        createdAt: 'Criação',
        sentAt: 'Envio',
        protocol: 'Protocolo',
        receipt: 'Recibo',
        actions: 'Ações',
        view: 'Visualizar',
        delete: 'Excluir',
        noEvents: 'Nenhum evento encontrado',
    },
    // Revisão
    revisao: {
        title: 'Eventos Pendentes de Revisão',
        approve: 'Aprovar',
        reject: 'Rejeitar',
        approveConfirm: 'Confirmar aprovação do evento?',
        rejectConfirm: 'Confirmar rejeição do evento?',
        comment: 'Comentário da Revisão',
        commentPlaceholder: 'Adicione um comentário...',
        approved: 'Evento aprovado com sucesso',
        rejected: 'Evento rejeitado',
        noPending: 'Nenhum evento pendente de revisão',
    },
    // Envio
    envio: {
        title: 'Envio de Evento',
        sendNow: 'Enviar Agora',
        sending: 'Enviando...',
        sentSuccess: 'Evento enviado com sucesso',
        sendError: 'Erro ao enviar evento',
        protocol: 'Protocolo de Envio',
        receipt: 'Número do Recibo',
        consultNow: 'Consultar Status',
        lastTry: 'Última Tentativa',
        attempts: 'Tentativas',
    },
    // Certificados
    certificados: {
        title: 'Certificados Digitais',
        upload: 'Upload Certificado',
        uploadNew: 'Adicionar Novo Certificado',
        name: 'Nome',
        issuer: 'Emissor',
        validUntil: 'Válido Até',
        status: 'Status',
        active: 'Ativo',
        setActive: 'Definir como Ativo',
        delete: 'Remover',
        noCertificates: 'Nenhum certificado cadastrado',
        password: 'Senha do Certificado',
        onlyPfx: 'Apenas arquivos .pfx ou .p12 são aceitos',
    },
    // Dashboard
    dashboard: {
        totalEvents: 'Total de Eventos',
        pendingReview: 'Pendentes Revisão',
        queued: 'Fila de Envio',
        sent: 'Enviados',
        processed: 'Processados',
        errors: 'Com Erro',
    },
    // Configurações
    config: {
        title: 'Configurações',
        ambiente: 'Ambiente',
        homologacao: 'Homologação',
        producao: 'Produção',
        autonomiaEnvio: 'Autonomia de Envio',
        autonomiaEnvioDesc: 'Quando ativo, envia eventos sem necessidade de revisão manual',
        consultarAutomatico: 'Consultar Status Automaticamente',
        timeout: 'Timeout (segundos)',
        maxTentativas: 'Máximo de Tentativas',
        urlHomologacao: 'URL Homologação',
        urlProducao: 'URL Produção',
        saved: 'Configurações salvas com sucesso',
        saveError: 'Erro ao salvar configurações',
    },
    // Erros
    errors: {
        loadError: 'Erro ao carregar eventos',
        prepareError: 'Erro ao preparar evento',
        sendError: 'Erro ao enviar evento',
        xmlError: 'Erro ao gerar XML',
        certError: 'Erro com certificado digital',
        notFound: 'Evento não encontrado',
        unauthorized: 'Sem permissão para esta ação',
    },
}
```

### `src/i18n/locales/en-US.ts` — Mesma estrutura em inglês.

---

## 5. Sidebar

### `src/data/menu.ts`

O módulo E-Social é **admin-only**, então não precisa de entrada no menu principal do sidebar. Ele fica acessível apenas pelo admin layout.

---

## 6. Admin Layout

### `src/app/admin/layout.tsx`

```tsx
// Adicionar na categoria "Sistema" ou nova "Integrações":
<NavLink href="/admin/e-social" icon={FiSend}>
    E-Social
</NavLink>
```

> **Nota:** Importar `FiSend` de `react-icons/fi`.

---

## 7. Estrutura de Diretórios

```
src/
├── app/
│   ├── api/e-social/
│   │   ├── route.ts                          # GET - info do módulo
│   │   ├── eventos/
│   │   │   ├── route.ts                      # GET (list) + POST (criar)
│   │   │   ├── preparar/
│   │   │   │   └── route.ts                  # POST - preparar evento
│   │   │   └── [id]/
│   │   │       ├── route.ts                  # GET + PUT + DELETE
│   │   │       ├── revisar/
│   │   │       │   └── route.ts              # PUT - aprovar/rejeitar
│   │   │       └── enviar/
│   │   │           └── route.ts              # POST - enviar p/ E-Social
│   │   ├── catalogo/
│   │   │   └── route.ts                      # GET - listar catálogo
│   │   ├── certificados/
│   │   │   ├── route.ts                      # GET (list) + POST (upload)
│   │   │   └── [id]/
│   │   │       ├── route.ts                  # GET + DELETE
│   │   │       └── ativar/
│   │   │           └── route.ts              # PUT - ativar/desativar
│   │   ├── consultar/
│   │   │   └── route.ts                      # POST - consultar protocolo
│   │   ├── configuracoes/
│   │   │   └── route.ts                      # GET + PUT
│   │   └── cron/
│   │       └── consultar-pendentes/
│   │           └── route.ts                  # POST - consultar status
│   │
│   └── admin/e-social/
│       ├── page.tsx                          # Dashboard do módulo
│       ├── eventos/
│       │   └── page.tsx                      # Lista de eventos
│       ├── revisao/
│       │   └── page.tsx                      # Eventos p/ revisão
│       ├── certificados/
│       │   └── page.tsx                      # Gerenciar certificados
│       └── configuracoes/
│           └── page.tsx                      # Configurações
│
├── components/e-social/
│   ├── DashboardESocial.tsx                  # Dashboard cards
│   ├── EventosList.tsx                        # Tabela de eventos
│   ├── EventoDetalhe.tsx                      # Visualização de evento
│   ├── EventoRevisao.tsx                      # Painel de revisão
│   ├── EventoEnvio.tsx                        # Painel de envio
│   ├── CertificadoManager.tsx                 # Upload + gerenciamento
│   ├── ConfiguracaoESocial.tsx                # Configurações
│   └── XmlViewer.tsx                          # Visualizador de XML
│
├── lib/e-social/
│   ├── client.ts                             # Cliente SOAP/REST E-Social
│   ├── xml-generator.ts                      # Geração de XML por evento
│   ├── certificado.ts                        # Gerenciamento de certificados
│   ├── validacao.ts                          # Validação XSD
│   └── eventos/
│       ├── s-2200.ts                         # Cadastramento inicial
│       ├── s-2220.ts                         # ASO
│       ├── s-2230.ts                         # Afastamento
│       ├── s-2240.ts                         # Condições ambientais
│       └── s-2299.ts                         # Desligamento
│
├── config/e-social.ts
├── types/e-social.ts
└── services/eSocialService.ts
```

---

## 8. API Routes

### 8.1 Resumo de Endpoints

| Método | Rota | Função |
|--------|------|--------|
| GET | `/api/e-social` | Info do módulo |
| GET | `/api/e-social/eventos` | Listar eventos (filtros, paginação) |
| POST | `/api/e-social/eventos` | Criar evento manualmente |
| POST | `/api/e-social/eventos/preparar` | Preparar evento a partir de dados |
| GET | `/api/e-social/eventos/[id]` | Detalhe do evento |
| PUT | `/api/e-social/eventos/[id]` | Atualizar evento |
| DELETE | `/api/e-social/eventos/[id]` | Excluir evento |
| PUT | `/api/e-social/eventos/[id]/revisar` | Aprovar/rejeitar revisão |
| POST | `/api/e-social/eventos/[id]/enviar` | Enviar para E-Social |
| GET | `/api/e-social/catalogo` | Listar catálogo de eventos |
| GET | `/api/e-social/certificados` | Listar certificados |
| POST | `/api/e-social/certificados` | Upload certificado |
| DELETE | `/api/e-social/certificados/[id]` | Remover certificado |
| PUT | `/api/e-social/certificados/[id]/ativar` | Ativar/desativar certificado |
| POST | `/api/e-social/consultar` | Consultar protocolo externo |
| GET/PUT | `/api/e-social/configuracoes` | Configurações |
| POST | `/api/e-social/cron/consultar-pendentes` | Consultar status (cron) |

### 8.2 Preparar Evento

```typescript
// src/app/api/e-social/eventos/preparar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const token = extractTokenFromHeader(request.headers.get('authorization') || '');
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const payload = verifyToken(token);

        const body = await request.json();
        // body: { evento_codigo, dados_evento, modulo_origem, entidade_origem_id, ... }

        if (!body.evento_codigo || !body.dados_evento) {
            return NextResponse.json({ success: false, error: 'evento_codigo e dados_evento são obrigatórios' }, { status: 400 });
        }

        const supabase = createRouteClient();

        // Gerar XML do evento
        const { gerarXMLEvento } = await import('@/lib/e-social/xml-generator');
        const xml = await gerarXMLEvento(body.evento_codigo, body.dados_evento);

        // Validar XML (XSD)
        const { validarXML } = await import('@/lib/e-social/validacao');
        const errosValidacao = await validarXML(xml, body.evento_codigo);

        // Inserir evento
        const { data, error } = await supabase.from('esocial_eventos').insert({
            evento_codigo: body.evento_codigo,
            cpf_trabalhador: body.dados_evento.ideTrabalhador?.cpf,
            cnpj_empregador: body.dados_evento.ideEmpregador?.cnpj,
            dados_evento: body.dados_evento,
            xml_gerado: xml,
            modulo_origem: body.modulo_origem || 'manual',
            entidade_origem_id: body.entidade_origem_id,
            entidade_origem_tipo: body.entidade_origem_tipo,
            status: errosValidacao.length > 0 ? 'rascunho' : 'pendente_revisao',
            erros_processamento: errosValidacao.length > 0 ? errosValidacao : null,
        }).select().single();

        if (error) throw error;

        // Log
        await supabase.from('esocial_envios_log').insert({
            evento_id: data.id, acao: 'geracao_xml',
            sucesso: errosValidacao.length === 0,
            response_body: errosValidacao.length > 0 ? JSON.stringify(errosValidacao) : xml.substring(0, 500),
        });

        return NextResponse.json({
            success: true,
            data: { ...data, xml_preview: xml.substring(0, 500), erros_validacao: errosValidacao }
        }, { status: 201 });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
```

### 8.3 Revisar Evento

```typescript
// src/app/api/e-social/eventos/[id]/revisar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const token = extractTokenFromHeader(request.headers.get('authorization') || '');
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const payload = verifyToken(token);
        const body = await request.json();

        // body: { aprovado: boolean, comentario?: string }
        if (body.aprovado === undefined) {
            return NextResponse.json({ success: false, error: 'Campo 'aprovado' é obrigatório' }, { status: 400 });
        }

        const supabase = createRouteClient();
        const novoStatus = body.aprovado ? 'revisao_aprovado' : 'revisao_rejeitado';
        const proximoStatus = body.aprovado ? 'fila_envio' : 'revisao_rejeitado';

        // Verificar autonomia de envio
        if (body.aprovado) {
            const { data: config } = await supabase.from('esocial_configuracoes').select('valor').eq('chave', 'geral').single();
            const geralConfig = (config?.valor as any) || {};
            // Se autonomia = true, status vai direto para 'fila_envio'
            // Se autonomia = false, a revisão aprova mas aguarda envio manual
        }

        const { data, error } = await supabase.from('esocial_eventos').update({
            status: proximoStatus,
            revisado_por: payload.userId,
            revisado_em: new Date().toISOString(),
            comentario_revisao: body.comentario || null,
        }).eq('id', params.id).select().single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
```

### 8.4 Enviar Evento

```typescript
// src/app/api/e-social/eventos/[id]/enviar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const token = extractTokenFromHeader(request.headers.get('authorization') || '');
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const payload = verifyToken(token);
        const supabase = createRouteClient();

        // Buscar evento
        const { data: evento, error: errEvento } = await supabase
            .from('esocial_eventos')
            .select('*')
            .eq('id', params.id)
            .single();

        if (errEvento || !evento) {
            return NextResponse.json({ success: false, error: 'Evento não encontrado' }, { status: 404 });
        }

        // Verificar status (só pode enviar se estiver em 'revisao_aprovado' ou 'fila_envio')
        if (!['revisao_aprovado', 'fila_envio', 'erro'].includes(evento.status)) {
            return NextResponse.json({ success: false, error: `Evento em status ${evento.status} não pode ser enviado` }, { status: 400 });
        }

        // Buscar certificado ativo
        const { data: certificado } = await supabase
            .from('esocial_certificados')
            .select('*')
            .eq('ativo', true)
            .single();

        if (!certificado) {
            return NextResponse.json({ success: false, error: 'Nenhum certificado digital ativo' }, { status: 400 });
        }

        // Atualizar status para 'enviando'
        await supabase.from('esocial_eventos').update({
            status: 'enviando',
            tentativas_envio: (evento.tentativas_envio || 0) + 1,
        }).eq('id', params.id);

        try {
            // Enviar via WebService
            const { enviarEvento } = await import('@/lib/e-social/client');
            const { data: config } = await supabase.from('esocial_configuracoes').select('valor').eq('chave', 'webservice').single();
            const wsConfig = (config?.valor as any) || {};

            const resultado = await enviarEvento({
                xml: evento.xml_gerado,
                certificadoPath: certificado.arquivo_path,
                certificadoSenha: certificado.senha_criptografada,
                url: wsConfig.url_homologacao, // ou producao conforme config
                timeout: wsConfig.timeout_segundos || 60,
            });

            // Atualizar evento com resultado
            await supabase.from('esocial_eventos').update({
                status: resultado.sucesso ? 'enviado' : 'erro',
                protocolo_envio: resultado.protocolo,
                numero_recibo: resultado.recibo,
                data_envio: new Date().toISOString(),
                retorno_completo: resultado.retorno,
                ultimo_erro: resultado.erro || null,
            }).eq('id', params.id);

            // Log
            await supabase.from('esocial_envios_log').insert({
                evento_id: params.id,
                acao: 'envio',
                request_body: evento.xml_gerado?.substring(0, 500),
                response_body: JSON.stringify(resultado.retorno || resultado.erro),
                status_code: resultado.statusCode,
                sucesso: resultado.sucesso,
                mensagem_erro: resultado.erro || null,
            });

            return NextResponse.json({
                success: resultado.sucesso,
                data: {
                    protocolo: resultado.protocolo,
                    recibo: resultado.recibo,
                    status: resultado.sucesso ? 'enviado' : 'erro',
                }
            });

        } catch (err: any) {
            await supabase.from('esocial_eventos').update({
                status: 'erro',
                ultimo_erro: err.message,
                retorno_completo: ***REMOVED*** error: err.message }),
            }).eq('id', params.id);

            return NextResponse.json({ success: false, error: err.message }, { status: 500 });
        }
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
```

### 8.5 Consultar Protocolo

```typescript
// src/app/api/e-social/consultar/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        // body: { protocolo: string }

        if (!body.protocolo) {
            return NextResponse.json({ success: false, error: 'Protocolo é obrigatório' }, { status: 400 });
        }

        const { consultarProtocolo } = await import('@/lib/e-social/client');
        const resultado = await consultarProtocolo(body.protocolo);

        return NextResponse.json({ success: true, data: resultado });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
```

### 8.6 Certificados

```typescript
// src/app/api/e-social/certificados/route.ts
export async function GET() {
    const supabase = createRouteClient();
    const { data, error } = await supabase.from('esocial_certificados').select('*').order('created_at', { ascending: false });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data });
}

export async function POST(request: NextRequest) {
    // Upload de certificado .pfx/.p12
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const nome = formData.get('nome') as string;
    const senha = formData.get('senha') as string;

    // Upload para storage
    const fileName = `certificados/${Date.now()}_${file.name}`;
    const { data: storageData, error: storageError } = await supabase.storage
        .from('esocial-certificados')
        .upload(fileName, Buffer.from(await file.arrayBuffer()));

    if (storageError) throw storageError;

    // Salvar registro
    const { data, error } = await supabase.from('esocial_certificados').insert({
        nome: nome || file.name,
        arquivo_path: fileName,
        senha_criptografada: senha, // Criptografar antes de salvar!
        status: 'valido',
    }).select().single();

    return NextResponse.json({ success: true, data }, { status: 201 });
}
```

### 8.7 Configurações

```typescript
// src/app/api/e-social/configuracoes/route.ts
export async function GET() {
    const supabase = createRouteClient();
    const { data, error } = await supabase.from('esocial_configuracoes').select('*');
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    const config = (data || []).reduce((acc: any, item: any) => { acc[item.chave] = item.valor; return acc; }, {});
    return NextResponse.json({ success: true, data: config });
}

export async function PUT(request: NextRequest) {
    const body = await request.json();
    const supabase = createRouteClient();
    const resultados = [];
    for (const [chave, valor] of Object.entries(body)) {
        const { data, error } = await supabase.from('esocial_configuracoes')
            .upsert({ chave, valor, updated_at: new Date().toISOString() }, { onConflict: 'chave' })
            .select().single();
        if (error) throw error;
        resultados.push(data);
    }
    return NextResponse.json({ success: true, data: resultados });
}
```

---

## 9. Catálogo de Eventos

O catálogo é populado na migration (13 eventos iniciais). Novos eventos podem ser adicionados via SQL ou via API admin.

**Para adicionar novo evento:**
```sql
INSERT INTO esocial_eventos_catalogo (codigo_evento, nome, descricao, grupo, prazo_envio_dias) VALUES
('S-2245', 'Treinamentos e Capacitações', 'Registro de treinamentos periódicos', 'periodico', 1);
```

**Para listar via API:**
```typescript
GET /api/e-social/catalogo
// Retorna: { success: true, data: [{ codigo_evento: 'S-2220', nome: 'Monitoramento da Saúde...', ... }] }
```

---

## 10. Geração de XML

### `src/lib/e-social/xml-generator.ts`

```typescript
export async function gerarXMLEvento(codigoEvento: string, dados: any): Promise<string> {
    const gerador = getGerador(codigoEvento);
    if (!gerador) throw new Error(`Gerador para evento ${codigoEvento} não implementado`);
    return gerador(dados);
}

function getGerador(codigo: string): ((dados: any) => Promise<string>) | null {
    const geradores: Record<string, (d: any) => Promise<string>> = {
        'S-2220': gerarS2200,
        'S-2220': gerarS2220,
        'S-2230': gerarS2230,
        'S-2240': gerarS2240,
        'S-2299': gerarS2299,
    };
    return geradores[codigo] || null;
}

async function gerarS2220(dados: any): Promise<string> {
    // Dados esperados: ideEvento, ideEmpregador, ideTrabalhador, exameOcupacional
    const { ideEvento, ideEmpregador, ideTrabalhador, exameOcupacional } = dados;

    return `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtMonitSaude/v_S_01_03_00">
    <evtMonitSaude>
        <ideEvento>
            <tpAmb>${ideEvento?.tpAmb || 2}</tpAmb>
            <procEmi>${ideEvento?.procEmi || 1}</procEmi>
            <verProc>${ideEvento?.verProc || '1.0.0'}</verProc>
        </ideEvento>
        <ideEmpregador>
            <tpInsc>1</tpInsc>
            <nrInsc>${ideEmpregador?.cnpj || ''}</nrInsc>
        </ideEmpregador>
        <ideTrabalhador>
            <cpfTrab>${ideTrabalhador?.cpf || ''}</cpfTrab>
        </ideTrabalhador>
        <exameOcupacional>
            <dtAso>${exameOcupacional?.dtAso || ''}</dtAso>
            <tpAso>${exameOcupacional?.tpAso || getTipoAso(exameOcupacional?.tipoExame)}</tpAso>
            <resAso>${exameOcupacional?.resAso || getResultadoAso(exameOcupacional?.resultado)}</resAso>
            <medico>
                <nisMed>${exameOcupacional?.medicoNis || ''}</nisMed>
                <nmMed>${exameOcupacional?.medicoNome || ''}</nmMed>
                <nrCRM>${exameOcupacional?.medicoCRM || ''}</nrCRM>
                <ufCRM>${exameOcupacional?.medicoCRMUF || ''}</ufCRM>
            </medico>
            ${exameOcupacional?.exames ? gerarExamesXML(exameOcupacional.exames) : ''}
        </exameOcupacional>
    </evtMonitSaude>
</eSocial>`;
}

function getTipoAso(tipo: string): number {
    const tipos: Record<string, number> = {
        'admissional': 1, 'periodico': 2, 'demissional': 3,
        'retorno': 4, 'mudanca_funcao': 5,
    };
    return tipos[tipo] || 0;
}

function getResultadoAso(resultado: string): number {
    const resultados: Record<string, number> = {
        'apto': 1, 'inapto': 2, 'apto_condicional': 3,
    };
    return resultados[resultado] || 0;
}

function gerarExamesXML(exames: any[]): string {
    if (!exames?.length) return '';
    return exames.map(exame => `
        <exame>
            <dtExm>${exame.data || ''}</dtExm>
            <procRealizado>${exame.codigo || ''}</procRealizado>
            <ordExm>${exame.ordem || 1}</ordExm>
        </exame>
    `).join('');
}
```

---

## 11. WebService Client

### `src/lib/e-social/client.ts`

```typescript
interface EnvioParams {
    xml: string;
    certificadoPath: string;
    certificadoSenha?: string;
    url: string;
    timeout?: number;
}

interface EnvioResult {
    sucesso: boolean;
    protocolo?: string;
    recibo?: string;
    retorno?: any;
    erro?: string;
    statusCode?: number;
}

export async function enviarEvento(params: EnvioParams): Promise<EnvioResult> {
    try {
        // Implementar chamada SOAP para o webservice do E-Social
        // Usar biblioteca como 'soap' ou 'axios' com certificado

        const https = await import('https');
        const axios = await import('axios');
        const fs = await import('fs/promises');

        // Ler certificado
        const cert = await fs.readFile(params.certificadoPath);

        const agent = new https.Agent({
            pfx: cert,
            passphrase: params.certificadoSenha,
            rejectUnauthorized: true,
        });

        const response = await axios.default.post(
            params.url,
            params.xml,
            {
                httpsAgent: agent,
                headers: { 'Content-Type': 'application/xml; charset=utf-8' },
                timeout: (params.timeout || 60) * 1000,
            }
        );

        // Parsear resposta SOAP
        const data = response.data;

        return {
            sucesso: true,
            protocolo: extrairProtocolo(data),
            recibo: extrairRecibo(data),
            retorno: data,
            statusCode: response.status,
        };

    } catch (error: any) {
        return {
            sucesso: false,
            erro: error.message,
            statusCode: error.response?.status,
            retorno: error.response?.data,
        };
    }
}

export async function consultarProtocolo(protocolo: string): Promise<any> {
    // Implementar consulta de protocolo
    return { status: 'processado', protocolo };
}

function extrairProtocolo(xml: string): string {
    const match = xml.match(/<protocoloEnvio[^>]*>([^<]+)<\/protocoloEnvio>/i);
    return match?.[1] || '';
}

function extrairRecibo(xml: string): string {
    const match = xml.match(/<nrRec[^>]*>([^<]+)<\/nrRec>/i);
    return match?.[1] || '';
}
```

---

## 12. Certificado Digital

### `src/lib/e-social/certificado.ts`

```typescript
import { createRouteClient } from '@/lib/supabase';
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = process.env.ESOCIAL_CERT_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

export function encryptPassword(password: string): string {
    const key = Buffer.from(SECRET_KEY.padEnd(32).slice(0, 32));
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

export function decryptPassword(encrypted: string): string {
    const key = Buffer.from(SECRET_KEY.padEnd(32).slice(0, 32));
    const parts = encrypted.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

export async function getActiveCertificate() {
    const supabase = createRouteClient();
    const { data } = await supabase.from('esocial_certificados').select('*').eq('ativo', true).single();
    if (!data) return null;
    return {
        ...data,
        senha: data.senha_criptografada ? decryptPassword(data.senha_criptografada) : '',
    };
}
```

---

## 13. Fluxo de Revisão e Envio

### Diagrama de Estados

```
[rascunho] ──► [pendente_revisao] ──► [revisao_aprovado] ──► [fila_envio] ──► [enviando] ──► [enviado] ──► [processado]
       │                                   │                      │                                    │
       │                                   │                      └── [erro] ◄──────────────────────────┘
       │                                   │                             │
       │                                   └── [revisao_rejeitado]       └── [devolvido]
       │                                                                    │
       └────────────────────────────────────────────────────────────────────┘
```

### Regras de Transição

| De | Para | Condição |
|----|------|----------|
| rascunho | pendente_revisao | Preparação completa + XML válido |
| pendente_revisao | revisao_aprovado | Revisor aprova |
| pendente_revisao | revisao_rejeitado | Revisor rejeita |
| revisao_aprovado | fila_envio | Automático (autonomia ON) ou manual |
| revisao_aprovado | enviando | Usuário clica "Enviar" (autonomia OFF) |
| fila_envio | enviando | Sistema pega da fila |
| enviando | enviado | WebService retorna sucesso |
| enviando | erro | WebService retorna erro |
| enviado | processado | Consulta confirma processamento |
| enviado | devolvido | Consulta indica devolução |
| erro | fila_envio | Re-tentativa |
| revisao_rejeitado | pendente_revisao | Revisão com correções |
| processado | - | Estado final |

### Integração com Gestão de Tripulantes

Quando um ASO é aprovado no módulo Gestão de Tripulantes:

```typescript
// No módulo Gestão de Tripulantes, após revisão do ASO:
async function enviarASOParaESocial(documentoAsoId: string, dadosASO: any) {
    const res = await fetch('/api/e-social/eventos/preparar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: ***REMOVED***
            evento_codigo: 'S-2220',
            modulo_origem: 'gestao-tripulantes',
            entidade_origem_id: documentoAsoId,
            entidade_origem_tipo: 'aso',
            dados_evento: {
                ideEvento: { tpAmb: 2, procEmi: 1, verProc: '1.0.0' },
                ideEmpregador: { cnpj: dadosASO.cnpj_clinica },
                ideTrabalhador: { cpf: dadosASO.cpf_colaborador },
                exameOcupacional: {
                    dtAso: dadosASO.data_realizacao,
                    tipoExame: dadosASO.tipo_exame,
                    resultado: dadosASO.resultado,
                    medicoNome: dadosASO.medico_nome,
                    medicoCRM: dadosASO.medico_crm,
                    exames: dadosASO.exames_realizados,
                },
            },
        }),
    });

    const result = await res.json();
    
    // Atualizar gt_documentos_aso com referência
    if (result.success && result.data) {
        await supabase.from('gt_documentos_aso').update({
            esocial_evento_id: result.data.id,
            esocial_status: 'pendente',
            esocial_xml_gerado: result.data.xml_gerado,
        }).eq('id', documentoAsoId);
    }

    return result;
}
```

---

## 14. Admin Pages

### `/admin/e-social/page.tsx` — Dashboard

```typescript
'use client';
// Cards com totais: Total Eventos, Pendentes Revisão, Fila Envio, Enviados, Erros
// Gráfico: Eventos por mês
// Tabela: Últimos eventos
```

### `/admin/e-social/eventos/page.tsx` — Lista de Eventos

```typescript
'use client';
// Tabela com todos eventos
// Filtros: código, status, CPF, data
// Ações: Visualizar, Revisar, Enviar, Excluir
// Botão "Novo Evento" (manual)
```

### `/admin/e-social/revisao/page.tsx` — Revisão

```typescript
'use client';
// Lista eventos com status 'pendente_revisao'
// Cada evento mostra: código, CPF, módulo origem, data
// Modal de revisão: Visualizar XML, Aprovar/Rejeitar + comentário
```

### `/admin/e-social/certificados/page.tsx` — Certificados

```typescript
'use client';
// Lista certificados com status
// Upload .pfx/.p12
// Ativar/desativar certificado
```

### `/admin/e-social/configuracoes/page.tsx` — Configurações

```typescript
'use client';
// Ambiente: homologação/produção
// Autonomia de envio: toggle
// URLs webservice
// Timeout, tentativas
// Notificações
```

---

## 15. Types

### `src/types/e-social.ts`

```typescript
export interface ESocialEventoCatalogo {
    id: string;
    codigo_evento: string;
    nome: string;
    descricao?: string;
    grupo: 'cadastramento'|'contratual'|'tabela'|'nao_periodico'|'periodico';
    versao_leiaute: string;
    prazo_envio_dias?: number;
    ativo: boolean;
}

export interface ESocialEvento {
    id: string;
    evento_codigo: string;
    cpf_trabalhador?: string;
    cnpj_empregador?: string;
    matricula?: string;
    dados_evento: any;
    xml_gerado?: string;
    modulo_origem: string;
    entidade_origem_id?: string;
    entidade_origem_tipo?: string;
    status: 'rascunho'|'pendente_revisao'|'revisao_aprovado'|'revisao_rejeitado'
           |'fila_envio'|'enviando'|'enviado'|'processado'|'erro'|'devolvido';
    revisado_por?: string;
    revisado_em?: string;
    comentario_revisao?: string;
    protocolo_envio?: string;
    numero_recibo?: string;
    data_envio?: string;
    data_processamento?: string;
    retorno_completo?: any;
    erros_processamento?: any;
    tentativas_envio: number;
    ultimo_erro?: string;
    created_at: string;
    updated_at: string;
    // Joined
    evento_nome?: string;
    evento_grupo?: string;
}

export interface ESocialCertificado {
    id: string;
    nome: string;
    arquivo_path: string;
    emissor?: string;
    valido_ate?: string;
    status: 'valido'|'expirado'|'revogado';
    ativo: boolean;
}

export interface ESocialConfigGeral {
    ambiente: 'homologacao'|'producao';
    autonomia_envio: boolean;
    consultar_automatico: boolean;
}

export interface ESocialConfigWS {
    url_homologacao: string;
    url_producao: string;
    timeout_segundos: number;
    tentativas_maximas: number;
}

export interface ESocialEnvioLog {
    id: string;
    evento_id?: string;
    acao: string;
    request_body?: string;
    response_body?: string;
    status_code?: number;
    sucesso?: boolean;
    mensagem_erro?: string;
    created_at: string;
}
```

---

## Checklist de Implantação

- [ ] Executar migration SQL no Supabase
- [ ] Adicionar módulo em `config/modules.ts`
- [ ] Adicionar em `constants/modules.ts`
- [ ] Adicionar permissões em `lib/permissions.ts`
- [ ] Adicionar ACL seed permissions
- [ ] Adicionar traduções em pt-BR.ts e en-US.ts
- [ ] Adicionar link no admin layout
- [ ] Criar bucket `esocial-certificados` no Storage
- [ ] Criar todas as API routes
- [ ] Implementar geradores XML para eventos principais (S-2220 primeiro)
- [ ] Implementar cliente WebService
- [ ] Implementar criptografia de senha de certificado
- [ ] Criar componentes frontend
- [ ] Criar admin pages
- [ ] Testar fluxo: preparar → revisar → enviar
- [ ] Testar integração com Gestão de Tripulantes (S-2220)
- [ ] Configurar CRON_SECRET no ambiente
