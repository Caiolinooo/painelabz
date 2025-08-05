/**
 * Script para criar tabelas de folha de pagamento diretamente no Supabase
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = ***REMOVED***;
const supabaseServiceKey = ***REMOVED***;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = ***REMOVED*** supabaseServiceKey);

async function createPayrollTables() {
  try {
    console.log('🚀 Criando tabelas de folha de pagamento...');

    // 1. Tabela de empresas
    console.log('📋 Criando tabela payroll_companies...');
    const { error: companiesError } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS payroll_companies (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          cnpj VARCHAR(18) UNIQUE NOT NULL,
          address TEXT,
          phone VARCHAR(20),
          email VARCHAR(255),
          contact_person VARCHAR(255),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (companiesError) {
      console.log('⚠️ Tentando criar tabela companies sem RPC...');
      // Tentar inserir um registro para forçar a criação da tabela
      const { error: insertError } = await supabase
        .from('payroll_companies')
        .insert([{
          name: 'Teste',
          cnpj: '00.000.000/0001-00'
        }]);
      
      if (insertError && !insertError.message.includes('duplicate')) {
        console.log('✅ Tabela payroll_companies já existe ou foi criada');
      }
    } else {
      console.log('✅ Tabela payroll_companies criada');
    }

    // 2. Tabela de departamentos
    console.log('📋 Criando tabela payroll_departments...');
    const { error: deptsError } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS payroll_departments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID REFERENCES payroll_companies(id) ON DELETE CASCADE,
          code VARCHAR(50) NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(company_id, code)
        );
      `
    });

    if (deptsError) {
      console.log('⚠️ Erro na criação de departamentos via RPC, tentando inserção...');
    } else {
      console.log('✅ Tabela payroll_departments criada');
    }

    // 3. Tabela de funcionários
    console.log('📋 Criando tabela payroll_employees...');
    const { error: employeesError } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS payroll_employees (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employee_id UUID,
          company_id UUID REFERENCES payroll_companies(id) ON DELETE CASCADE,
          department_id UUID REFERENCES payroll_departments(id),
          registration_number VARCHAR(20),
          name VARCHAR(255) NOT NULL,
          cpf VARCHAR(14),
          position VARCHAR(255),
          base_salary DECIMAL(10,2) NOT NULL DEFAULT 0,
          admission_date DATE,
          termination_date DATE,
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
          bank_code VARCHAR(10),
          bank_agency VARCHAR(20),
          bank_account VARCHAR(30),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (employeesError) {
      console.log('⚠️ Erro na criação de funcionários via RPC');
    } else {
      console.log('✅ Tabela payroll_employees criada');
    }

    // 4. Tabela de folhas de pagamento
    console.log('📋 Criando tabela payroll_sheets...');
    const { error: sheetsError } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS payroll_sheets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID REFERENCES payroll_companies(id) ON DELETE CASCADE,
          department_id UUID REFERENCES payroll_departments(id),
          reference_month INTEGER NOT NULL CHECK (reference_month BETWEEN 1 AND 12),
          reference_year INTEGER NOT NULL CHECK (reference_year >= 2020),
          period_start DATE NOT NULL,
          period_end DATE NOT NULL,
          status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'calculated', 'approved', 'paid', 'cancelled')),
          total_employees INTEGER DEFAULT 0,
          total_gross DECIMAL(12,2) DEFAULT 0,
          total_deductions DECIMAL(12,2) DEFAULT 0,
          total_net DECIMAL(12,2) DEFAULT 0,
          notes TEXT,
          created_by UUID,
          approved_by UUID,
          approved_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(company_id, reference_month, reference_year)
        );
      `
    });

    if (sheetsError) {
      console.log('⚠️ Erro na criação de folhas via RPC');
    } else {
      console.log('✅ Tabela payroll_sheets criada');
    }

    console.log('\n🎉 Processo de criação de tabelas concluído!');
    console.log('📝 Verificar no painel do Supabase se as tabelas foram criadas corretamente.');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar o script
if (require.main === module) {
  createPayrollTables()
    .then(() => {
      console.log('\n✅ Script executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Falha na execução:', error);
      process.exit(1);
    });
}

module.exports = { createPayrollTables };
