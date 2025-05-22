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
 */
const processChildren = (children: React.ReactNode): React.ReactNode => {
  return Children.map(children, child => {
    // Se for uma string e for um nome de ícone do Material Design
    if (typeof child === 'string' && materialIconNames.includes(child)) {
      return <MaterialIcon name={child} />;
    }

    // Se for um elemento React válido
    if (isValidElement(child)) {
      // Verificar se o nome da tag é um ícone do Material Design
      const elementType = child.type;
      if (
        typeof elementType === 'string' &&
        materialIconNames.includes(elementType)
      ) {
        // Substituir a tag pelo componente MaterialIcon
        return <MaterialIcon name={elementType} {...child.props} />;
      }

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
