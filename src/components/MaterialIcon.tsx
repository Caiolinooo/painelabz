'use client';

import React from 'react';
import { IconType } from 'react-icons';
import * as FiIcons from 'react-icons/fi';

// Mapeamento de nomes de ícones do Material Design para ícones do react-icons/fi
const iconMap: Record<string, IconType> = {
  // Ícones mencionados nos erros
  book: FiIcons.FiBookOpen,
  description: FiIcons.FiFileText,
  policy: FiIcons.FiShield,
  calendar_today: FiIcons.FiCalendar,
  newspaper: FiIcons.FiRss,
  receipt: FiIcons.FiFileText,
  payments: FiIcons.FiDollarSign,
  schedule: FiIcons.FiClock,
  assessment: FiIcons.FiBarChart2,
  admin_panel_settings: FiIcons.FiSettings,
  
  // Outros ícones comuns que podem ser usados
  dashboard: FiIcons.FiGrid,
  people: FiIcons.FiUsers,
  person: FiIcons.FiUser,
  settings: FiIcons.FiSettings,
  menu: FiIcons.FiMenu,
  close: FiIcons.FiX,
  logout: FiIcons.FiLogOut,
  layers: FiIcons.FiLayers,
  list: FiIcons.FiList,
  edit: FiIcons.FiEdit,
  image: FiIcons.FiImage,
  check: FiIcons.FiCheck,
  alert: FiIcons.FiAlertCircle,
  info: FiIcons.FiInfo,
  warning: FiIcons.FiAlertCircle,
  error: FiIcons.FiAlertCircle,
  success: FiIcons.FiCheck,
};

interface MaterialIconProps {
  name: string;
  className?: string;
  size?: number;
  color?: string;
}

const MaterialIcon: React.FC<MaterialIconProps> = ({ 
  name, 
  className = '', 
  size, 
  color 
}) => {
  // Verificar se o ícone existe no mapeamento
  const IconComponent = iconMap[name];
  
  // Se o ícone não existir, usar um ícone padrão
  if (!IconComponent) {
    console.warn(`Ícone "${name}" não encontrado. Usando ícone padrão.`);
    return <FiIcons.FiHelpCircle className={className} size={size} color={color} />;
  }
  
  // Renderizar o ícone
  return <IconComponent className={className} size={size} color={color} />;
};

export default MaterialIcon;
