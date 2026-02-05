-- Enable pg_trgm for better fuzzy matching (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Updated Refresh Function to Include ALL System Modules
CREATE OR REPLACE FUNCTION public.refresh_global_search_index()
RETURNS void AS $$
BEGIN
    TRUNCATE TABLE public.global_search_index;

    ----------------------------------------------------------------------
    -- 1. System Pages (The "Impeccable" List from SYSTEM_MODULES)
    --    We hardcode these to match src/constants/modules.ts exactly.
    ----------------------------------------------------------------------
    INSERT INTO public.global_search_index (original_id, source_table, title, content, url, metadata)
    VALUES 
        -- Core
        ('sys_dashboard', 'system_pages', 'Dashboard', 'Página inicial e visão geral do sistema.', '/dashboard', '{"category": "core", "icon": "FiHome"}'),
        ('sys_noticias', 'system_pages', 'Notícias', 'Portal de comunicação, novidades e avisos.', '/noticias', '{"category": "core", "icon": "FiBell"}'),
        ('sys_calendario', 'system_pages', 'Calendário', 'Eventos corporativos e datas importantes.', '/calendario', '{"category": "core", "icon": "FiCalendar"}'),

        -- HR (Meu RH)
        ('sys_ponto', 'system_pages', 'Ponto', 'Registro de ponto, espelho e marcações.', '/ponto', '{"category": "hr", "icon": "FiClock"}'),
        ('sys_contracheque', 'system_pages', 'Contracheque', 'Visualização de holerites e rendimentos.', '/contracheque', '{"category": "hr", "icon": "FiDollarSign"}'),
        ('sys_reembolso', 'system_pages', 'Reembolso', 'Solicitação e acompanhamento de reembolsos de despesas.', '/reembolso', '{"category": "hr", "icon": "FiCreditCard"}'),
        ('sys_kpi', 'system_pages', 'KPIs', 'Indicadores de desempenho e métricas.', '/kpi', '{"category": "hr", "icon": "FiBarChart2"}'),
        ('sys_avaliacao', 'system_pages', 'Avaliação de Desempenho', 'Ciclos de avaliação e feedback.', '/avaliacao', '{"category": "hr", "icon": "FiAward"}'),

        -- Content & Knowledge
        ('sys_manual', 'system_pages', 'Manual do Colaborador', 'Guia de normas e conduta da empresa.', '/manual', '{"category": "content", "icon": "FiBook"}'),
        ('sys_procedimentos', 'system_pages', 'Procedimentos', 'Procedimentos Operacionais Padrão (POPs) e instruções.', '/procedimentos', '{"category": "content", "icon": "FiFileText"}'),
        ('sys_politicas', 'system_pages', 'Políticas', 'Políticas internas da empresa.', '/politicas', '{"category": "content", "icon": "FiShield"}'),
        ('sys_biblioteca', 'system_pages', 'Biblioteca', 'Repositório de arquivos, documentos e downloads.', '/biblioteca', '{"category": "content", "icon": "FiArchive"}'),
        ('sys_academy', 'system_pages', 'Academy', 'Universidade corporativa, cursos e treinamentos.', '/academy', '{"category": "content", "icon": "FiTarget"}'),
        ('sys_ajuda', 'system_pages', 'Ajuda', 'Central de suporte, dúvidas e contatos.', '/ajuda', '{"category": "content", "icon": "FiHelpCircle"}'),

        -- Department Specific
        ('sys_compras', 'system_pages', 'Ordens de Compra', 'Gestão de compras, requisições e aprovações.', '/department/purchase-orders', '{"category": "department", "icon": "FiShoppingCart"}'),
        ('sys_chat', 'system_pages', 'Chat', 'Comunicação interna e mensagens.', '/chat', '{"category": "department", "icon": "FiMessageSquare"}'),
        ('sys_wkradar', 'system_pages', 'WK Radar', 'Acesso ao sistema Radar.', '/wkradar', '{"category": "department", "icon": "FiActivity"}'),
        ('sys_contatos', 'system_pages', 'Lista de Ramais', 'Lista telefônica e contatos úteis.', '/contatos', '{"category": "department", "icon": "FiPhone"}'),
        ('sys_emergencia', 'system_pages', 'Emergência', 'Procedimentos e contatos de emergência.', '/emergencia', '{"category": "department", "icon": "FiAlertTriangle"}'),
        ('sys_guia_offshore', 'system_pages', 'Guia Offshore', 'Guia completo para trabalho embarcado.', '/guia_offshore', '{"category": "department", "icon": "FiAnchor"}'),

        -- Admin / Integrations
        ('sys_notifications', 'system_pages', 'Notificações (Admin)', 'Gerenciar notificações do sistema.', '/admin/notifications', '{"category": "admin", "icon": "FiBell"}'),
        ('sys_integracao', 'system_pages', 'Integração ERP', 'Configurações de integração.', '/admin/integracao-erp', '{"category": "admin", "icon": "FiSettings"}');


    ----------------------------------------------------------------------
    -- 2. Dynamic Content (Database Tables)
    ----------------------------------------------------------------------

    -- Documents
    INSERT INTO public.global_search_index (original_id, source_table, title, content, url, metadata)
    SELECT 
        id::text, 'documents', title, description, 
        COALESCE(file, '/documents/' || id), 
        jsonb_build_object('created_at', created_at, 'category', category)
    FROM public.documents;

    -- News
    INSERT INTO public.global_search_index (original_id, source_table, title, content, url, metadata)
    SELECT 
        id::text, 'News', title, content, 
        '/news/post/' || id, 
        jsonb_build_object('author', author, 'created_at', "createdAt")
    FROM public."News";

    -- Users
    INSERT INTO public.global_search_index (original_id, source_table, title, content, url, metadata)
    SELECT 
        id::text, 'users_unified', 
        first_name || ' ' || last_name, 
        email || ' ' || COALESCE(position, '') || ' ' || COALESCE(department, ''), 
        '/admin/users?q=' || replace(first_name || ' ' || last_name, ' ', '+'), 
        jsonb_build_object('role', role, 'position', position, 'department', department, 'avatar', avatar)
    FROM public.users_unified;

    -- Academy
    INSERT INTO public.global_search_index (original_id, source_table, title, content, url, metadata)
    SELECT 
        id::text, 'academy_courses', title, description, 
        '/academy/course/' || id, 
        jsonb_build_object('category_id', category_id, 'instructor_id', instructor_id)
    FROM public.academy_courses;

    -- Reimbursement
    INSERT INTO public.global_search_index (original_id, source_table, title, content, url, metadata)
    SELECT 
        id::text, 'Reimbursement', 
        'Reembolso #' || protocolo, 
        descricao || ' ' || "valorTotal"::text || ' ' || status, 
        '/reembolso/' || protocolo, 
        jsonb_build_object('status', status, 'created_at', created_at)
    FROM public."Reimbursement";

END;
$$ LANGUAGE plpgsql;

-- Apply and Refresh immediately
SELECT public.refresh_global_search_index();
