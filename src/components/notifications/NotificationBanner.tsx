'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiBell, FiX, FiClipboard, FiInfo, FiMessageCircle, FiHeart, FiClock, FiAlertCircle } from 'react-icons/fi';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  action_url?: string;
  read_at?: string | null;
  created_at?: string;
}

interface NotificationBannerProps {
  userId: string;
  position?: 'top' | 'bottom';
  autoHideDuration?: number;
  triggerElement?: HTMLElement | null;
  notification: Notification | null;
  isVisible: boolean;
  onClose: () => void;
}

const NotificationBanner: React.FC<NotificationBannerProps> = ({
  userId,
  position = 'top',
  autoHideDuration = 5000,
  triggerElement,
  notification,
  isVisible,
  onClose
}) => {
  // Efeito para auto-hide
  useEffect(() => {
    if (isVisible && autoHideDuration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoHideDuration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, autoHideDuration, onClose]);

  // Obter ícone por tipo
  const getNotificationIcon = (type: string, priority: string) => {
    const iconClass = `w-5 h-5 ${priority === 'urgent' ? 'text-red-400' :
        priority === 'high' ? 'text-orange-400' :
          priority === 'low' ? 'text-gray-400' : 'text-blue-400'
      }`;

    switch (type) {
      case 'evaluation': return <FiClipboard className={iconClass} />;
      case 'news_post': return <FiInfo className={iconClass} />;
      case 'comment': return <FiMessageCircle className={iconClass} />;
      case 'like': return <FiHeart className={iconClass} />;
      case 'reminder': return <FiClock className={iconClass} />;
      case 'system': return <FiAlertCircle className={iconClass} />;
      default: return <FiBell className={iconClass} />;
    }
  };

  // Obter cores por prioridade
  const getPriorityColors = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'from-red-500 to-red-600 border-red-400';
      case 'high': return 'from-orange-500 to-orange-600 border-orange-400';
      case 'low': return 'from-gray-500 to-gray-600 border-gray-400';
      default: return 'from-blue-500 to-blue-600 border-blue-400';
    }
  };

  const handleClick = () => {
    if (notification?.action_url) {
      window.location.href = notification.action_url;
    }
    onClose();
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  if (!notification) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{
            opacity: 0,
            y: position === 'top' ? -100 : 100,
            scale: 0.9
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1
          }}
          exit={{
            opacity: 0,
            y: position === 'top' ? -100 : 100,
            scale: 0.9
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30
          }}
          className={`fixed z-50 ${triggerElement
              ? 'top-16 right-4' // Próximo ao bell
              : position === 'top'
                ? 'top-4 left-1/2 transform -translate-x-1/2'
                : 'bottom-4 left-1/2 transform -translate-x-1/2'
            }`}
        >
          <div
            onClick={handleClick}
            className={`
              bg-gradient-to-r ${getPriorityColors(notification.priority)}
              text-white rounded-lg shadow-lg border-2 cursor-pointer
              min-w-80 max-w-md mx-4 overflow-hidden
              hover:shadow-xl transition-shadow duration-200
            `}
          >
            {/* Barra de progresso */}
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: autoHideDuration / 1000, ease: 'linear' }}
              className="h-1 bg-white/30"
            />

            <div className="p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.type, notification.priority)}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-white mb-1">
                    {notification.title}
                  </h4>
                  {notification.message && (
                    <p className="text-sm text-white/90 line-clamp-2">
                      {notification.message}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleClose}
                  className="flex-shrink-0 p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <FiX className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationBanner;