-- Fix Search URLs to be "Real redirections"

-- 1. Update the Trigger Function
CREATE OR REPLACE FUNCTION public.handle_search_index_update()
RETURNS TRIGGER AS $$
DECLARE
    doc_title TEXT;
    doc_content TEXT;
    doc_url TEXT;
    doc_metadata JSONB;
BEGIN
    -- Documents
    IF TG_TABLE_NAME = 'documents' THEN
        doc_title := NEW.title;
        doc_content := NEW.description;
        doc_url := COALESCE(NEW.file, '/documents/' || NEW.id);
        doc_metadata := jsonb_build_object('created_at', NEW.created_at, 'category', NEW.category);

    -- News
    ELSIF TG_TABLE_NAME = 'News' THEN
        doc_title := NEW.title;
        doc_content := NEW.content;
        doc_url := '/news/post/' || NEW.id;
        doc_metadata := jsonb_build_object('author', NEW.author, 'created_at', NEW."createdAt");

    -- Users
    ELSIF TG_TABLE_NAME = 'users_unified' THEN
        doc_title := NEW.first_name || ' ' || NEW.last_name;
        doc_content := NEW.email || ' ' || COALESCE(NEW.position, '') || ' ' || COALESCE(NEW.department, '');
        doc_url := '/admin/users?q=' || replace(doc_title, ' ', '+');
        doc_metadata := jsonb_build_object(
            'role', NEW.role,
            'position', NEW.position,
            'department', NEW.department,
            'avatar', NEW.avatar
        );

    -- Reimbursement
    ELSIF TG_TABLE_NAME = 'Reimbursement' THEN
        doc_title := 'Reembolso #' || NEW.protocolo;
        doc_content := NEW.descricao || ' ' || NEW."valorTotal"::text || ' ' || NEW.status;
        doc_url := '/reembolso/' || NEW.protocolo;
        doc_metadata := jsonb_build_object('status', NEW.status, 'created_at', NEW.created_at);

    -- Academy
    ELSIF TG_TABLE_NAME = 'academy_courses' THEN
        doc_title := NEW.title;
        doc_content := NEW.description;
        doc_url := '/academy/course/' || NEW.id;
        doc_metadata := jsonb_build_object('category_id', NEW.category_id, 'instructor_id', NEW.instructor_id);

    ELSE
        RETURN NEW;
    END IF;

    -- Update or Insert
    IF (TG_OP = 'DELETE') THEN
        DELETE FROM public.global_search_index 
        WHERE original_id = OLD.id::text AND source_table = TG_TABLE_NAME;
        RETURN OLD;
    ELSE
        -- Upsert logic
        UPDATE public.global_search_index
        SET title = doc_title, content = doc_content, url = doc_url, metadata = doc_metadata, updated_at = NOW()
        WHERE original_id = NEW.id::text AND source_table = TG_TABLE_NAME;
            
        IF NOT FOUND THEN
            INSERT INTO public.global_search_index (original_id, source_table, title, content, url, metadata)
            VALUES (NEW.id::text, TG_TABLE_NAME, doc_title, doc_content, doc_url, doc_metadata);
        END IF;

        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. Update the Refresh Function
