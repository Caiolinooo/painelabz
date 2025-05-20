import { Suspense } from 'react';
import AvaliacaoAdminContentWrapper from '@/components/admin/avaliacao/AvaliacaoAdminContentWrapper';

export default function AvaliacaoAdminPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AvaliacaoAdminContentWrapper />
    </Suspense>
  );
}
