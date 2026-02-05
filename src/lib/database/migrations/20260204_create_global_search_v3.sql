-- Function to handle updates content in the search index
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
        doc_content := NEW.description; -- documents uses description, not content
        doc_url := '/documents/' || NEW.id;
        doc_metadata := jsonb_build_object('created_at', NEW.created_at);
        
    ELSIF TG_TABLE_NAME = 'News' THEN
        doc_title := NEW.title;
        doc_content := NEW.content;
        doc_url := '/news/' || NEW.id;
        doc_metadata := jsonb_build_object('author', NEW.author, 'created_at', NEW."createdAt"); -- camelCase
        
    ELSIF TG_TABLE_NAME = 'users_unified' THEN
        doc_title := NEW.first_name || ' ' || NEW.last_name;
        doc_content := NEW.email || ' ' || COALESCE(NEW.position, '') || ' ' || COALESCE(NEW.department, '');
        doc_url := '/admin/users/' || NEW.id;
        doc_metadata := jsonb_build_object('role', NEW.role, 'position', NEW.position, 'department', NEW.department);

    ELSIF TG_TABLE_NAME = 'academy_courses' THEN
        doc_title := NEW.title;
        doc_content := COALESCE(NEW.description, NEW.short_description);
        doc_url := '/academy/course/' || NEW.id;
        doc_metadata := jsonb_build_object('category_id', NEW.category_id);
        
    ELSIF TG_TABLE_NAME = 'Reimbursement' THEN
        doc_title := 'Reembolso ' || NEW.protocolo; -- protocolo
        doc_content := COALESCE(NEW.descricao, '') || ' - ' || NEW.status; -- descricao
        doc_url := '/reembolso/' || NEW.protocolo;
        doc_metadata := jsonb_build_object('amount', COALESCE(NEW."valorTotal", NEW.valor_total), 'status', NEW.status);
    END IF;

    -- Update or Insert
    IF (TG_OP = 'DELETE') THEN
        DELETE FROM public.global_search_index 
        WHERE original_id = OLD.id AND source_table = TG_TABLE_NAME;
        RETURN OLD;
    ELSE
        -- Upsert logic
        UPDATE public.global_search_index
        SET title = doc_title, content = doc_content, url = doc_url, metadata = doc_metadata, updated_at = NOW()
        WHERE original_id = NEW.id AND source_table = TG_TABLE_NAME;
            
        IF NOT FOUND THEN
            INSERT INTO public.global_search_index (original_id, source_table, title, content, url, metadata)
            VALUES (NEW.id, TG_TABLE_NAME, doc_title, doc_content, doc_url, doc_metadata);
        END IF;

        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to Full Refresh (for cron)
CREATE OR REPLACE FUNCTION public.refresh_global_search_index()
RETURNS void AS $$
BEGIN
    TRUNCATE TABLE public.global_search_index;
    
    INSERT INTO public.global_search_index (original_id, source_table, title, content, url, metadata)
    SELECT id, 'documents', title, description, '/documents/' || id, jsonb_build_object('created_at', created_at)
    FROM public.documents;

    INSERT INTO public.global_search_index (original_id, source_table, title, content, url, metadata)
    SELECT id, 'News', title, content, '/news/' || id, jsonb_build_object('author', author, 'created_at', "createdAt")
    FROM public."News";

    INSERT INTO public.global_search_index (original_id, source_table, title, content, url, metadata)
    SELECT id, 'users_unified', first_name || ' ' || last_name, email || ' ' || COALESCE(position, '') || ' ' || COALESCE(department, ''), '/admin/users/' || id, jsonb_build_object('role', role, 'position', position, 'department', department)
    FROM public.users_unified;

    INSERT INTO public.global_search_index (original_id, source_table, title, content, url, metadata)
    SELECT id, 'academy_courses', title, COALESCE(description, short_description), '/academy/course/' || id, jsonb_build_object('category_id', category_id)
    FROM public.academy_courses;
    
    INSERT INTO public.global_search_index (original_id, source_table, title, content, url, metadata)
    SELECT id, 'Reimbursement', 'Reembolso ' || protocolo, COALESCE(descricao, '') || ' - ' || status, '/reembolso/' || protocolo, jsonb_build_object('amount', COALESCE("valorTotal", valor_total), 'status', status)
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
