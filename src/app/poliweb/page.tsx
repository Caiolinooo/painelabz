'use client';

import { useEffect, useState, useRef } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import {
    FiAlertCircle,
    FiClipboard,
    FiLoader,
    FiMaximize,
    FiMinimize,
    FiRefreshCw,
    FiSettings,
    FiExternalLink,
} from 'react-icons/fi';

export default function PoliwebPage() {
    const { user, isAdmin, hasAccess } = useSupabaseAuth();
    const hasPoliwebAccess = hasAccess('poliweb');

    const [loading, setLoading] = useState(true);
    const [loggingIn, setLoggingIn] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [proxyReady, setProxyReady] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        if (!hasPoliwebAccess || !user) return;

        const autoLogin = async () => {
            setLoggingIn(true);
            setError(null);

            try {
                const getToken = () => {
                    const cookies = document.cookie.split('; ');
                    const abzToken = cookies.find(row => row.startsWith('abzToken='))?.split('=')[1];
                    const token = cookies.find(row => row.startsWith('token='))?.split('=')[1];
                    return abzToken || token;
                };

                const token = getToken();
                if (!token) {
                    setError('Sessão expirada. Faça login novamente no portal.');
                    setLoggingIn(false);
                    return;
                }

                // Call our login API to authenticate and store session
                const response = await fetch('/api/poliweb/login', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                const data = await response.json();

                if (data.success) {
                    // Session stored server-side, proxy will inject cookies
                    setProxyReady(true);
                } else {
                    setError(data.error || 'Falha ao realizar login automático.');
                }
            } catch (err) {
                console.error('Erro no auto-login Poliweb:', err);
                setError('Erro de conexão com o Poliweb.');
            } finally {
                setLoggingIn(false);
                setLoading(false);
            }
        };

        autoLogin();
    }, [hasPoliwebAccess, user]);

    const handleReload = () => {
        setProxyReady(false);
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setProxyReady(true);
            if (iframeRef.current) {
                iframeRef.current.src = '/api/poliweb-proxy/PainelEmpresa';
            }
        }, 100);
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

    const handleOpenNewWindow = () => {
        window.open('https://poliweb.policlinicamacae.com.br/PainelEmpresa', '_blank');
    };

    if (!hasPoliwebAccess) {
        return (
            <MainLayout>
                <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Poliweb</h1>
                        <p className="mt-2 text-gray-600">Clínica ocupacional e gestão de ASO</p>
                    </div>

                    <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
                        <div className="flex items-start gap-3">
                            <FiAlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
                            <div>
                                <h2 className="text-lg font-semibold text-red-700">Acesso não autorizado</h2>
                                <p className="mt-1 text-sm text-red-700">
                                    Seu setor não possui permissão para utilizar o módulo Poliweb no momento.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (loading || loggingIn) {
        return (
            <MainLayout>
                <div className="flex flex-col -m-4 md:-m-6 h-[calc(100vh-64px)] md:h-[calc(100vh-80px)]">
                    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm z-10">
                        <div className="flex items-center space-x-3">
                            <div className="bg-blue-100 p-1.5 rounded-lg">
                                <FiClipboard className="h-5 w-5 text-blue-600" />
                            </div>
                            <h1 className="text-lg font-bold text-gray-800">Poliweb</h1>
                        </div>
                    </div>
                    <div className="flex-1 bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
                        <FiLoader className="animate-spin h-12 w-12 text-blue-600 mb-4" />
                        <p className="text-gray-600 text-lg mb-2">
                            {loggingIn ? 'Realizando login automático...' : 'Carregando Poliweb...'}
                        </p>
                        <p className="text-gray-400 text-sm">
                            Aguarde enquanto conectamos ao sistema da clínica ocupacional.
                        </p>
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (error) {
        return (
            <MainLayout>
                <div className="flex flex-col -m-4 md:-m-6 h-[calc(100vh-64px)] md:h-[calc(100vh-80px)]">
                    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm z-10">
                        <div className="flex items-center space-x-3">
                            <div className="bg-blue-100 p-1.5 rounded-lg">
                                <FiClipboard className="h-5 w-5 text-blue-600" />
                            </div>
                            <h1 className="text-lg font-bold text-gray-800">Poliweb</h1>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={handleReload}
                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-md transition-colors"
                                title="Tentar novamente"
                            >
                                <FiRefreshCw className="h-5 w-5" />
                            </button>
                            {isAdmin && (
                                <a
                                    href="/admin/poliweb"
                                    className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                                    title="Configurações"
                                >
                                    <FiSettings className="h-5 w-5" />
                                </a>
                            )}
                        </div>
                    </div>
                    <div className="flex-1 bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
                        <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg w-full">
                            <div className="h-20 w-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <FiAlertCircle className="h-10 w-10 text-red-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Erro ao Conectar</h2>
                            <p className="text-gray-600 mb-6 text-lg">{error}</p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={handleReload}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                                >
                                    Tentar Novamente
                                </button>
                                <button
                                    onClick={handleOpenNewWindow}
                                    className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
                                >
                                    <FiExternalLink className="h-4 w-4" />
                                    Abrir no Navegador
                                </button>
                            </div>
                        </div>
                    </div>
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
                        <div className="bg-blue-100 p-1.5 rounded-lg">
                            <FiClipboard className="h-5 w-5 text-blue-600" />
                        </div>
                        <h1 className="text-lg font-bold text-gray-800">Poliweb</h1>
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={handleReload}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-md transition-colors"
                            title="Recarregar"
                        >
                            <FiRefreshCw className="h-5 w-5" />
                        </button>

                        <button
                            onClick={toggleFullscreen}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-md transition-colors"
                            title={isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}
                        >
                            {isFullscreen ? <FiMinimize className="h-5 w-5" /> : <FiMaximize className="h-5 w-5" />}
                        </button>

                        {isAdmin && (
                            <a
                                href="/admin/poliweb"
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
                            <FiExternalLink className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Content - iframe through proxy */}
                <div
                    ref={containerRef}
                    className={`flex-1 bg-gray-100 relative ${isFullscreen ? 'fixed inset-0 z-50' : ''} overflow-hidden`}
                >
                    {proxyReady ? (
                        <iframe
                            ref={iframeRef}
                            src="/api/poliweb-proxy/PainelEmpresa"
                            className="w-full h-full border-0"
                            title="Poliweb - Clínica Ocupacional"
                            allow="clipboard-read; clipboard-write; fullscreen"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <FiLoader className="animate-spin h-8 w-8 text-blue-600" />
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
