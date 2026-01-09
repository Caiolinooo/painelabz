'use client';

import React, { useEffect, useRef, useState } from 'react';

interface ViewTrackerProps {
    postId: string;
    userId?: string;
    children: React.ReactNode;
}

export default function ViewTracker({ postId, userId, children }: ViewTrackerProps) {
    const startTimeRef = useRef<number | null>(null);
    const totalDurationRef = useRef<number>(0);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const elementRef = useRef<HTMLDivElement>(null);
    const [viewRegistered, setViewRegistered] = useState(false);

    // Função para enviar o tempo acumulado
    const sendDuration = async () => {
        if (totalDurationRef.current < 1) return; // Ignora menos de 1s

        try {
            // Usar navigator.sendBeacon para garantir envio no unmount
            const data = ***REMOVED***
                postId,
                userId,
                duration: Math.round(totalDurationRef.current / 1000)
            });

            const blob = new Blob([data], { type: 'application/json' });
            navigator.sendBeacon('/api/news/track-time', blob);

            // Zerar após envio (caso não seja unmount)
            totalDurationRef.current = 0;
        } catch (e) {
            console.error('Falha ao enviar tracking', e);
        }
    };

    useEffect(() => {
        if (!elementRef.current) return;

        observerRef.current = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    startTimeRef.current = Date.now();
                } else {
                    if (startTimeRef.current) {
                        const duration = Date.now() - startTimeRef.current;
                        totalDurationRef.current += duration;
                        startTimeRef.current = null;

                        // Envia periodicamente quando sai da tela
                        sendDuration();
                    }
                }
            });
        }, { threshold: 0.5 }); // Conta se 50% visível

        observerRef.current.observe(elementRef.current);

        return () => {
            if (startTimeRef.current) {
                totalDurationRef.current += (Date.now() - startTimeRef.current);
            }
            sendDuration();
            observerRef.current?.disconnect();
        };
    }, [postId]);

    // Registrar view inicial (contagem simples)
    useEffect(() => {
        if (!viewRegistered && userId) {
            const timer = setTimeout(() => {
                fetch(`/api/news/${postId}/view`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: ***REMOVED*** userId })
                }).catch(() => { });
                setViewRegistered(true);
            }, 5000); // 5s de "view" qualificada
            return () => clearTimeout(timer);
        }
    }, [postId, userId]);

    return (
        <div ref={elementRef} className="view-tracking-wrapper">
            {children}
        </div>
    );
}
