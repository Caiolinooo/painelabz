-- Script para limpar TODOS os títulos e descrições
-- Execute este script no Supabase SQL Editor

-- LIMPAR TUDO DE UMA VEZ
UPDATE "SiteConfig"
SET
  "sidebarTitle" = NULL,
  "dashboardTitle" = NULL,
  "dashboardDescription" = NULL
WHERE id = 'default';

-- Verificar o resultado
SELECT
  id,
  title,
  "sidebarTitle",
  "dashboardTitle",
  "dashboardDescription"
FROM "SiteConfig";
