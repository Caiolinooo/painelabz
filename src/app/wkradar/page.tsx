'use client';

import React, { useEffect, useState, useRef } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { FiLoader, FiMonitor, FiSettings, FiLogIn, FiAlertCircle, FiMaximize, FiMinimize } from 'react-icons/fi';

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
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // URL relativa proxied via Next.js Rewrite
    const GUACAMOLE_BASE_URL = '/guacamole/';

    // Gera o username padrão baseado no perfil do usuário
    const generateDefaultUsername = () => {
        if (profile?.first_name && profile?.last_name) {
            const firstName = profile.first_name.toLowerCase().trim().split(' ')[0];
            const lastName = profile.last_name.toLowerCase().trim().split(' ')[0];
            return `${firstName}.${lastName}`;
        }
        // Fallback para email se não tiver nome
        if (user?.email) {
            return user.email.split('@')[0].toLowerCase();
        }
        return '';
    };

    // Carrega credenciais do usuário (customizadas ou padrão)
    useEffect(() => {
        const loadCredentials = async () => {
            if (!user?.id) return;

            try {
                setLoading(true);
                setError(null);

                // Token retrieval robusto (similar ao fix da avaliação)
                const getToken = () => {
                    const cookies = document.cookie.split('; ');
                    const abzToken = cookies.find(row => row.startsWith('abzToken='))?.split('=')[1];
                    const token = cookies.find(row => row.startsWith('token='))?.split('=')[1];
                    return abzToken || token;
                };

                const token = getToken();

                // Tentar buscar credenciais customizadas
                const response = await fetch(`/api/wkradar/credentials?userId=${user.id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
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
                        // Usar credenciais padrão
                        setCredentials({
                            username: generateDefaultUsername(),
                            password: 'Abz@2025',
                            isCustom: false
                        });
                    }
                } else {
                    // Endpoint não existe ainda, usar padrão
                    setCredentials({
                        username: generateDefaultUsername(),
                        password: 'Abz@2025',
                        isCustom: false
                    });
                }
            } catch (err) {
                console.error('Erro ao carregar credenciais WKRadar:', err);
                // Em caso de erro, usar credenciais padrão
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

    // Auto-login via API Guacamole
    useEffect(() => {
        const loginToGuacamole = async () => {
            if (credentials && !loginAttempted) {
                try {
                    // 1. Obter token de autenticação
                    const params = new URLSearchParams();
                    params.append('username', credentials.username);
                    params.append('password', credentials.password);

                    const response = await fetch(`${GUACAMOLE_BASE_URL}api/tokens`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: params
                    });

                    if (response.ok) {
                        const authData = await response.json();

                        // 2. Armazenar token no localStorage (Same-Origin)
                        // A aplicação web Guacamole usa "GUAC_AUTH" no localStorage
                        localStorage.setItem('GUAC_AUTH', JSON.stringify(authData));

                        setLoginAttempted(true);

                        // 3. Carregar o iframe
                        if (iframeRef.current) {
                            iframeRef.current.src = GUACAMOLE_BASE_URL;
                        }
                    } else {
                        console.error('Falha no login Guacamole:', response.status);
                        // Se falhar o auto-login, ainda carregamos o iframe para o usuário tentar manualmente
                        setLoginAttempted(true);
                        if (iframeRef.current) {
                            iframeRef.current.src = GUACAMOLE_BASE_URL;
                        }
                    }
                } catch (err) {
                    console.error('Erro ao conectar ao Guacamole:', err);
                    setLoginAttempted(true);
                    if (iframeRef.current) {
                        iframeRef.current.src = GUACAMOLE_BASE_URL;
                    }
                }
            }
        };

        loginToGuacamole();
    }, [credentials, loginAttempted]);

    const handleReload = () => {
        setLoginAttempted(false);
        // localStorage.removeItem('GUAC_AUTH'); // Opcional: limpar sessão ao recarregar
    };

    const toggleFullscreen = () => {
        if (!containerRef.current) return;

        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch((err) => {
                console.error(`Erro ao entrar em tela cheia: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const handleOpenNewWindow = (e: React.MouseEvent) => {
        e.preventDefault();
        window.open(GUACAMOLE_BASE_URL, '_blank');
    };

    // Focar no iframe quando clicar no container para garantir captura de teclado
    const handleContainerClick = () => {
        if (iframeRef.current) {
            iframeRef.current.focus();
        }
    };

    // Tentar focar no iframe após carregamento
    useEffect(() => {
        if (loginAttempted && iframeRef.current) {
            const timer = setTimeout(() => {
                iframeRef.current?.focus();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [loginAttempted]);

    // Keep-alive (opcional): Pinger para manter sessão ativa se necessário
    // Guacamole geralmente mantém via WebSocket, mas podemos reforçar
    useEffect(() => {
        if (loginAttempted) {
            const interval = setInterval(() => {
                // Apenas um fetch leve para garantir que o cookie/sessão não expire se houver
                // fetch(`${GUACAMOLE_BASE_URL}api/tokens`, { method: 'HEAD' }).catch(() => {});
            }, 60000 * 5); // 5 minutos
            return () => clearInterval(interval);
        }
    }, [loginAttempted]);

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
            {/* Usando margens negativas para compensar o padding do MainLayout e maximizar a área */}
            <div className="flex flex-col -m-4 md:-m-6 h-[calc(100vh-64px)] md:h-[calc(100vh-80px)]">
                {/* Compact Header */}
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
                            title={t('common.refresh', 'Recarregar')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>

                        <button
                            onClick={toggleFullscreen}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-md transition-colors"
                            title={isFullscreen ? t('wkradar.exitFullscreen', 'Sair da Tela Cheia') : t('wkradar.enterFullscreen', 'Tela Cheia')}
                        >
                            {isFullscreen ? <FiMinimize className="h-5 w-5" /> : <FiMaximize className="h-5 w-5" />}
                        </button>

                        {/* Link para configuração (apenas admin) */}
                        {isAdmin && (
                            <a
                                href="/admin/wkradar"
                                className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                                title={t('admin.settings', 'Configurações')}
                            >
                                <FiSettings className="h-5 w-5" />
                            </a>
                        )}

                        <button
                            onClick={handleOpenNewWindow}
                            className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                            title={t('wkradar.openNewWindow', 'Abrir em nova janela')}
                        >
                            <FiLogIn className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Error State */}
                {error && (
                    <div className="bg-red-50 border-b border-red-200 p-2 text-center">
                        <p className="text-sm text-red-600 flex items-center justify-center">
                            <FiAlertCircle className="mr-2" />
                            {error}
                        </p>
                    </div>
                )}

                {/* Iframe do Guacamole - Container com suporte a Fullscreen e Scroll */}
                <div
                    ref={containerRef}
                    className={`flex-1 bg-gray-100 relative ${isFullscreen ? 'fixed inset-0 z-50' : ''} overflow-auto`}
                    onClick={handleContainerClick}
                >
                    <iframe
                        ref={iframeRef}
                        name="wkradar-iframe"
                        src={!loginAttempted ? 'about:blank' : ''} // Src will be set after login
                        className="w-full h-full border-0 absolute inset-0"
                        title="WKRadar - Guacamole"
                        allow="clipboard-read; clipboard-write; fullscreen"
                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
                    />

                    {!loginAttempted && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10">
                            <FiLoader className="animate-spin h-10 w-10 text-indigo-600 mb-4" />
                            <p className="text-gray-500">{t('wkradar.connecting', 'Conectando ao WKRadar...')}</p>
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
