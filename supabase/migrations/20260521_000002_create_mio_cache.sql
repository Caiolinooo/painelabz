CREATE TABLE IF NOT EXISTS mio_cache (
    tipo TEXT PRIMARY KEY,
    dados JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_registros INTEGER NOT NULL DEFAULT 0,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE mio_cache ENABLE ROW LEVEL SECURITY;
GRANT ALL ON mio_cache TO service_role;
GRANT SELECT ON mio_cache TO anon, authenticated;

CREATE POLICY "Todos podem ler cache MIO"
    ON mio_cache FOR SELECT
    USING (true);

CREATE POLICY "Apenas service_role pode escrever cache MIO"
    ON mio_cache FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Apenas service_role pode atualizar cache MIO"
    ON mio_cache FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Apenas service_role pode deletar cache MIO"
    ON mio_cache FOR DELETE
    USING (true);
