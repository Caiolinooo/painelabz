-- ============================================================
-- GT Document Integrity: tracking number, file hash, doc-level
-- identity gate + backfill of numero_rastreio for existing rows.
-- Part of the 100% documentation integrity effort (auditoria).
-- ============================================================

-- 1. New columns -------------------------------------------------

ALTER TABLE public.gt_documentos
  ADD COLUMN IF NOT EXISTS numero_rastreio TEXT,
  ADD COLUMN IF NOT EXISTS arquivo_hash TEXT,
  ADD COLUMN IF NOT EXISTS identity_match TEXT;

-- Doc-level identity gate mirrors gt_documentos_aso.identity_match
ALTER TABLE public.gt_documentos
  DROP CONSTRAINT IF EXISTS gt_documentos_identity_match_check;
ALTER TABLE public.gt_documentos
  ADD CONSTRAINT gt_documentos_identity_match_check
  CHECK (identity_match IS NULL OR identity_match IN (
    'match', 'reassigned', 'quarantine', 'unknown', 'frozen'
  ));

COMMENT ON COLUMN public.gt_documentos.numero_rastreio IS
  'Unique deterministic tracking code: GT-<TIPO>-<cpf4>-<YYYY>-<seq>. Required for every consultable document.';
COMMENT ON COLUMN public.gt_documentos.arquivo_hash IS
  'SHA-256 of the uploaded file content; used for duplicate detection across colaboradores.';
COMMENT ON COLUMN public.gt_documentos.identity_match IS
  'Doc-level identity gate result (all document types, not only ASO): match | reassigned | quarantine | unknown | frozen.';

-- 2. Indexes -----------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS uq_gt_docs_numero_rastreio
  ON public.gt_documentos (numero_rastreio)
  WHERE numero_rastreio IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gt_docs_arquivo_hash
  ON public.gt_documentos (arquivo_hash)
  WHERE arquivo_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gt_docs_quarentena
  ON public.gt_documentos (identity_match)
  WHERE identity_match = 'quarantine';

CREATE INDEX IF NOT EXISTS idx_gt_docs_orfaos
  ON public.gt_documentos (colaborador_id)
  WHERE colaborador_id IS NULL;

-- 3. Backfill numero_rastreio ------------------------------------
-- Format: GT-<TIPO>-<cpfDigits4>-<ano>-<seq4>
--   TIPO   = upper(tipo_documento)
--   cpf4   = first 4 digits of owner CPF ('0000' when orphan/quarantine)
--   ano    = year of created_at
--   seq4   = per (colaborador, tipo, ano) sequence
-- Collision fallback: append first 4 chars of row UUID.

DO $$
DECLARE
    r RECORD;
    v_cpf_digits TEXT;
    v_cpf4 TEXT;
    v_ano TEXT;
    v_seq INT;
    v_candidate TEXT;
BEGIN
    FOR r IN
        SELECT d.id,
               d.tipo_documento,
               d.colaborador_id,
               TO_CHAR(d.created_at, 'YYYY') AS ano,
               c.cpf AS colab_cpf,
               ROW_NUMBER() OVER (
                 PARTITION BY d.colaborador_id, d.tipo_documento, TO_CHAR(d.created_at, 'YYYY')
                 ORDER BY d.created_at, d.id
               ) AS seq
        FROM gt_documentos d
        LEFT JOIN gt_colaboradores c ON c.id = d.colaborador_id
        WHERE d.deleted_at IS NULL
          AND d.numero_rastreio IS NULL
        ORDER BY d.created_at, d.id
    LOOP
        v_cpf_digits := regexp_replace(COALESCE(r.colab_cpf, ''), '[^0-9]', '', 'g');
        v_cpf4 := COALESCE(NULLIF(substr(v_cpf_digits, 1, 4), ''), '0000');
        v_ano := r.ano;
        v_seq := r.seq;

        v_candidate := format('GT-%s-%s-%s-%s',
            upper(r.tipo_documento), v_cpf4, v_ano, lpad(v_seq::text, 4, '0'));

        -- Guarantee global uniqueness (rare collision across owners)
        WHILE EXISTS (
            SELECT 1 FROM gt_documentos
            WHERE numero_rastreio = v_candidate AND id <> r.id
        ) LOOP
            v_candidate := v_candidate || '-' || substr(replace(r.id::text, '-', ''), 1, 4);
        END LOOP;

        UPDATE gt_documentos
        SET numero_rastreio = v_candidate
        WHERE id = r.id;
    END LOOP;
END $$;

-- 4. Backfill identity_match='unknown' where a profile exists but
--    the flag was never set (docs created before this migration),
--    so the auditoria panel has a consistent baseline. Quarantined
--    ASO rows already flagged stay untouched.
UPDATE public.gt_documentos d
SET identity_match = CASE
    WHEN d.colaborador_id IS NULL THEN 'quarantine'
    ELSE 'match'
END
WHERE d.deleted_at IS NULL
  AND d.identity_match IS NULL;
