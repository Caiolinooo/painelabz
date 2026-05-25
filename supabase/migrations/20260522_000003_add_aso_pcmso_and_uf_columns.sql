-- Adiciona colunas para médico responsável pelo PCMSO e UF do CRM na tabela gt_documentos_aso
ALTER TABLE public.gt_documentos_aso 
ADD COLUMN IF NOT EXISTS medico_uf VARCHAR(2),
ADD COLUMN IF NOT EXISTS medico_pcmso_nome VARCHAR(255),
ADD COLUMN IF NOT EXISTS medico_pcmso_crm VARCHAR(50),
ADD COLUMN IF NOT EXISTS medico_pcmso_uf VARCHAR(2);
