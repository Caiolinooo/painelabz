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
  // New fields
  link?: string;
  actor_id?: string;
  metadata?: any;
  actor?: {
    first_name: string;
    last_name: string;
    avatar: string | null;
  };
}

export const useNotifications = (userId: string) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Estado de paginação
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  // Função simples para buscar notificações
  const fetchNotifications = useCallback(async (page = 1, append = false) => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      // Importar dinamicamente para evitar ciclos
      const { fetchWithToken } = await import('@/lib/tokenStorage');

      const response = await fetchWithToken(`/api/notifications?user_id=${userId}&limit=20&page=${page}`);

      if (!response.ok) {
        throw new Error(`Erro ${response.status}`);
      }

      const data = await response.json();

      if (mountedRef.current) {
        setNotifications(prev => append ? [...prev, ...(data.notifications || [])] : (data.notifications || []));
        setUnreadCount(data.unreadCount || 0);
        if (data.pagination) {
          setPagination(data.pagination);
        }
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

  // Efeito inicial
  useEffect(() => {
    mountedRef.current = true;
    if (userId) {
      fetchNotifications();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [userId, fetchNotifications]);

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
        async (payload) => {
          // Quando chegar uma realtime, idealmente buscaríamos o actor atualizado
          // Por simplicidade, adicionamos diretamente e talvez falte o avatar do actor
          // O melhor seria disparar um refetch ou fazer um fetchSingle do item
          // Aqui vamos forçar um refetch da primeira página para garantir dados completos
          fetchNotifications(1, false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchNotifications]);

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
    const previousUnread = unreadCount;
    setNotifications(prev =>
      prev.map(n => ({ ...n, read_at: new Date().toISOString() }))
    );
    setUnreadCount(0);

    try {
      const { fetchWithToken } = await import('@/lib/tokenStorage');
      const response = await fetchWithToken(`/api/notifications/mark-all-read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: userId })
      });

      if (response.ok) {
        const data = await response.json();
        // Sincronizar com o servidor (deve ser 0, mas garante consistência)
        if (typeof data.newUnreadCount === 'number') {
          setUnreadCount(data.newUnreadCount);
        }
      } else {
        // Se falhar, reverter (opcional, mas bom para feedback)
        console.error('Falha ao marcar como lidas, revertendo estado.');
        setUnreadCount(previousUnread);
        // Forçar um refetch para garantir estado correto
        fetchNotifications(1, false);
      }
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
      setUnreadCount(previousUnread);
      fetchNotifications(1, false);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    error,
    loadNotifications: fetchNotifications,
    markAsRead,
    markAllAsRead,
    pagination
  };
};
