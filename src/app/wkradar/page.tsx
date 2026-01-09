'use client';

import React, { useEffect, useState, useRef } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { FiLoader, FiMonitor, FiSettings, FiLogIn, FiAlertCircle, FiMaximize, FiMinimize, FiRefreshCw } from 'react-icons/fi';

interface WKRadarCredentials {
    username: string;
    password: string;
    isCustom: boolean;
}

export default function WKRadarPage() {
    const { user, profile, isLoading: authLoading, isAdmin } = useSupabaseAuth();
    const { t } = useI18n();
    const [credentials, setCredentials] = useState<WKRadarCredentials | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [loginAttempted, setLoginAttempted] = useState(false);
    const [loginSuccessful, setLoginSuccessful] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // URL do proxy interno - todas as requisições passam pelo nosso servidor
    const GUACAMOLE_PROXY_URL = '/api/guac-proxy';

    // Gera o username padrão baseado no perfil do usuário
    const generateDefaultUsername = () => {
        if (profile?.first_name && profile?.last_name) {
            const firstName = profile.first_name.toLowerCase().trim().split(' ')[0];
            const lastName = profile.last_name.toLowerCase().trim().split(' ')[0];
            return `${firstName}.${lastName}`;
        }
        if (user?.email) {
            return user.email.split('@')[0].toLowerCase();
        }
        return '';
    };

    // Carrega credenciais do usuário
    useEffect(() => {
        const loadCredentials = async () => {
            if (authLoading) return;
            if (!user?.id) return;

            try {
                setLoading(true);
                setError(null);

                const getToken = () => {
                    const cookies = document.cookie.split('; ');
                    const abzToken = cookies.find(row => row.startsWith('abzToken='))?.split('=')[1];
                    const token = cookies.find(row => row.startsWith('token='))?.split('=')[1];
                    return abzToken || token;
                };

                const token = getToken();

                const response = await fetch(`/api/wkradar/credentials?userId=${user.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.credentials) {
                        setCredentials({
                            username: data.credentials.username,
                            password: data.credentials.password,
                            isCustom: true
                        });
                    } else {
                        setCredentials({
                            username: generateDefaultUsername(),
                            password: 'Abz@2025',
                            isCustom: false
                        });
                    }
                } else {
                    setCredentials({
                        username: generateDefaultUsername(),
                        password: 'Abz@2025',
                        isCustom: false
                    });
                }
            } catch (err) {
                console.error('Erro ao carregar credenciais WKRadar:', err);
                setCredentials({
                    username: generateDefaultUsername(),
                    password: 'Abz@2025',
                    isCustom: false
                });
            } finally {
                setLoading(false);
            }
        };

        if (!authLoading && user) {
            loadCredentials();
        }
    }, [user, profile, authLoading]);

    // Auto-login via API Guacamole através do proxy
    useEffect(() => {
        const loginToGuacamole = async () => {
            console.log('[WKRadar] loginToGuacamole', { credentials: !!credentials, loginAttempted, loginSuccessful });

            if (credentials && !loginAttempted) {
                console.log('[WKRadar] Tentando login com:', credentials.username);
                try {
                    const params = new URLSearchParams();
                    params.append('username', credentials.username);
                    params.append('password', credentials.password);

                    console.log('[WKRadar] POST para:', `${GUACAMOLE_PROXY_URL}/api/tokens`);
                    const response = await fetch(`${GUACAMOLE_PROXY_URL}/api/tokens`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: params
                    });

                    console.log('[WKRadar] Resposta:', response.status, response.ok);

                    if (response.ok) {
                        const authData = await response.json();
                        console.log('[WKRadar] Auth data:', authData);

                        if (authData && authData.authToken) {
                            console.log('[WKRadar] Login bem-sucedido!');

                            // Guacamole usa cookies para autenticação - o proxy deve ter passado o Set-Cookie
                            // Também guardamos no localStorage como backup
                            localStorage.setItem('GUAC_AUTH', JSON.stringify(authData));

                            setLoginSuccessful(true);
                            setLoginAttempted(true);

                            // Carregar o iframe com o token na URL (Guacamole aceita isso)
                            if (iframeRef.current) {
                                iframeRef.current.src = `${GUACAMOLE_PROXY_URL}/#/?token=${authData.authToken}`;
                            }
                        } else {
                            console.error('[WKRadar] Resposta sem authToken:', authData);
                            setLoginAttempted(true);
                            setLoginSuccessful(false);
                            setError('Credenciais inválidas. Entre em contato com o administrador.');
                        }
                    } else {
                        console.error('[WKRadar] Login falhou:', response.status);
                        let errorDetail = '';
                        try {
                            errorDetail = await response.text();
                            console.error('[WKRadar] Detalhes:', errorDetail);
                        } catch (e) { }

                        let errorMessage = 'Sistema temporariamente indisponível. Favor entrar em contato com o administrador.';
                        if (response.status >= 500) {
                            errorMessage = 'O servidor WKRadar está em manutenção. Tente novamente mais tarde.';
                        } else if (response.status === 403) {
                            errorMessage = 'Credenciais inválidas ou acesso negado ao WKRadar.';
                        }

                        setLoginAttempted(true);
                        setLoginSuccessful(false);
                        setError(errorMessage);
                    }
                } catch (err) {
                    console.error('[WKRadar] Erro:', err);
                    setLoginAttempted(true);
                    setLoginSuccessful(false);
                    setError('Erro de conexão com o servidor WKRadar.');
                }
            }
        };

        loginToGuacamole();
    }, [credentials, loginAttempted]);

    const handleReload = () => {
        setLoginAttempted(false);
        setLoginSuccessful(false);
        setError(null);
    };

    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(console.error);
        } else {
            document.exitFullscreen();
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const handleOpenNewWindow = (e: React.MouseEvent) => {
        e.preventDefault();
        window.open('https://vm.groupabz.com/guacamole/', '_blank');
    };

    const handleContainerClick = () => {
        iframeRef.current?.focus();
    };

    useEffect(() => {
        if (loginSuccessful && iframeRef.current) {
            const timer = setTimeout(() => iframeRef.current?.focus(), 1000);
            return () => clearTimeout(timer);
        }
    }, [loginSuccessful]);

    if (authLoading || loading) {
        return (
            <MainLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <FiLoader className="animate-spin h-12 w-12 text-abz-blue mb-4" />
                    <p className="text-gray-600">{t('common.loading')}</p>
                </div>
            </MainLayout>
        );
    }

    if (!user) {
        return (
            <MainLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <FiAlertCircle className="h-12 w-12 text-red-500 mb-4" />
                    <p className="text-gray-600">{t('auth.notAuthorized')}</p>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="flex flex-col -m-4 md:-m-6 h-[calc(100vh-64px)] md:h-[calc(100vh-80px)]">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm z-10">
                    <div className="flex items-center space-x-3">
                        <div className="bg-indigo-100 p-1.5 rounded-lg">
                            <FiMonitor className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-gray-800 flex items-center">
                                WKRadar
                                <span className="ml-2 text-xs font-normal px-2 py-0.5 bg-gray-100 rounded-full text-gray-500">
                                    {credentials?.username}
                                </span>
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={handleReload}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-md transition-colors"
                            title="Recarregar"
                        >
                            <FiRefreshCw className="h-5 w-5" />
                        </button>

                        <button
                            onClick={toggleFullscreen}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-md transition-colors"
                            title={isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}
                        >
                            {isFullscreen ? <FiMinimize className="h-5 w-5" /> : <FiMaximize className="h-5 w-5" />}
                        </button>

                        {isAdmin && (
                            <a
                                href="/admin/wkradar"
                                className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                                title="Configurações"
                            >
                                <FiSettings className="h-5 w-5" />
                            </a>
                        )}

                        <button
                            onClick={handleOpenNewWindow}
                            className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                            title="Abrir em nova janela"
                        >
                            <FiLogIn className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                {(error || (loginAttempted && !loginSuccessful)) ? (
                    <div className="flex-1 bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
                        <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg w-full">
                            <div className="h-20 w-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <FiAlertCircle className="h-10 w-10 text-red-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Sistema Indisponível</h2>
                            <p className="text-gray-600 mb-6 text-lg">
                                {error || 'Não foi possível conectar ao WKRadar.'}
                            </p>
                            <button
                                onClick={handleReload}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                            >
                                Tentar Novamente
                            </button>
                        </div>
                    </div>
                ) : loginSuccessful ? (
                    <div
                        ref={containerRef}
                        className={`flex-1 bg-gray-100 relative ${isFullscreen ? 'fixed inset-0 z-50' : ''} overflow-hidden`}
                        onClick={handleContainerClick}
                    >
                        <iframe
                            ref={iframeRef}
                            name="wkradar-iframe"
                            src=""
                            className="w-full h-full border-0"
                            title="WKRadar - Guacamole"
                            allow="clipboard-read; clipboard-write; fullscreen"
                        />
                    </div>
                ) : (
                    <div className="flex-1 bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
                        <FiLoader className="animate-spin h-10 w-10 text-indigo-600 mb-4" />
                        <p className="text-gray-500">Conectando ao WKRadar...</p>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