CREATE OR REPLACE FUNCTION public.refresh_global_search_index()
RETURNS void AS $$
BEGIN
    TRUNCATE TABLE public.global_search_index;

    INSERT INTO public.global_search_index (original_id, source_table, title, content, url, metadata)
    SELECT 
        id::text, 
        'documents', 
        title, 
        description, 
        COALESCE(file, '/documents/' || id), 
        jsonb_build_object('created_at', created_at, 'category', category)
    FROM public.documents;

    INSERT INTO public.global_search_index (original_id, source_table, title, content, url, metadata)
    SELECT 
        id::text, 
        'News', 
        title, 
        content, 
        '/news/post/' || id, 
        jsonb_build_object('author', author, 'created_at', "createdAt")
    FROM public."News";

    INSERT INTO public.global_search_index (original_id, source_table, title, content, url, metadata)
    SELECT 
        id::text, 
        'users_unified', 
        first_name || ' ' || last_name, 
        email || ' ' || COALESCE(position, '') || ' ' || COALESCE(department, ''), 
        '/admin/users?q=' || replace(first_name || ' ' || last_name, ' ', '+'), 
        jsonb_build_object(
            'role', role,
            'position', position,
            'department', department,
            'avatar', avatar
        )
    FROM public.users_unified;

    INSERT INTO public.global_search_index (original_id, source_table, title, content, url, metadata)
    SELECT 
        id::text, 
        'academy_courses', 
        title, 
        description, 
        '/academy/course/' || id, 
        jsonb_build_object('category_id', category_id, 'instructor_id', instructor_id)
    FROM public.academy_courses;

    INSERT INTO public.global_search_index (original_id, source_table, title, content, url, metadata)
    SELECT 
        id::text, 
        'Reimbursement', 
        'Reembolso #' || protocolo, 
        descricao || ' ' || "valorTotal"::text || ' ' || status, 
        '/reembolso/' || protocolo, 
        jsonb_build_object('status', status, 'created_at', created_at)
    FROM public."Reimbursement";

    INSERT INTO public.global_search_index (original_id, source_table, title, content, url, metadata)
    VALUES 
        ('static_card_1', 'static_cards', 'Manual do Colaborador', 'Acesse o manual completo com normas e diretrizes.', '/manual', '{"icon": "FiBook", "color": "bg-blue-500"}'),
        ('static_card_2', 'static_cards', 'Políticas Internas', 'Consulte todas as políticas internas da empresa.', '/politicas', '{"icon": "FiFileText", "color": "bg-green-500"}'),
        ('static_card_3', 'static_cards', 'Organograma', 'Visualize a estrutura organizacional.', '/organograma', '{"icon": "FiUsers", "color": "bg-purple-500"}'),
        ('static_card_4', 'static_cards', 'Segurança da Informação', 'Diretrizes sobre segurança de dados e acessos.', '/seguranca', '{"icon": "FiShield", "color": "bg-red-500"}'),
        ('static_card_5', 'static_cards', 'Código de Ética', 'Nosso código de conduta e ética profissional.', '/etica', '{"icon": "FiCheckCircle", "color": "bg-yellow-500"}'),
        ('static_card_6', 'static_cards', 'Benefícios', 'Lista completa de benefícios e como utilizá-los.', '/beneficios', '{"icon": "FiGift", "color": "bg-pink-500"}'),
        ('static_card_7', 'static_cards', 'Calendário de Eventos', 'Fique por dentro dos próximos eventos corporativos.', '/calendario', '{"icon": "FiCalendar", "color": "bg-orange-500"}'),
        ('static_card_8', 'static_cards', 'Vagas Internas', 'Oportunidades de crescimento dentro da empresa.', '/vagas', '{"icon": "FiBriefcase", "color": "bg-teal-500"}'),
        ('static_card_9', 'static_cards', 'Suporte de TI', 'Abra chamados e solicite ajuda técnica.', '/suporte', '{"icon": "FiMonitor", "color": "bg-indigo-500"}'),
        ('static_card_10', 'static_cards', 'Reserva de Salas', 'Agende salas de reunião e espaços comuns.', '/reservas', '{"icon": "FiClock", "color": "bg-cyan-500"}'),
        ('static_card_11', 'static_cards', 'Universidade Corporativa', 'Acesse cursos e treinamentos online.', '/academy', '{"icon": "FiAward", "color": "bg-emerald-500"}'),
        ('static_card_12', 'static_cards', 'Portal do Colaborador', 'Acesse seu perfil e informações pessoais.', '/profile', '{"icon": "FiUser", "color": "bg-rose-500"}');

END;
$$ LANGUAGE plpgsql;

SELECT public.refresh_global_search_index();
