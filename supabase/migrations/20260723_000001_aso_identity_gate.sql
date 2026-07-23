-- ASO identity gate: store OCR CPF + match status; align esocial_status CHECK with runtime values.
-- App normalizes CPF digits-only; SQL backfill of gt_colaboradores.cpf is optional (see tasks.md).

-- Allow orphan/quarantine docs (OCR CPF with no matching colaborador)
ALTER TABLE public.gt_documentos
  ALTER COLUMN colaborador_id DROP NOT NULL;

ALTER TABLE public.gt_documentos_aso
  ADD COLUMN IF NOT EXISTS cpf_documento TEXT,
  ADD COLUMN IF NOT EXISTS identity_match TEXT
    CHECK (identity_match IS NULL OR identity_match IN ('match', 'reassigned', 'quarantine', 'unknown', 'frozen'));

-- Expand CHECK to cover PoliWeb / UI / quarantine values used in code
ALTER TABLE public.gt_documentos_aso
  DROP CONSTRAINT IF EXISTS gt_documentos_aso_esocial_status_check;

ALTER TABLE public.gt_documentos_aso
  ADD CONSTRAINT gt_documentos_aso_esocial_status_check
  CHECK (esocial_status IS NULL OR esocial_status IN (
    'nao_enviado',
    'pendente',
    'pendente_revisao',
    'enviado',
    'processado',
    'erro',
    'erro_validacao',
    'quarentena'
  ));

CREATE INDEX IF NOT EXISTS idx_gt_aso_cpf_documento
  ON public.gt_documentos_aso (cpf_documento)
  WHERE cpf_documento IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gt_aso_esocial_status
  ON public.gt_documentos_aso (esocial_status);

COMMENT ON COLUMN public.gt_documentos_aso.cpf_documento IS
  'CPF digits-only extracted from ASO OCR; source of truth for identity gate before e-Social send.';
COMMENT ON COLUMN public.gt_documentos_aso.identity_match IS
  'match | reassigned | quarantine | unknown | frozen — result of OCR identity gate vs profile CPF.';

-- Optional SQL backfill (run manually when ready):
-- UPDATE gt_colaboradores SET cpf = regexp_replace(cpf, '[^0-9]', '', 'g')
-- WHERE cpf IS NOT NULL AND cpf ~ '[^0-9]';
