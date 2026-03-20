-- Migration: Create Purchase Requests Tables
-- Date: 2026-03-18
-- Description: Create tables for Requisição de Compra (RQF) functionality

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: purchase_requests
-- Stores the main purchase request data
CREATE TABLE purchase_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users_unified(id) ON DELETE CASCADE,
    sector_id UUID REFERENCES sectors(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'draft',
    total_value DECIMAL(12,2),
    observation TEXT,
    items JSONB[],
    approver_ids UUID[],
    history JSONB[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table: approval_flows
-- Stores the approval workflow steps for each purchase request
CREATE TABLE approval_flows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES purchase_requests(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    approver_id UUID REFERENCES users_unified(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    decision_date TIMESTAMP,
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table: generated_purchase_orders
-- Stores purchase orders generated from approved requests
CREATE TABLE generated_purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES purchase_requests(id) ON DELETE CASCADE,
    po_number VARCHAR(50),
    provider_name VARCHAR(200),
    total_value DECIMAL(12,2),
    items JSONB[],
    invoice_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- RLS Policies for purchase_requests
-- Users can only access their own requests
CREATE POLICY "Users can view their own purchase requests" ON purchase_requests
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own purchase requests" ON purchase_requests
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own purchase requests" ON purchase_requests
    FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for approval_flows
-- Only approvers can view/update their approval steps
CREATE POLICY "Approvers can view their approval steps" ON approval_flows
    FOR SELECT USING (approver_id = auth.uid());

CREATE POLICY "Approvers can update their approval steps" ON approval_flows
    FOR UPDATE USING (approver_id = auth.uid());

-- RLS Policies for generated_purchase_orders
-- Only the creator can view/update generated POs
CREATE POLICY "Creators can view their generated POs" ON generated_purchase_orders
    FOR SELECT USING (request_id IN (
        SELECT id FROM purchase_requests WHERE user_id = auth.uid()
    ));

-- Indexes for better query performance
CREATE INDEX idx_purchase_requests_user_id ON purchase_requests(user_id);
CREATE INDEX idx_purchase_requests_sector_id ON purchase_requests(sector_id);
CREATE INDEX idx_purchase_requests_status ON purchase_requests(status);
CREATE INDEX idx_purchase_requests_request_number ON purchase_requests(request_number);

CREATE INDEX idx_approval_flows_request_id ON approval_flows(request_id);
CREATE INDEX idx_approval_flows_approver_id ON approval_flows(approver_id);
CREATE INDEX idx_approval_flows_status ON approval_flows(status);

CREATE INDEX idx_generated_po_request_id ON generated_purchase_orders(request_id);
CREATE INDEX idx_generated_po_status ON generated_purchase_orders(status);

-- Function to generate RQF number
CREATE OR REPLACE FUNCTION generate_rqf_number(sector_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    sector_code VARCHAR(2);
    current_date_code VARCHAR(8);
    sequence_number INTEGER;
    base_rqf_number VARCHAR(50);
BEGIN
    -- Get sector code
    SELECT COALESCE(
        (SELECT name FROM sectors WHERE id = sector_id),
        'PO'
    ) INTO sector_code;
    
    -- Normalize sector code to 2 characters
    sector_code := UPPER(SUBSTRING(REPLACE(sector_code, ' ', ''), 1, 2));
    IF LENGTH(sector_code) < 2 THEN
        sector_code := LPAD(sector_code, 2, 'X');
    END IF;
    
    -- Get current date code
    current_date_code := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
    
    -- Build base RQF number
    base_rqf_number := 'RQF-' || current_date_code || '-' || sector_code;
    
    -- Get highest sequence number for today
    SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM '序[0-9]+$') AS INTEGER)), 0)
    INTO sequence_number
    FROM purchase_requests
    WHERE request_number LIKE base_rqf_number || '%';
    
    -- Return new RQF number
    RETURN base_rqf_number || '-' || LPAD((sequence_number + 1)::TEXT, 2, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to generate workflow number
CREATE OR REPLACE FUNCTION generate_workflow_number(sector_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    sector_code VARCHAR(2);
    current_date_code VARCHAR(8);
    sequence_number INTEGER;
    base_workflow_number VARCHAR(50);
BEGIN
    -- Get sector code
    SELECT COALESCE(
        (SELECT name FROM sectors WHERE id = sector_id),
        'PO'
    ) INTO sector_code;
    
    -- Normalize sector code to 2 characters
    sector_code := UPPER(SUBSTRING(REPLACE(sector_code, ' ', ''), 1, 2));
    IF LENGTH(sector_code) < 2 THEN
        sector_code := LPAD(sector_code, 2, 'X');
    END IF;
    
    -- Get current date code
    current_date_code := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
    
    -- Build base workflow number
    base_workflow_number := 'FLW-' || current_date_code || '-' || sector_code;
    
    -- Get highest sequence number for today
    SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM '序[0-9]+$') AS INTEGER)), 0)
    INTO sequence_number
    FROM purchase_requests
    WHERE request_number LIKE base_workflow_number || '%';
    
    -- Return new workflow number
    RETURN base_workflow_number || '-' || LPAD((sequence_number + 1)::TEXT, 2, '0');
END;
$$ LANGUAGE plpgsql;