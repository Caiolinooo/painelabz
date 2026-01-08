import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  read_at: string | null;
  created_at: string;
  action_url?: string;
  priority?: string;
}

export const useNotifications = (userId: string) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Função simples para buscar notificações
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      // Importar dinamicamente para evitar ciclos
      const { fetchWithToken } = await import('@/lib/tokenStorage');

      const response = await fetchWithToken(`/api/notifications?user_id=${userId}&limit=20`);

      if (!response.ok) {
        throw new Error(`Erro ${response.status}`);
      }

      const data = await response.json();

      if (mountedRef.current) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err: any) {
      console.error('Erro ao buscar notificações:', err);
      if (mountedRef.current) {
        setError(err.message);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [userId]);

  // Efeito inicial para carregar notificações
  useEffect(() => {
    mountedRef.current = true;

    // Apenas buscar se temos um usuário e ainda não carregamos (ou se o ID mudou)
    if (userId) {
      fetchNotifications();
    }

    return () => {
      mountedRef.current = false;
    };
    // Remover fetchNotifications da dependência para evitar loops se a função for recriada
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Marcar como lida
  const markAsRead = async (id: string) => {
    // Otimistic update
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      const { fetchWithToken } = await import('@/lib/tokenStorage');
      await fetchWithToken(`/api/notifications/${id}/read`, { method: 'PUT' });
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  // Marcar todas como lidas
  const markAllAsRead = async () => {
    // Otimistic update
    setNotifications(prev =>
      prev.map(n => ({ ...n, read_at: new Date().toISOString() }))
    );
    setUnreadCount(0);

    try {
      const { fetchWithToken } = await import('@/lib/tokenStorage');
      await fetchWithToken(`/api/notifications/read-all`, {
        method: 'POST',
        body: ***REMOVED*** user_id: userId })
      });
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    error,
    loadNotifications: fetchNotifications, // Alias para compatibilidade
    markAsRead,
    markAllAsRead,
    pagination: null // Simplificado
  };
};
