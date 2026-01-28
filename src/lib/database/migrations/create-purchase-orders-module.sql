-- Create purchase_order_configs table
CREATE TABLE IF NOT EXISTS purchase_order_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sector_id UUID NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
    max_value DECIMAL(15, 2) DEFAULT 0.00,
    approver_emails TEXT[], -- Array of email strings for notifications
    cost_centers TEXT[], -- Array of allowed cost centers
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sector_id)
);

-- RLS for configs
ALTER TABLE purchase_order_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Configs viewable by authenticated users"
    ON purchase_order_configs FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Configs editable by admins"
    ON purchase_order_configs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users_unified
            WHERE users_unified.id = auth.uid()
            AND users_unified.role IN ('admin', 'ADMIN')
        )
    );

-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users_unified(id), -- Requester
    sector_id UUID NOT NULL REFERENCES sectors(id),
    
    po_number TEXT, -- Generated ID, e.g., "2026-01-26-HM"
    status TEXT NOT NULL DEFAULT 'draft', -- draft, submitted, approved, rejected
    
    -- Header info
    requisition_date DATE DEFAULT CURRENT_DATE,
    
    -- Provider info
    provider_name TEXT,
    provider_trade_name TEXT, -- Nome fantasia
    provider_cnpj TEXT,
    provider_email TEXT,
    
    -- Delivery info
    payment_terms TEXT, -- Condições de pagamento
    buyer_name TEXT, -- Responsável pela compra
    delivery_date DATE,
    freight_cost DECIMAL(15, 2) DEFAULT 0.00,
    delivery_address TEXT,
    observation TEXT,
    
    -- Files
    invoice_url TEXT,
    
    total_value DECIMAL(15, 2) DEFAULT 0.00,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for purchase_orders
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

-- Users can view their own POs, or POs from their sector (optional), or Admins view all
CREATE POLICY "Users can view relevant POs"
    ON purchase_orders FOR SELECT
    USING (
        auth.uid() = user_id OR
        EXISTS ( -- Admin check
             SELECT 1 FROM users_unified
             WHERE users_unified.id = auth.uid()
             AND users_unified.role IN ('admin', 'ADMIN')
        )
    );

CREATE POLICY "Users can create POs"
    ON purchase_orders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own draft POs"
    ON purchase_orders FOR UPDATE
    USING (auth.uid() = user_id AND status = 'draft');
    
-- Create purchase_order_items table
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(15, 2) NOT NULL DEFAULT 1,
    unit_value DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total_value DECIMAL(15, 2), -- Calculated in app or trigger
    cost_center TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for items
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Items viewable by auth"
    ON purchase_order_items FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Items manageable by owner via PO"
    ON purchase_order_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM purchase_orders
            WHERE purchase_orders.id = purchase_order_items.po_id
            AND (purchase_orders.user_id = auth.uid() OR purchase_orders.status = 'draft')
        )
    );
