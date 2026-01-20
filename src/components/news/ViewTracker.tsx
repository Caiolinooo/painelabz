'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface ViewTrackerProps {
    postId: string;
    userId?: string;
    children: React.ReactNode;
}

import { fetchWithToken } from '@/lib/tokenStorage';

export default function ViewTracker({ postId, userId, children }: ViewTrackerProps) {
    const startTimeRef = useRef<number | null>(null);
    const totalDurationRef = useRef<number>(0);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const elementRef = useRef<HTMLDivElement>(null);
    const [viewRegistered, setViewRegistered] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const isVisibleRef = useRef(false);

    // Function to send accumulated time
    const sendDuration = useCallback(() => {
        // Enforce user presence - system does not accept anonymous tracking
        if (!userId) return;

        // Calculate current duration if currently viewing
        let duration = totalDurationRef.current;
        if (startTimeRef.current && isVisibleRef.current) {
            duration += Date.now() - startTimeRef.current;
        }

        const durationSeconds = Math.round(duration / 1000);
        if (durationSeconds < 1) return; // Ignore less than 1s

        try {
            const data = ***REMOVED***
                postId,
                userId,
                duration: durationSeconds
            });

            console.log(`⏱️ Sending time: ${durationSeconds}s for post ${postId}`);

            // Use fetchWithToken with keepalive instead of sendBeacon to ensure Authorization header is sent
            // This fixes the "Anonymous" viewer issue by allowing backend to verify the token
            fetchWithToken('/api/news/track-time', {
                method: 'POST',
                body: data,
                keepalive: true, // Critical for successful sending on unload
            }).catch(e => console.error('Failed to send tracking', e));

            // navigator.sendBeacon('/api/news/track-time', blob);

            // Reset after sending
            totalDurationRef.current = 0;
            if (isVisibleRef.current) {
                startTimeRef.current = Date.now(); // Restart timer if still visible
            }
        } catch (e) {
            console.error('Failed to send tracking', e);
        }
    }, [postId, userId]);

    useEffect(() => {
        if (!elementRef.current) return;

        observerRef.current = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Started viewing
                    startTimeRef.current = Date.now();
                    isVisibleRef.current = true;
                    // console.log(`👁️ Started viewing post ${postId}`);

                    // Start periodic sending every 15 seconds while visible
                    if (!intervalRef.current) {
                        intervalRef.current = setInterval(() => {
                            if (isVisibleRef.current && startTimeRef.current) {
                                sendDuration(); // Will check for userId internally
                            }
                        }, 15000); // Send every 15 seconds
                    }
                } else {
                    // Stopped viewing
                    if (startTimeRef.current) {
                        const duration = Date.now() - startTimeRef.current;
                        totalDurationRef.current += duration;
                        startTimeRef.current = null;
                        // console.log(`👁️ Stopped viewing post ${postId}, accumulated: ${Math.round(totalDurationRef.current / 1000)}s`);

                        // Send immediately when leaving viewport
                        sendDuration();
                    }
                    isVisibleRef.current = false;
                }
            });
        }, { threshold: 0.3 }); // Count if 30% visible (was 50%)

        observerRef.current.observe(elementRef.current);

        // Also send on page visibility change (tab switch, minimize)
        const handleVisibilityChange = () => {
            if (document.hidden && isVisibleRef.current) {
                sendDuration();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Also send on beforeunload (page close/navigate away)
        const handleBeforeUnload = () => {
            sendDuration();
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            // Cleanup and send final duration
            if (startTimeRef.current) {
                totalDurationRef.current += (Date.now() - startTimeRef.current);
            }
            sendDuration();
            observerRef.current?.disconnect();
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [postId, sendDuration]);

    // Register initial view (simple count)
    useEffect(() => {
        if (!viewRegistered && userId) {
            const timer = setTimeout(() => {
                // Use fetchWithToken for authenticated view registration
                fetchWithToken(`/api/news/${postId}/view`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: ***REMOVED*** userId })
                }).catch(() => { });
                setViewRegistered(true);
            }, 3000); // Reduced from 5s to 3s for qualified view
            return () => clearTimeout(timer);
        }
    }, [postId, userId, viewRegistered]);

    return (
        <div ref={elementRef} className="view-tracking-wrapper">
            {children}
        </div>
    );
}
