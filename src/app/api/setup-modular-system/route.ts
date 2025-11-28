import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdminFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const { isAdmin } = await isAdminFromRequest(request);

        if (!isAdmin) {
            return NextResponse.json(
                { error: 'Acesso negado. Apenas administradores podem executar esta operação.' },
                { status: 403 }
            );
        }

        // SQL to create the necessary tables
        const sql = `
      -- Enable UUID extension if not exists
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      -- Table: sys_modules
      CREATE TABLE IF NOT EXISTS sys_modules (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        key TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        table_name TEXT,
        is_system BOOLEAN DEFAULT FALSE,
        permissions JSONB DEFAULT '{"read": ["admin", "manager", "user"], "write": ["admin", "manager"]}'::jsonb,
        enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Table: sys_fields
      CREATE TABLE IF NOT EXISTS sys_fields (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        module_id UUID NOT NULL REFERENCES sys_modules(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        label TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('text', 'textarea', 'number', 'date', 'boolean', 'select', 'file', 'relation', 'rich_text')),
        required BOOLEAN DEFAULT FALSE,
        options JSONB, -- For select options, validation rules, or relation config
        "order" INTEGER DEFAULT 0,
        is_list_visible BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(module_id, name)
      );

      -- Table: sys_dynamic_records
      -- This table stores data for modules that don't have their own dedicated table
      CREATE TABLE IF NOT EXISTS sys_dynamic_records (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        module_id UUID NOT NULL REFERENCES sys_modules(id) ON DELETE CASCADE,
        data JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_by UUID, -- Reference to auth.users or users_unified
        updated_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Index for faster querying of dynamic records
      CREATE INDEX IF NOT EXISTS idx_sys_dynamic_records_module_id ON sys_dynamic_records(module_id);
      CREATE INDEX IF NOT EXISTS idx_sys_dynamic_records_data ON sys_dynamic_records USING gin (data);

      -- Function to update updated_at timestamp
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      -- Triggers
      DROP TRIGGER IF EXISTS update_sys_modules_updated_at ON sys_modules;
      CREATE TRIGGER update_sys_modules_updated_at
      BEFORE UPDATE ON sys_modules
      FOR EACH ROW
      EXECUTE PROCEDURE update_updated_at_column();

      DROP TRIGGER IF EXISTS update_sys_fields_updated_at ON sys_fields;
      CREATE TRIGGER update_sys_fields_updated_at
      BEFORE UPDATE ON sys_fields
      FOR EACH ROW
      EXECUTE PROCEDURE update_updated_at_column();

      DROP TRIGGER IF EXISTS update_sys_dynamic_records_updated_at ON sys_dynamic_records;
      CREATE TRIGGER update_sys_dynamic_records_updated_at
      BEFORE UPDATE ON sys_dynamic_records
      FOR EACH ROW
      EXECUTE PROCEDURE update_updated_at_column();
    `;

        // Execute SQL using RPC if available, or raw query if using a direct client that supports it.
        // Since supabase-js doesn't support raw SQL directly on the client without a stored procedure,
        // we assume there is an 'exec_sql' or similar RPC function available from previous setup scripts.
        // If not, we might need to instruct the user to run this SQL in the Supabase SQL Editor.

        // Attempt to use 'exec_sql' RPC which is common in this project's scripts
        const { error } = await supabaseAdmin.rpc('exec_sql', { sql_query: sql });

        if (error) {
            console.error('Error executing SQL via RPC:', error);

            // Fallback: Return the SQL so the user can run it manually if RPC fails
            return NextResponse.json({
                success: false,
                message: 'Could not execute SQL automatically. Please run the provided SQL in your Supabase SQL Editor.',
                error: error.message,
                sql: sql
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Modular system tables setup successfully.'
        });

    } catch (error) {
        console.error('Error setting up modular system:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
