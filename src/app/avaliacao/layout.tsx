'use client';

import ProtectedRoute from '@/components/Auth/ProtectedRoute';

export default function AvaliacaoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute moduleName="avaliacao">
      {children}
    </ProtectedRoute>
  );
}
