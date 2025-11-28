'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiBell, FiX, FiCheck, FiCheckCircle, FiClock, FiHeart, FiMessageCircle, FiAlertCircle, FiInfo, FiClipboard } from 'react-icons/fi';
import { useI18n } from '@/contexts/I18nContext';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationBanner from './NotificationBanner';

interface NotificationHUDProps {
  userId: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxVisible?: number;
  showBanner?: boolean;
  evaluationPendingCount?: number;
}

const NotificationHUD: React.FC<NotificationHUDProps> = ({
  userId,
  position = 'top-right',
  maxVisible = 5,
  showBanner = true,
  evaluationPendingCount = 0
}) => {
  const { t, locale, version } = useI18n();
  const {
    notifications,
    unreadCount,
    loading,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    pagination
  } = useNotifications(userId);

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const prevUnreadRef = useRef<number>(0);

  // Chime curto "ABZ" com WebAudio
  const playABZChime = () => {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.15, now + 0.02);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
      master.connect(ctx.destination);

      const notes = [
        { t: 0.00, freq: 440 },
        { t: 0.28, freq: 494 },
        { t: 0.56, freq: 659 }
      ];

      notes.forEach(({ t, freq }) => {
        const o1 = ctx.createOscillator();
        const o2 = ctx.createOscillator();
        const g = ctx.createGain();
        o1.type = 'sine';
        o2.type = 'triangle';
        o1.frequency.setValueAtTime(freq, now + t);
        o2.frequency.setValueAtTime(freq * 2, now + t);

        g.gain.setValueAtTime(0.0001, now + t);
        g.gain.exponentialRampToValueAtTime(0.12, now + t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.35);

        o1.connect(g); o2.connect(g); g.connect(master);
        o1.start(now + t); o2.start(now + t);
        o1.stop(now + t + 0.38); o2.stop(now + t + 0.38);
      });

      const oZ = ctx.createOscillator();
      const gZ = ctx.createGain();
      oZ.type = 'sine';
      oZ.frequency.setValueAtTime(740, now + 0.88);
      oZ.frequency.exponentialRampToValueAtTime(660, now + 1.1);
      gZ.gain.setValueAtTime(0.0001, now + 0.88);
      gZ.gain.exponentialRampToValueAtTime(0.08, now + 0.91);
      gZ.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
      oZ.connect(gZ); gZ.connect(master);
      oZ.start(now + 0.88); oZ.stop(now + 1.22);
    } catch { }
  };

  // Aviso sonoro quando contador aumenta
  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      playABZChime();
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  // Shortcut: when dropdown open, press "r" to marcar todas como lidas
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        markAllAsRead();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, markAllAsRead]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Obter ícone por tipo de notificação
  const getNotificationIcon = (type: string, priority: string) => {
    const iconClass = `w-4 h-4 ${priority === 'urgent' ? 'text-red-500' :
      priority === 'high' ? 'text-orange-500' :
        priority === 'low' ? 'text-gray-400' : 'text-blue-500'
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

  // Formatar tempo relativo
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return locale === 'pt-BR' ? 'Agora' : 'Now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  // Posicionamento do dropdown
  const getPositionClasses = () => {
    switch (position) {
      case 'top-left': return 'top-12 left-0';
      case 'bottom-right': return 'bottom-12 right-0';
      case 'bottom-left': return 'bottom-12 left-0';
      default: return 'top-12 right-0';
    }
  };

  const handleLoadMore = () => {
    if (pagination?.hasNext) {
      loadNotifications(pagination.page + 1, false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botão de Notificações */}
      <button
        ref={bellRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
        aria-label={t('components.notificacoes')}
        title={unreadCount > 0 || evaluationPendingCount > 0 ? `${unreadCount} notificações, ${evaluationPendingCount} avaliações pendentes` : t('components.notificacoes')}
      >
        <FiBell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 z-10">
            {!isOpen && (
              <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
            )}
            <span className="relative inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold shadow-lg min-w-[20px]">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </span>
        )}
        {evaluationPendingCount > 0 && (
          <span className="absolute -bottom-1 -right-1 h-5 w-5 z-10">
            {!isOpen && (
              <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-ping"></span>
            )}
            <span className="relative inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-600 text-white text-xs font-bold shadow-lg min-w-[20px]">
              {evaluationPendingCount > 99 ? '99+' : evaluationPendingCount}
            </span>
          </span>
        )}
      </button>

      {/* Dropdown de Notificações */}
      {isOpen && (
        <div className={`absolute ${getPositionClasses()} w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden`}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">{t('notifications.title')}</h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {t('notifications.markAllAsRead')}
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded"
                aria-label={t('common.close')}
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Lista de Notificações */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FiBell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>{t('notifications.noNotifications')}</p>
              </div>
            ) : (
              <>
                {notifications.slice(0, maxVisible).map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${!notification.read_at ? 'bg-blue-50' : ''
                      }`}
                    onClick={(e) => {
                      e.preventDefault();
                      if (!notification.read_at) {
                        markAsRead(notification.id);
                      }
                      if (notification.action_url) {
                        window.location.href = notification.action_url;
                      }
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type, notification.priority)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-medium ${!notification.read_at ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                            {notification.title}
                          </p>
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-gray-500">
                              {formatTimeAgo(notification.created_at)}
                            </span>
                            {!notification.read_at && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                        </div>
                        {notification.message && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Load More */}
                {pagination?.hasNext && notifications.length > maxVisible && (
                  <div className="p-4 text-center border-t border-gray-100">
                    <button
                      onClick={handleLoadMore}
                      disabled={loading}
                      className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
                    >
                      {loading ? 'Carregando...' : t('components.verMaisNotificacoes')}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationHUD;
