import {
    FiHome,
    FiUser,
    FiSettings,
    FiGrid,
    FiFileText,
    FiDollarSign,
    FiCalendar,
    FiPhone,
    FiClock,
    FiTrendingUp,
    FiBook,
    FiMessageSquare,
    FiUsers,
    FiBookOpen,
    FiTruck,
    FiShield,
    FiRss,
    FiActivity,
    FiPlay,
    FiBarChart2,
    FiLogOut,
    FiMenu,
    FiX,
    FiChevronLeft,
    FiChevronRight,
    FiClipboard,
    FiBriefcase
} from 'react-icons/fi';

export const iconMap: Record<string, any> = {
    'FiHome': FiHome,
    'FiUser': FiUser,
    'FiSettings': FiSettings,
    'FiGrid': FiGrid,
    'FiFileText': FiFileText,
    'FiDollarSign': FiDollarSign,
    'FiCalendar': FiCalendar,
    'FiPhone': FiPhone,
    'FiClock': FiClock,
    'FiTrendingUp': FiTrendingUp,
    'FiBook': FiBook,
    'FiMessageSquare': FiMessageSquare,
    'FiUsers': FiUsers,
    'FiBookOpen': FiBookOpen,
    'FiTruck': FiTruck,
    'FiShield': FiShield,
    'FiRss': FiRss,
    'FiActivity': FiActivity,
    'FiPlay': FiPlay,
    'FiBarChart2': FiBarChart2,
    'FiLogOut': FiLogOut,
    'FiMenu': FiMenu,
    'FiX': FiX,
    'FiChevronLeft': FiChevronLeft,
    'FiChevronRight': FiChevronRight,
    'FiClipboard': FiClipboard,
    'FiBriefcase': FiBriefcase
};

/**
 * Converte nome de ícone (string) para componente React
 */
export function getIconComponent(iconName: string | undefined): any {
    if (!iconName) return FiGrid;
    return iconMap[iconName] || FiGrid;
}
