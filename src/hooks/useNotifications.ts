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
    drive_photo_url?: string | null;
  };
}

export const useNotifications = (userId: string) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [newsUnreadCount, setNewsUnreadCount] = useState(0); // New state
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
        setNewsUnreadCount(data.newsUnreadCount || 0); // Set news unread count
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
  const markAsRead = async (id: string, type?: string) => {
    // Determine if it was news to update optimistic state
    // We can't know for sure without the type, but standard behavior will refetch eventually
    // For now we just dec general unread
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    // If we knew the type was NOT purchase_order we could dec newsUnreadCount too
    // But since we don't have it easily here without passing it, we rely on fetch update or separate logic
    // For now, let's just do the API call. To be precise we should pass the item type to this function.

    try {
      const { fetchWithToken } = await import('@/lib/tokenStorage');
      await fetchWithToken(`/api/notifications/${id}/read`, { method: 'PUT' });
      // Refetch to sync counts accurately
      fetchNotifications(pagination.page, false);
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  // Marcar todas como lidas
  const markAllAsRead = async () => {
    // Otimistic update
    const previousUnread = unreadCount;
    const previousNewsUnread = newsUnreadCount;
    setNotifications(prev =>
      prev.map(n => ({ ...n, read_at: new Date().toISOString() }))
    );
    setUnreadCount(0);
    setNewsUnreadCount(0);

    try {
      const { fetchWithToken } = await import('@/lib/tokenStorage');
      const response = await fetchWithToken(`/api/notifications/mark-all-read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: ***REMOVED*** user_id: userId })
      });

      if (response.ok) {
        const data = await response.json();
        // Sincronizar com o servidor (deve ser 0, mas garante consistência)
        if (typeof data.newUnreadCount === 'number') {
          setUnreadCount(data.newUnreadCount);
          // Assuming mark all read marks ALL, including News and PO
          setNewsUnreadCount(0);
        }
      } else {
        // Se falhar, reverter (opcional, mas bom para feedback)
        console.error('Falha ao marcar como lidas, revertendo estado.');
        setUnreadCount(previousUnread);
        setNewsUnreadCount(previousNewsUnread);
        // Forçar um refetch para garantir estado correto
        fetchNotifications(1, false);
      }
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
      setUnreadCount(previousUnread);
      setNewsUnreadCount(previousNewsUnread);
      fetchNotifications(1, false);
    }
  };

  return {
    notifications,
    unreadCount,
    newsUnreadCount, // Expose this
    loading,
    error,
    loadNotifications: fetchNotifications,
    markAsRead,
    markAllAsRead,
    pagination
  };
};
