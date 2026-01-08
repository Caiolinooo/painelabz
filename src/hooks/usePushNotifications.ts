import { useState, useEffect } from 'react';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

export const usePushNotifications = () => {
    const { user } = useSupabaseAuth();
    const [subscription, setSubscription] = useState<PushSubscription | null>(null);
    const [permState, setPermState] = useState<NotificationPermission>('default');

    useEffect(() => {
        // Only run in browser
        if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
            return;
        }

        setPermState(Notification.permission);

        // Auto-request permission if user is logged in and not denied
        if (user && Notification.permission === 'default') {
            requestAndSubscribe();
        }
    }, [user]);

    const requestAndSubscribe = async () => {
        try {
            const permission = await Notification.requestPermission();
            setPermState(permission);

            if (permission === 'granted') {
                const registration = await navigator.serviceWorker.ready;
                const sub = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
                });
                setSubscription(sub);

                // Send subscription to backend
                await fetch('/api/notifications/push/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(sub)
                });
            }
        } catch (error) {
            console.error('Failed to subscribe to push:', error);
        }
    };

    return {
        permission: permState,
        subscription,
        requestPermission: requestAndSubscribe
    };
};
