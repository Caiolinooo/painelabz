-- =============================================================
-- MIO Sync consolidado (Gestão de Tripulantes)
-- 1) gt_colaboradores.ativo: marcação de integrante removido do
--    MIO como INATIVO (nunca deletar linhas origem='mio').
-- 2) Índices para upsert idempotente por chaves naturais:
--    mio_id, gt_documentos.origem_ref e
--    gt_historico_embarques.mio_embarque_id.
-- =============================================================

ALTER TABLE gt_colaboradores
    ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_gt_colab_mio_id ON gt_colaboradores(mio_id);
CREATE INDEX IF NOT EXISTS idx_gt_colab_origem ON gt_colaboradores(origem);

CREATE INDEX IF NOT EXISTS idx_gt_doc_origem_ref ON gt_documentos(origem_ref);

CREATE INDEX IF NOT EXISTS idx_gt_emb_mio_id ON gt_historico_embarques(mio_embarque_id);
