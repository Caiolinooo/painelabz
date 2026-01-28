import { useState, useEffect } from 'react';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

interface EffectivePermissions {
    user_id: string;
    role: string;
    effective_modules: Record<string, boolean>;
    effective_cards: string[];
    _sources?: any;
}

export function useEffectivePermissions() {
    const { user } = useSupabaseAuth();
    const [permissions, setPermissions] = useState<EffectivePermissions | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPermissions = async () => {
            if (!user?.id) {
                setLoading(false);
                return;
            }

            try {
                // Try to get from cache first (session storage)
                const cached = sessionStorage.getItem(`permissions-v3-${user.id}`);
                if (cached) {
                    console.log('🔒 Permissions loaded from cache (v3)');
                    setPermissions(JSON.parse(cached));
                    setLoading(false);
                }

                const res = await fetch('/api/user/effective-permissions');
                if (res.ok) {
                    const data = await res.json();
                    console.log('🔒 Permissions loaded from API (FULL):', JSON.stringify(data, null, 2));
                    setPermissions(data);
                    sessionStorage.setItem(`permissions-v3-${user.id}`, JSON.stringify(data));
                }
            } catch (error) {
                console.error('Error fetching effective permissions:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPermissions();
    }, [user?.id]);

    const hasPermission = (moduleId: string): boolean => {
        if (!permissions) return true; // Default to true while loading or if error (fail open or closed? usually closed, but keeping legacy behavior)
        // Adjust logic: if permissions are loaded, check specifically.
        // If effective_modules is present, check it.
        if (permissions.effective_modules && permissions.effective_modules[moduleId] !== undefined) {
            return permissions.effective_modules[moduleId];
        }
        return true; // Default to true if not specified (permissive)
    };

    return { permissions, loading, hasPermission };
}
