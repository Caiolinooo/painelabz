-- Tipos de evento de escala (marcadores/cores customizáveis) + round-trip OFF-C
-- Permite códigos de sistema (normal/fi/dba/stb/offc) e códigos customizados em gt_historico_embarques.tipo

-- 1) Relaxar CHECK de tipo em gt_historico_embarques
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE rel.relname = 'gt_historico_embarques'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%tipo%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE gt_historico_embarques DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

-- Aceitar tipos legados + códigos de escala (incl. offc e custom via regex alfanumérico)
ALTER TABLE gt_historico_embarques
  ADD CONSTRAINT gt_historico_embarques_tipo_check
  CHECK (
    tipo IN (
      'normal', 'dobra', 'folga_indenizada', 'standby', 'substituicao', 'treinamento',
      'fi', 'dba', 'stb', 'offc'
    )
    OR tipo ~ '^[a-z0-9_\-]{1,32}$'
  );

-- 2) Tabela de tipos/marcadores configuráveis
CREATE TABLE IF NOT EXISTS gt_tipos_evento_escala (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  display_code TEXT NOT NULL,
  label TEXT NOT NULL,
  bg_color TEXT NOT NULL DEFAULT '#e2efda',
  text_color TEXT NOT NULL DEFAULT '#00b050',
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  maps_to_db_tipo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT gt_tipos_evento_escala_codigo_format CHECK (codigo ~ '^[a-z0-9_\-]{1,32}$')
);

CREATE INDEX IF NOT EXISTS idx_gt_tipos_evento_ativo_ordem
  ON gt_tipos_evento_escala (ativo, ordem);

DROP TRIGGER IF EXISTS trg_gt_tipos_evento_escala_updated_at ON gt_tipos_evento_escala;
CREATE TRIGGER trg_gt_tipos_evento_escala_updated_at
  BEFORE UPDATE ON gt_tipos_evento_escala
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed tipos padrão (cores atuais da grade)
INSERT INTO gt_tipos_evento_escala
  (codigo, display_code, label, bg_color, text_color, ordem, ativo, is_system, maps_to_db_tipo)
VALUES
  ('normal', 'ON',    'Embarcado',           '#e2efda', '#00b050', 10, true, true, 'normal'),
  ('fi',     'FI',    'Folga Indenizada',     '#e2efda', '#00b050', 20, true, true, 'folga_indenizada'),
  ('dba',    'DBA',   'Dobra',               '#e2efda', '#00b050', 30, true, true, 'dobra'),
  ('stb',    'STB',   'StandBy',             '#f4cccc', '#cc0000', 40, true, true, 'standby'),
  ('offc',   'OFF-C', 'Troca de Turma',      '#f4cccc', '#cc0000', 50, true, true, 'offc')
ON CONFLICT (codigo) DO UPDATE SET
  display_code = EXCLUDED.display_code,
  label = EXCLUDED.label,
  bg_color = EXCLUDED.bg_color,
  text_color = EXCLUDED.text_color,
  ordem = EXCLUDED.ordem,
  is_system = EXCLUDED.is_system,
  maps_to_db_tipo = EXCLUDED.maps_to_db_tipo,
  updated_at = now();

-- 3) RLS
ALTER TABLE gt_tipos_evento_escala ENABLE ROW LEVEL SECURITY;

DO $policy$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'gt_tipos_evento_escala_select'
      AND tablename = 'gt_tipos_evento_escala'
  ) THEN
    CREATE POLICY gt_tipos_evento_escala_select ON gt_tipos_evento_escala
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users_unified
          WHERE id = auth.uid()
            AND (
              role IN ('ADMIN', 'MANAGER')
              OR (access_permissions->'modules'->>'gestao-tripulantes')::boolean = true
            )
        )
      );
  END IF;
END $policy$;

DO $policy$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'gt_tipos_evento_escala_admin_manager'
      AND tablename = 'gt_tipos_evento_escala'
  ) THEN
    CREATE POLICY gt_tipos_evento_escala_admin_manager ON gt_tipos_evento_escala
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users_unified
          WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users_unified
          WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER')
        )
      );
  END IF;
END $policy$;
