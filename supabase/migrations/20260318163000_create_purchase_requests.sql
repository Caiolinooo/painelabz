-- Tabela para Requisições de Compra
CREATE TABLE IF NOT EXISTS purchase_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rqf_number VARCHAR(50) UNIQUE,
    provider_name VARCHAR(200),
    provider_cnpj VARCHAR(20),
    provider_email VARCHAR(100),
    buyer_name VARCHAR(100),
    payment_terms VARCHAR(100),
    delivery_date DATE,
    delivery_address TEXT,
    observation TEXT,
    sector_id UUID REFERENCES sectors(id),
    total_value DECIMAL(12,2),
    status VARCHAR(20) DEFAULT 'draft',
    created_by UUID REFERENCES users_unified(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Tabela para Itens da Requisição de Compra
CREATE TABLE IF NOT EXISTS purchase_request_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_request_id UUID REFERENCES purchase_requests(id) ON DELETE CASCADE,
    description TEXT,
    quantity INTEGER,
    unit_value DECIMAL(12,2),
    total_value DECIMAL(12,2)
);

-- Tabela para Fluxo de Aprovação
CREATE TABLE IF NOT EXISTS approval_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_request_id UUID REFERENCES purchase_requests(id) ON DELETE CASCADE,
    current_step VARCHAR(20) DEFAULT 'pending',
    approved_by UUID REFERENCES users_unified(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_by UUID REFERENCES users_unified(id),
    rejected_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Tabela para OCs Geradas a partir de RQFs
CREATE TABLE IF NOT EXISTS generated_purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES purchase_requests(id) ON DELETE CASCADE,
    po_number VARCHAR(50),
    provider_name VARCHAR(200),
    total_value DECIMAL(12,2),
    items JSONB[],
    invoice_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_purchase_orders ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes (se houver) para evitar erros
DROP POLICY IF EXISTS "Permitir leitura para todos os usuários" ON purchase_requests;
DROP POLICY IF EXISTS "Permitir inserção para todos os usuários" ON purchase_requests;
DROP POLICY IF EXISTS "Permitir atualização para todos os usuários" ON purchase_requests;
DROP POLICY IF EXISTS "Permitir deleção para todos os usuários" ON purchase_requests;

DROP POLICY IF EXISTS "Permitir leitura para todos os usuários" ON purchase_request_items;
DROP POLICY IF EXISTS "Permitir inserção para todos os usuários" ON purchase_request_items;
DROP POLICY IF EXISTS "Permitir atualização para todos os usuários" ON purchase_request_items;
DROP POLICY IF EXISTS "Permitir deleção para todos os usuários" ON purchase_request_items;

DROP POLICY IF EXISTS "Permitir leitura para todos os usuários" ON approval_flows;
DROP POLICY IF EXISTS "Permitir inserção para todos os usuários" ON approval_flows;
DROP POLICY IF EXISTS "Permitir atualização para todos os usuários" ON approval_flows;

DROP POLICY IF EXISTS "Permitir leitura para todos os usuários" ON generated_purchase_orders;
DROP POLICY IF EXISTS "Permitir inserção para todos os usuários" ON generated_purchase_orders;
DROP POLICY IF EXISTS "Permitir atualização para todos os usuários" ON generated_purchase_orders;

-- Políticas
CREATE POLICY "Permitir leitura para todos os usuários" ON purchase_requests FOR SELECT USING (true);
CREATE POLICY "Permitir inserção para todos os usuários" ON purchase_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização para todos os usuários" ON purchase_requests FOR UPDATE USING (true);
CREATE POLICY "Permitir deleção para todos os usuários" ON purchase_requests FOR DELETE USING (true);

CREATE POLICY "Permitir leitura para todos os usuários" ON purchase_request_items FOR SELECT USING (true);
CREATE POLICY "Permitir inserção para todos os usuários" ON purchase_request_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização para todos os usuários" ON purchase_request_items FOR UPDATE USING (true);
CREATE POLICY "Permitir deleção para todos os usuários" ON purchase_request_items FOR DELETE USING (true);

CREATE POLICY "Permitir leitura para todos os usuários" ON approval_flows FOR SELECT USING (true);
CREATE POLICY "Permitir inserção para todos os usuários" ON approval_flows FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização para todos os usuários" ON approval_flows FOR UPDATE USING (true);

CREATE POLICY "Permitir leitura para todos os usuários" ON generated_purchase_orders FOR SELECT USING (true);
CREATE POLICY "Permitir inserção para todos os usuários" ON generated_purchase_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização para todos os usuários" ON generated_purchase_orders FOR UPDATE USING (true);
