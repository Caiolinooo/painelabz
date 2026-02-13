-- Migration: EPI Stock Control System
-- Created: 2026-02-12
-- Description: Tables for EPI inventory management with movement tracking

-- ==================== EPI STOCK TABLE ====================
CREATE TABLE IF NOT EXISTS epi_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    epi_type_id UUID NOT NULL REFERENCES epi_types(id) ON DELETE CASCADE,
    current_quantity INT NOT NULL DEFAULT 0,
    minimum_quantity INT NOT NULL DEFAULT 5,
    location TEXT DEFAULT '',
    last_restocked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(epi_type_id)
);

-- ==================== STOCK MOVEMENTS TABLE ====================
CREATE TABLE IF NOT EXISTS epi_stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_id UUID REFERENCES epi_stock(id) ON DELETE SET NULL,
    epi_type_id UUID NOT NULL REFERENCES epi_types(id) ON DELETE CASCADE,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('entry', 'exit', 'adjustment', 'return')),
    quantity INT NOT NULL,
    previous_quantity INT NOT NULL DEFAULT 0,
    new_quantity INT NOT NULL DEFAULT 0,
    reason TEXT,
    reference_id UUID, -- epi_registrations.id if applicable
    performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_epi_stock_type ON epi_stock(epi_type_id);
CREATE INDEX IF NOT EXISTS idx_epi_stock_movements_stock ON epi_stock_movements(stock_id);
CREATE INDEX IF NOT EXISTS idx_epi_stock_movements_type ON epi_stock_movements(epi_type_id);
CREATE INDEX IF NOT EXISTS idx_epi_stock_movements_created ON epi_stock_movements(created_at DESC);

-- ==================== RLS ====================
ALTER TABLE epi_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE epi_stock_movements ENABLE ROW LEVEL SECURITY;

-- Stock: anyone can read, only admins/managers/epi-permitted can write
CREATE POLICY "Anyone can read stock levels"
ON epi_stock FOR SELECT
USING (true);

CREATE POLICY "Admins can manage stock"
ON epi_stock FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM users_unified
        WHERE users_unified.id = auth.uid()
        AND (users_unified.role IN ('ADMIN', 'MANAGER') OR users_unified.access_permissions->>'epi' = 'true')
    )
);

-- Movements: anyone can read, only admins/managers/epi-permitted can insert
CREATE POLICY "Anyone can read stock movements"
ON epi_stock_movements FOR SELECT
USING (true);

CREATE POLICY "Admins can manage stock movements"
ON epi_stock_movements FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM users_unified
        WHERE users_unified.id = auth.uid()
        AND (users_unified.role IN ('ADMIN', 'MANAGER') OR users_unified.access_permissions->>'epi' = 'true')
    )
);

-- ==================== COMMENTS ====================
COMMENT ON TABLE epi_stock IS 'Controle de estoque de EPIs por tipo';
COMMENT ON TABLE epi_stock_movements IS 'Histórico de movimentações de estoque de EPI';
COMMENT ON COLUMN epi_stock.minimum_quantity IS 'Limite mínimo para alerta de estoque baixo';
COMMENT ON COLUMN epi_stock_movements.movement_type IS 'entry=entrada, exit=saída/entrega, adjustment=ajuste manual, return=devolução';
