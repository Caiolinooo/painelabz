import { useState, useEffect, useCallback } from 'react';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

interface EffectivePermissions {
    user_id: string;
    role: string;
    effective_modules: Record<string, boolean>;
    effective_cards: string[];
    sector_id?: string | null;
    _sources?: any;
}

export function useEffectivePermissions() {
    const { user, profile } = useSupabaseAuth();
    const [permissions, setPermissions] = useState<EffectivePermissions | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Cache key maps to user ID - Version 4 to force refresh on new deploy
    const cacheKey = user ? `permissions-v4-${user.id}` : null;

    const fetchPermissions = useCallback(async (force = false) => {
        if (!user?.id) {
            setIsLoading(false);
            return;
        }

        // Cache check
        const cached = sessionStorage.getItem(cacheKey || '');
        if (!force && cached) {
            try {
                const parsed = JSON.parse(cached);
                setPermissions(parsed);
                setIsLoading(false);
                return;
            } catch (e) {
                console.error('Error parsing cached permissions', e);
            }
        }

        try {
            const res = await fetch('/api/user/effective-permissions');
            if (res.ok) {
                const data = await res.json();
                setPermissions(data);
                if (cacheKey) {
                    sessionStorage.setItem(cacheKey, JSON.stringify(data));
                }
            }
        } catch (error) {
            console.error('Error fetching permissions', error);
        } finally {
            setIsLoading(false);
        }
    }, [user, cacheKey]);

    useEffect(() => {
        fetchPermissions();

        // Listen for global permission updates
        const handleUpdate = () => {
            console.log('🔄 Permission update event detected, refreshing...');
            fetchPermissions(true);
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('permissions-updated', handleUpdate);
        }

        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('permissions-updated', handleUpdate);
            }
        };
    }, [fetchPermissions]);

    const hasPermission = (moduleId: string): boolean => {
        if (!permissions) return true; // Default to true while loading (fail open)

        // 1. Explicit setting takes precedence
        if (permissions.effective_modules && permissions.effective_modules[moduleId] !== undefined) {
            return permissions.effective_modules[moduleId];
        }

        // 2. Strict Sector Logic
        // If the user belongs to a sector, we are in STRICT MODE.
        // Any module not explicitly prioritized in step 1 is considered FALSE.
        // This closes the gap were the backend omits disallowed modules.
        if (permissions.sector_id) {
            return false;
        }

        // 3. Fallback for Non-Sector Users (Legacy/Permissive)
        // If not in a sector, we default to TRUE to maintain existing behavior for admins/managers/legacy users
        return true;
    };

    return {
        permissions,
        loading: isLoading,
        isLoading,
        hasPermission,
        isAdmin: permissions?.role === 'ADMIN',
        isManager: permissions?.role === 'MANAGER',
        refresh: () => fetchPermissions(true)
    };
}
