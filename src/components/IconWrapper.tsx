'use client';

import React, { Children, isValidElement, cloneElement } from 'react';
import MaterialIcon from './MaterialIcon';

interface IconWrapperProps {
  children: React.ReactNode;
}

// Lista de nomes de ícones do Material Design que precisam ser substituídos
const materialIconNames = [
  'book', 'description', 'policy', 'calendar_today', 'newspaper',
  'receipt', 'payments', 'schedule', 'assessment', 'admin_panel_settings',
  'dashboard', 'people', 'person', 'settings', 'menu', 'close', 'logout',
  'layers', 'list', 'edit', 'image', 'check', 'alert', 'info', 'warning',
  'error', 'success'
];

/**
 * Função recursiva para processar os filhos e substituir tags de ícones
 * Usando uma abordagem mais segura que não tenta usar tags HTML como componentes
 */
const processChildren = (children: React.ReactNode): React.ReactNode => {
  return Children.map(children, child => {
    // Se for uma string, não tentar processá-la como um ícone
    if (typeof child === 'string') {
      return child;
    }

    // Se for um elemento React válido
    if (isValidElement(child)) {
      // Não tentamos mais substituir tags HTML diretamente
      // Em vez disso, usamos componentes React adequados

      // Se tiver filhos, processar recursivamente
      if (child.props.children) {
        // Clone o elemento com os filhos processados
        return cloneElement(
          child,
          { ...child.props },
          processChildren(child.props.children)
        );
      }
    }

    // Caso contrário, retornar o filho sem modificações
    return child;
  });
};

/**
 * Componente que intercepta e substitui tags de ícones do Material Design
 * por componentes React apropriados.
 */
const IconWrapper: React.FC<IconWrapperProps> = ({ children }) => {
  // Processar os filhos recursivamente
  const processedChildren = processChildren(children);

  // Retornar os filhos processados
  return <>{processedChildren}</>;
};

export default IconWrapper;
