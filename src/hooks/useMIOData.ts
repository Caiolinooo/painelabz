'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface MIODataState<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
    totalRegistros: number;
    atualizadoEm: string | null;
}

interface CacheResponse<T> {
    success: boolean;
    data: T;
    total_registros: number;
    atualizado_em: string;
    cached?: boolean;
    message?: string;
}

export function useMIOData<T = any>(tipo: string, refreshInterval = 15000) {
    const [state, setState] = useState<MIODataState<T>>({
        data: null,
        loading: true,
        error: null,
        totalRegistros: 0,
        atualizadoEm: null,
    });
    const intervalRef = useRef<number | null>(null);
    const mountedRef = useRef(true);

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch(`/api/mio/cache?tipo=${tipo}`, {
                headers: { 'Cache-Control': 'no-cache' },
            });
            const json: CacheResponse<T> = await res.json();

            if (!json.success) {
                throw new Error(json.message || 'Erro ao buscar dados MIO');
            }

            if (mountedRef.current) {
                setState({
                    data: json.data,
                    loading: false,
                    error: null,
                    totalRegistros: json.total_registros || 0,
                    atualizadoEm: json.atualizado_em || null,
                });
            }
        } catch (err: any) {
            if (mountedRef.current) {
                setState(prev => ({
                    ...prev,
                    loading: false,
                    error: err.message || 'Erro ao conectar com cache MIO',
                }));
            }
        }
    }, [tipo]);

    useEffect(() => {
        mountedRef.current = true;
        fetchData();

        intervalRef.current = window.setInterval(fetchData, refreshInterval);

        return () => {
            mountedRef.current = false;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [fetchData, refreshInterval]);

    const refresh = useCallback(() => {
        fetchData();
    }, [fetchData]);

    return { ...state, refresh };
}
