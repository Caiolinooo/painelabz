-- Fix mapping for documents in global search (use description instead of content)
-- Fix mapping for News (use createdAt instead of created_at)
-- Fix mapping for Academy (category_id, instructor_id)
-- Fix mapping for Reimbursement (descricao, protocolo, valorTotal)
-- Fix UUID casting for original_id (cast to text)

-- 1. Update the trigger function
CREATE OR REPLACE FUNCTION public.handle_search_index_update()
RETURNS TRIGGER AS $$
DECLARE
    doc_title TEXT;
    doc_content TEXT;
    doc_url TEXT;
    doc_metadata JSONB;
BEGIN
    -- Determine logic based on table name (case sensitive checks if needed)
    IF TG_TABLE_NAME = 'documents' THEN
        doc_title := NEW.title;
        doc_content := NEW.description; -- CHANGED: content -> description
        doc_url := '/documents/' || NEW.id;
        doc_metadata := jsonb_build_object('created_at', NEW.created_at);
        
    ELSIF TG_TABLE_NAME = 'News' THEN
        doc_title := NEW.title;
        doc_content := NEW.content;
        doc_url := '/news/' || NEW.id;
        doc_metadata := jsonb_build_object('author', NEW.author, 'created_at', NEW."createdAt"); -- CHANGED: created_at -> "createdAt"
        
    ELSIF TG_TABLE_NAME = 'users_unified' THEN
        doc_title := NEW.first_name || ' ' || NEW.last_name;
        doc_content := NEW.email || ' ' || COALESCE(NEW.position, '') || ' ' || COALESCE(NEW.department, '');
        doc_url := '/admin/users/' || NEW.id;
        doc_metadata := jsonb_build_object('role', NEW.role, 'position', NEW.position, 'department', NEW.department);

    ELSIF TG_TABLE_NAME = 'academy_courses' THEN
        doc_title := NEW.title;
        doc_content := NEW.description;
        doc_url := '/academy/course/' || NEW.id;
        doc_metadata := jsonb_build_object('category', NEW.category_id, 'instructor', NEW.instructor_id); -- CHANGED: _id suffix
        
    ELSIF TG_TABLE_NAME = 'Reimbursement' THEN
        doc_title := 'Reembolso ' || NEW.protocolo; -- CHANGED: protocol -> protocolo
        doc_content := NEW.descricao || ' - ' || NEW.status; -- CHANGED: description -> descricao
        doc_url := '/reembolso/' || NEW.protocolo; -- CHANGED: protocol -> protocolo
        doc_metadata := jsonb_build_object('amount', NEW."valorTotal", 'status', NEW.status); -- CHANGED: amount -> valorTotal
    END IF;

    -- Update or Insert
    IF (TG_OP = 'DELETE') THEN
        DELETE FROM public.global_search_index 
        WHERE original_id = OLD.id::text AND source_table = TG_TABLE_NAME; -- CAST TO TEXT
        RETURN OLD;
    ELSE
        -- Upsert logic
        UPDATE public.global_search_index
        SET title = doc_title, content = doc_content, url = doc_url, metadata = doc_metadata, updated_at = NOW()
        WHERE original_id = NEW.id::text AND source_table = TG_TABLE_NAME; -- CAST TO TEXT
            
        IF NOT FOUND THEN
            INSERT INTO public.global_search_index (original_id, source_table, title, content, url, metadata)
            VALUES (NEW.id::text, TG_TABLE_NAME, doc_title, doc_content, doc_url, doc_metadata); -- CAST TO TEXT
        END IF;

        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. Update the Full Refresh function
