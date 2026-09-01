'use client';

import React from 'react';
import CollaboratorDocumentsCatalog from '@/components/admin/CollaboratorDocumentsCatalog';

interface Props {
  colaboradorId: string;
}

export default function QhseTab({ colaboradorId }: Props) {
  return (
    <div className="p-6">
      <CollaboratorDocumentsCatalog colaboradorId={colaboradorId} onlyQhse />
    </div>
  );
}
