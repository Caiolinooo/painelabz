/* Script to create suppliers and link to purchase_orders */

CREATE SEQUENCE IF NOT EXISTS supplier_seq START 1;

CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequential_id TEXT UNIQUE,
    trade_name TEXT NOT NULL,
    legal_name TEXT,
    document_number TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    address TEXT,
    city TEXT,
    state_uf TEXT,
    zip_code TEXT,
    bank_details TEXT,
    payment_terms TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Trigger to auto-generate sequential_id if not provided
CREATE OR REPLACE FUNCTION set_supplier_sequential_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sequential_id IS NULL THEN
    NEW.sequential_id := LPAD(NEXTVAL('supplier_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_supplier_sequential_id ON public.suppliers;
CREATE TRIGGER trg_set_supplier_sequential_id
  BEFORE INSERT ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION set_supplier_sequential_id();

-- RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Suppliers viewable by authenticated users" ON public.suppliers;
    CREATE POLICY "Suppliers viewable by authenticated users"
        ON public.suppliers FOR SELECT
        USING (auth.role() = 'authenticated');

    DROP POLICY IF EXISTS "Suppliers insertable by authenticated users" ON public.suppliers;
    CREATE POLICY "Suppliers insertable by authenticated users"
        ON public.suppliers FOR INSERT
        WITH CHECK (auth.role() = 'authenticated');

    DROP POLICY IF EXISTS "Suppliers updatable by authenticated users" ON public.suppliers;
    CREATE POLICY "Suppliers updatable by authenticated users"
        ON public.suppliers FOR UPDATE
        USING (auth.role() = 'authenticated')
        WITH CHECK (auth.role() = 'authenticated');

    DROP POLICY IF EXISTS "Suppliers deletable by admins" ON public.suppliers;
    CREATE POLICY "Suppliers deletable by admins"
        ON public.suppliers FOR DELETE
        USING (
            EXISTS (
                SELECT 1 FROM public.users_unified
                WHERE users_unified.id = auth.uid()
                AND users_unified.role IN ('admin', 'ADMIN')
            )
        );
END $$;

-- Alter purchase_orders to link to suppliers
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' AND column_name = 'supplier_id'
    ) THEN
        ALTER TABLE public.purchase_orders ADD COLUMN supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;
    END IF;
END $$;
