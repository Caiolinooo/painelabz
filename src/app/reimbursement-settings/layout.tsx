import React from 'react';
import { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Configurações de Email de Reembolso | ABZ',
  description: 'Configure as opções de envio de email para suas solicitações de reembolso.',
};

export default function ReimbursementSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <main>{children}</main>
    </div>
  );
}
