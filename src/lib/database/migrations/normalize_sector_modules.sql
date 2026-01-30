-- Migration to normalize module IDs in sectors table
-- Replaces legacy IDs with standard system IDs and removes duplicates

UPDATE sectors
SET allowed_modules = (
  SELECT array_agg(DISTINCT CASE
    WHEN elem = 'purchase-orders' THEN 'compras'
    WHEN elem = 'purchase orders' THEN 'compras'
    WHEN elem = 'ordens de compra' THEN 'compras'
    WHEN elem = 'kpis' THEN 'kpi'
    WHEN elem = 'wk radar' THEN 'wkradar'
    WHEN elem = 'radar' THEN 'wkradar'
    WHEN elem = 'lista de ramais' THEN 'contatos'
    WHEN elem = 'ramais' THEN 'contatos'
    WHEN elem = 'emergência' THEN 'emergencia'
    WHEN elem = 'guia offshore' THEN 'guia_offshore'
    WHEN elem = 'integração erp' THEN 'integracao-erp'
    WHEN elem = 'integracao erp' THEN 'integracao-erp'
    ELSE elem
  END)
  FROM unnest(allowed_modules) AS elem
)
WHERE allowed_modules IS NOT NULL;