CREATE OR REPLACE FUNCTION public.refresh_global_search_index()
RETURNS void AS $$
BEGIN
    TRUNCATE TABLE public.global_search_index;
    
    -- Documents: Use description as content
    INSERT INTO public.global_search_index (original_id, source_table, title, content, url, metadata)
    SELECT id::text, 'documents', title, description, '/documents/' || id, jsonb_build_object('created_at', created_at)
    FROM public.documents;

    -- News: Use "createdAt"
    INSERT INTO public.global_search_index (original_id, source_table, title, content, url, metadata)
    SELECT id::text, 'News', title, content, '/news/' || id, jsonb_build_object('author', author, 'created_at', "createdAt")
    FROM public."News";

    INSERT INTO public.global_search_index (original_id, source_table, title, content, url, metadata)
    SELECT id::text, 'users_unified', first_name || ' ' || last_name, email || ' ' || COALESCE(position, '') || ' ' || COALESCE(department, ''), '/admin/users/' || id, jsonb_build_object('role', role, 'position', position, 'department', department)
    FROM public.users_unified;

    -- Academy: Use category_id and instructor_id
    INSERT INTO public.global_search_index (original_id, source_table, title, content, url, metadata)
    SELECT id::text, 'academy_courses', title, description, '/academy/course/' || id, jsonb_build_object('category', category_id, 'instructor', instructor_id)
    FROM public.academy_courses;
    
    -- Reimbursement: Use correct Portuguese column names
    INSERT INTO public.global_search_index (original_id, source_table, title, content, url, metadata)
    SELECT id::text, 'Reimbursement', 'Reembolso ' || protocolo, descricao || ' - ' || status, '/reembolso/' || protocolo, jsonb_build_object('amount', "valorTotal", 'status', status)
    FROM public."Reimbursement";
    
    -- Static cards injection
    INSERT INTO public.global_search_index (source_table, title, content, url, metadata)
    VALUES 
    ('static_cards', 'Manual do Colaborador', 'Acesse o manual completo do colaborador', '/manual', '{"category": "Documentação"}'::jsonb),
    ('static_cards', 'Manual Logístico', 'Manual específico para área de logística', '/manual', '{"category": "Logística"}'::jsonb),
    ('static_cards', 'Procedimentos de Logística', 'Consulte os procedimentos padrões da área', '/procedimentos-logistica', '{"category": "Procedimentos"}'::jsonb),
    ('static_cards', 'Políticas', 'Consulte as políticas da empresa', '/politicas', '{"category": "Políticas"}'::jsonb),
    ('static_cards', 'Procedimentos Gerais', 'Consulte os procedimentos gerais da empresa', '/procedimentos', '{"category": "Procedimentos"}'::jsonb),
    ('static_cards', 'Calendário', 'Consulte o calendário de eventos e feriados', '/calendario', '{"category": "Agenda"}'::jsonb),
    ('static_cards', 'Notícias', 'Fique por dentro das últimas notícias da empresa', '/noticias', '{"category": "Comunicação"}'::jsonb),
    ('static_cards', 'Reembolso', 'Solicite reembolsos de despesas', '/reembolso', '{"category": "Financeiro", "keywords": "reembolso, reimbursement, refund, expense, despesa"}'::jsonb),
    ('static_cards', 'Contracheque', 'Acesse seus contracheques', '/contracheque', '{"category": "Financeiro", "keywords": "contracheque, payslip, holerite, salary, income"}'::jsonb),
    ('static_cards', 'Ponto', 'Registre seu ponto e consulte seu histórico', '/ponto', '{"category": "RH", "keywords": "ponto, timesheet, clock, time, hora, frequencia"}'::jsonb),
    ('static_cards', 'Avaliação de Desempenho', 'Sistema de avaliação de desempenho', '/avaliacao', '{"category": "RH", "keywords": "avaliacao, desempenho, performance, review, evaluation, feedback"}'::jsonb),
    ('static_cards', 'Folha de Pagamento', 'Gerencie a folha de pagamento dos colaboradores', '/folha-pagamento', '{"category": "Financeiro", "keywords": "folha, pagamento, payroll, salary, salario"}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- 3. Force a refresh now to populated index
SELECT public.refresh_global_search_index();
