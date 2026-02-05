-- Create the global search index table
CREATE TABLE IF NOT EXISTS public.global_search_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_id UUID,
    source_table TEXT NOT NULL,
    title TEXT,
    content TEXT,
    url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    search_vector TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('portuguese', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('portuguese', coalesce(content, '')), 'B') ||
        setweight(to_tsvector('portuguese', coalesce(metadata->>'category', '')), 'C')
    ) STORED
);

-- Create index for fast searching
CREATE INDEX IF NOT EXISTS idx_global_search_vector ON public.global_search_index USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_global_search_source ON public.global_search_index (source_table);
CREATE INDEX IF NOT EXISTS idx_global_search_original_id ON public.global_search_index (original_id);

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
        doc_content := NEW.content;
        doc_url := '/documents/' || NEW.id;
        doc_metadata := jsonb_build_object('created_at', NEW.created_at);
        
    ELSIF TG_TABLE_NAME = 'News' THEN
        doc_title := NEW.title;
        doc_content := NEW.content;
        doc_url := '/news/' || NEW.id;
        doc_metadata := jsonb_build_object('author', NEW.author, 'created_at', NEW.created_at);
        
    -- ELSIF TG_TABLE_NAME = 'policies' THEN ... (Table missing)
    -- ELSIF TG_TABLE_NAME = 'procedures' THEN ... (Table missing)
    -- ELSIF TG_TABLE_NAME = 'dashboard_cards' THEN ... (Table missing)
        
    ELSIF TG_TABLE_NAME = 'users_unified' THEN
        doc_title := NEW.first_name || ' ' || NEW.last_name;
        doc_content := NEW.email || ' ' || COALESCE(NEW.position, '') || ' ' || COALESCE(NEW.department, '');
        doc_url := '/admin/users/' || NEW.id;
        doc_metadata := jsonb_build_object('role', NEW.role, 'position', NEW.position, 'department', NEW.department);

    ELSIF TG_TABLE_NAME = 'academy_courses' THEN
        doc_title := NEW.title;
        doc_content := NEW.description;
        doc_url := '/academy/course/' || NEW.id;
        doc_metadata := jsonb_build_object('category', NEW.category, 'instructor', NEW.instructor);
        
    ELSIF TG_TABLE_NAME = 'Reimbursement' THEN
        doc_title := 'Reembolso ' || NEW.protocol;
        doc_content := NEW.description || ' - ' || NEW.status;
        doc_url := '/reembolso/' || NEW.protocol;
        doc_metadata := jsonb_build_object('amount', NEW.amount, 'status', NEW.status);
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

-- Create triggers
DROP TRIGGER IF EXISTS trg_update_search_documents ON public.documents;
CREATE TRIGGER trg_update_search_documents
AFTER INSERT OR UPDATE OR DELETE ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.handle_search_index_update();

DROP TRIGGER IF EXISTS trg_update_search_news ON public."News";
CREATE TRIGGER trg_update_search_news
AFTER INSERT OR UPDATE OR DELETE ON public."News"
FOR EACH ROW EXECUTE FUNCTION public.handle_search_index_update();

DROP TRIGGER IF EXISTS trg_update_search_users ON public.users_unified;
CREATE TRIGGER trg_update_search_users
AFTER INSERT OR UPDATE OR DELETE ON public.users_unified
FOR EACH ROW EXECUTE FUNCTION public.handle_search_index_update();

DROP TRIGGER IF EXISTS trg_update_search_academy ON public.academy_courses;
CREATE TRIGGER trg_update_search_academy
AFTER INSERT OR UPDATE OR DELETE ON public.academy_courses
FOR EACH ROW EXECUTE FUNCTION public.handle_search_index_update();

DROP TRIGGER IF EXISTS trg_update_search_reimbursement ON public."Reimbursement";
CREATE TRIGGER trg_update_search_reimbursement
AFTER INSERT OR UPDATE OR DELETE ON public."Reimbursement"
FOR EACH ROW EXECUTE FUNCTION public.handle_search_index_update();


-- Function to Full Refresh (for cron)
CREATE OR REPLACE FUNCTION public.refresh_global_search_index()
RETURNS void AS $$
BEGIN
    TRUNCATE TABLE public.global_search_index;
    
    INSERT INTO public.global_search_index (original_id, source_table, title, content, url, metadata)
    SELECT id, 'documents', title, content, '/documents/' || id, jsonb_build_object('created_at', created_at)
    FROM public.documents;

    INSERT INTO public.global_search_index (original_id, source_table, title, content, url, metadata)
    SELECT id, 'News', title, content, '/news/' || id, jsonb_build_object('author', author, 'created_at', created_at)
    FROM public."News";

    INSERT INTO public.global_search_index (original_id, source_table, title, content, url, metadata)
    SELECT id, 'users_unified', first_name || ' ' || last_name, email || ' ' || COALESCE(position, '') || ' ' || COALESCE(department, ''), '/admin/users/' || id, jsonb_build_object('role', role, 'position', position, 'department', department)
    FROM public.users_unified;

    INSERT INTO public.global_search_index (original_id, source_table, title, content, url, metadata)
    SELECT id, 'academy_courses', title, description, '/academy/course/' || id, jsonb_build_object('category', category, 'instructor', instructor)
    FROM public.academy_courses;
    
    INSERT INTO public.global_search_index (original_id, source_table, title, content, url, metadata)
    SELECT id, 'Reimbursement', 'Reembolso ' || protocol, description || ' - ' || status, '/reembolso/' || protocol, jsonb_build_object('amount', amount, 'status', status)
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

GRANT SELECT ON public.global_search_index TO authenticated;
GRANT SELECT ON public.global_search_index TO service_role;
GRANT ALL ON public.global_search_index TO service_role;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule('refresh_search_index_morning', '0 0 * * *', 'SELECT public.refresh_global_search_index()');
        PERFORM cron.schedule('refresh_search_index_noon', '0 12 * * *', 'SELECT public.refresh_global_search_index()');
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron not available or permission denied, skipping schedule';
END $$;
