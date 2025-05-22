'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

interface ClientButtonProps {
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}

/**
 * Um componente de botão que pode ser usado em componentes do servidor
 * Este componente é um Client Component que encapsula o evento onClick
 */
export default function ClientButton({ onClick, className, children }: ClientButtonProps) {
  return (
    <Button onClick={onClick} className={className}>
      {children}
    </Button>
  );
}
