-- Migration: Update Search Links for Users to /profile/[id]

-- 1. Update the refresh function
CREATE OR REPLACE FUNCTION public.refresh_global_search_index()
RETURNS void AS $$
BEGIN
    TRUNCATE TABLE public.global_search_index;

    -- 1. System Pages (Preserve the hardcoded list)
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


    -- 2. Valid Dynamic Content
    
    -- Documents
    INSERT INTO public.global_search_index (original_id, source_table, title, content, url, metadata)
    SELECT id::text, 'documents', title, description, COALESCE(file, '/documents/' || id), jsonb_build_object('created_at', created_at, 'category', category)
    FROM public.documents;

    -- News
    INSERT INTO public.global_search_index (original_id, source_table, title, content, url, metadata)
    SELECT id::text, 'News', title, content, '/news/post/' || id, jsonb_build_object('author', author, 'created_at', "createdAt")
    FROM public."News";

    -- Users (UPDATED LINK)
    INSERT INTO public.global_search_index (original_id, source_table, title, content, url, metadata)
    SELECT id::text, 'users_unified', 
        first_name || ' ' || last_name, 
        email || ' ' || COALESCE(position, '') || ' ' || COALESCE(department, ''), 
        '/profile/' || id, 
        jsonb_build_object('role', role, 'position', position, 'department', department, 'avatar', avatar)
    FROM public.users_unified;

    -- Academy
    INSERT INTO public.global_search_index (original_id, source_table, title, content, url, metadata)
    SELECT id::text, 'academy_courses', title, description, '/academy/course/' || id, jsonb_build_object('category_id', category_id, 'instructor_id', instructor_id)
    FROM public.academy_courses;

    -- Reimbursement
    INSERT INTO public.global_search_index (original_id, source_table, title, content, url, metadata)
    SELECT id::text, 'Reimbursement', 'Reembolso #' || protocolo, descricao || ' ' || "valorTotal"::text || ' ' || status, '/reembolso/' || protocolo, jsonb_build_object('status', status, 'created_at', created_at)
    FROM public."Reimbursement";
END;
$$ LANGUAGE plpgsql;

-- 2. Update the Trigger Function (Real-time updates)
CREATE OR REPLACE FUNCTION public.handle_search_index_update()
RETURNS TRIGGER AS $$
DECLARE
    doc_url TEXT;
    doc_title TEXT;
    doc_content TEXT;
    doc_metadata JSONB;
BEGIN
    -- Delete old entry if exists
    IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
        DELETE FROM public.global_search_index 
        WHERE original_id = OLD.id::text AND source_table = TG_TABLE_NAME;
    END IF;

    -- If DELETE, we are done
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    -- Generate Data maps
    IF TG_TABLE_NAME = 'documents' THEN
        doc_title := NEW.title;
        doc_content := NEW.description;
        doc_url := COALESCE(NEW.file, '/documents/' || NEW.id);
        doc_metadata := jsonb_build_object('created_at', NEW.created_at, 'category', NEW.category);

    ELSIF TG_TABLE_NAME = 'News' THEN
        doc_title := NEW.title;
        doc_content := NEW.content;
        doc_url := '/news/post/' || NEW.id;
        doc_metadata := jsonb_build_object('author', NEW.author, 'created_at', NEW."createdAt");

    ELSIF TG_TABLE_NAME = 'users_unified' THEN
        doc_title := NEW.first_name || ' ' || NEW.last_name;
        doc_content := NEW.email || ' ' || COALESCE(NEW.position, '') || ' ' || COALESCE(NEW.department, '');
        doc_url := '/profile/' || NEW.id; -- UPDATED
        doc_metadata := jsonb_build_object('role', NEW.role, 'position', NEW.position, 'department', NEW.department, 'avatar', NEW.avatar);

    ELSIF TG_TABLE_NAME = 'Reimbursement' THEN
        doc_title := 'Reembolso #' || NEW.protocolo;
        doc_content := NEW.descricao || ' ' || NEW."valorTotal"::text || ' ' || NEW.status;
        doc_url := '/reembolso/' || NEW.protocolo;
        doc_metadata := jsonb_build_object('status', NEW.status, 'created_at', NEW.created_at);

    ELSIF TG_TABLE_NAME = 'academy_courses' THEN
        doc_title := NEW.title;
        doc_content := NEW.description;
        doc_url := '/academy/course/' || NEW.id;
        doc_metadata := jsonb_build_object('category_id', NEW.category_id, 'instructor_id', NEW.instructor_id);

    ELSE
        RETURN NEW;
    END IF;

    -- Insert new entry
    INSERT INTO public.global_search_index (original_id, source_table, title, content, url, metadata)
    VALUES (NEW.id::text, TG_TABLE_NAME, doc_title, doc_content, doc_url, doc_metadata);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply
SELECT public.refresh_global_search_index();
