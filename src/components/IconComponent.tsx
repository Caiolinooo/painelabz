'use client';

import React from 'react';
import * as FiIcons from 'react-icons/fi';
import { IconType } from 'react-icons';

// Mapping of icon names to Feather icons
const iconMap: Record<string, IconType> = {
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
  
  // Other common icons
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

interface IconComponentProps {
  name: string;
  className?: string;
  size?: number;
  color?: string;
}

/**
 * A component that renders Feather icons based on the provided name
 * This is a safer approach than trying to use HTML tags as components
 */
const IconComponent: React.FC<IconComponentProps> = ({ 
  name, 
  className = '', 
  size, 
  color 
}) => {
  // Check if the icon exists in the mapping
  const IconComponent = iconMap[name];
  
  // If the icon doesn't exist, use a default icon
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found. Using default icon.`);
    return <FiIcons.FiHelpCircle className={className} size={size} color={color} />;
  }
  
  // Render the icon
  return <IconComponent className={className} size={size} color={color} />;
};

export default IconComponent;
