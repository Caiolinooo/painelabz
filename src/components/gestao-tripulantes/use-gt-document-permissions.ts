'use client';

import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

/**
 * Quem pode editar/excluir treinamentos, ASOs, documentos e passaportes já
 * cadastrados no perfil do colaborador (`gt_documentos`). `hasFeature` já
 * libera ADMIN/MANAGER automaticamente; para USER depende da feature
 * `gestao-tripulantes.documents.edit` / `.delete` concedida em `/admin/users`.
 * Espelha o gate do servidor em `src/lib/gestao-tripulantes/documento-permissions.ts`.
 */
export function useGtDocumentPermissions() {
  const { hasFeature } = useSupabaseAuth();
  return {
    canEdit: hasFeature('gestao-tripulantes.documents.edit'),
    canDelete: hasFeature('gestao-tripulantes.documents.delete'),
  };
}
