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

type TabType = 'novo' | 'antigo';

interface TabState {
    loading: boolean;
    loggingIn: boolean;
    error: string | null;
    proxyReady: boolean;
}

const initialTabState: TabState = {
    loading: true,
    loggingIn: false,
    error: null,
    proxyReady: false,
};

export default function PoliwebPage() {
    const { user, isAdmin, hasAccess } = useSupabaseAuth();
    const hasPoliwebAccess = hasAccess('poliweb');

    const [activeTab, setActiveTab] = useState<TabType>('novo');
    const [tabStates, setTabStates] = useState<Record<TabType, TabState>>({
        novo: initialTabState,
        antigo: initialTabState,
    });
    const [isFullscreen, setIsFullscreen] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const currentState = tabStates[activeTab];

    // Auto-login when tab changes or on mount
    useEffect(() => {
        if (!hasPoliwebAccess || !user) return;

        const doLogin = async () => {
            // Set loading state for this tab
            setTabStates(prev => ({
                ...prev,
                [activeTab]: {
                    ...prev[activeTab],
                    loading: true,
                    loggingIn: true,
                    error: null,
                }
            }));

            try {
                const getToken = () => {
                    const cookies = document.cookie.split('; ');
                    const abzToken = cookies.find(row => row.startsWith('abzToken='))?.split('=')[1];
                    const token = cookies.find(row => row.startsWith('token='))?.split('=')[1];
                    return abzToken || token;
                };

                const token = getToken();
                if (!token) {
                    setTabStates(prev => ({
                        ...prev,
                        [activeTab]: {
                            ...prev[activeTab],
                            loading: false,
                            loggingIn: false,
                            error: 'Sessão expirada. Faça login novamente no portal.',
                        }
                    }));
                    return;
                }

                const loginApi = activeTab === 'novo' ? '/api/poliweb/login' : '/api/poliweb-antigo/login';
                
                const response = await fetch(loginApi, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                const data = await response.json();

                if (data.success) {
                    setTabStates(prev => ({
                        ...prev,
                        [activeTab]: {
                            ...prev[activeTab],
                            loading: false,
                            loggingIn: false,
                            proxyReady: true,
                            error: null,
                        }
                    }));
                } else {
                    setTabStates(prev => ({
                        ...prev,
                        [activeTab]: {
                            ...prev[activeTab],
                            loading: false,
                            loggingIn: false,
                            error: data.error || `Falha ao realizar login no Poliweb ${activeTab === 'novo' ? 'Novo' : 'Antigo'}.`,
                        }
                    }));
                }
            } catch (err) {
                console.error('Erro no auto-login Poliweb:', err);
                setTabStates(prev => ({
                    ...prev,
                    [activeTab]: {
                        ...prev[activeTab],
                        loading: false,
                        loggingIn: false,
                        error: 'Erro de conexão com o Poliweb.',
                    }
                }));
            }
        };

        doLogin();
    }, [hasPoliwebAccess, user, activeTab]);

    const handleTabChange = (tab: TabType) => {
        // Just switch tabs - each tab maintains its own state
        setActiveTab(tab);
    };

    const handleReload = () => {
        // Reset this tab's state and trigger re-login
        setTabStates(prev => ({
            ...prev,
            [activeTab]: {
                loading: true,
                loggingIn: true,
                error: null,
                proxyReady: false,
            }
        }));
        
        // Trigger login effect by toggling
        const current = activeTab;
        setActiveTab(current === 'novo' ? 'antigo' : 'novo');
        setTimeout(() => setActiveTab(current), 50);
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
        const url = activeTab === 'novo'
            ? 'https://poliweb.policlinicamacae.com.br/PainelEmpresa'
            : 'https://www.policlinicaweb.com.br/';
        window.open(url, '_blank');
    };

    const getIframeSrc = () => {
        return activeTab === 'novo'
            ? '/api/poliweb-proxy/PainelEmpresa'
            : '/api/poliweb-antigo-proxy/';
    };

    const getTabLabel = () => {
        return activeTab === 'novo' ? 'Novo Poliweb' : 'Poliweb Antigo';
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

                    {/* Tab Switcher - Always visible and clickable */}
                    <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => handleTabChange('novo')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                activeTab === 'novo'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                            }`}
                        >
                            Novo
                            {tabStates.novo.error && (
                                <span className="ml-1 inline-block w-2 h-2 bg-red-500 rounded-full" title="Erro no login" />
                            )}
                        </button>
                        <button
                            onClick={() => handleTabChange('antigo')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                activeTab === 'antigo'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                            }`}
                        >
                            Antigo
                            {tabStates.antigo.error && (
                                <span className="ml-1 inline-block w-2 h-2 bg-red-500 rounded-full" title="Erro no login" />
                            )}
                        </button>
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={handleReload}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-md transition-colors"
                            title="Recarregar / Tentar novamente"
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

                {/* Content */}
                <div
                    ref={containerRef}
                    className={`flex-1 bg-gray-100 relative ${isFullscreen ? 'fixed inset-0 z-50' : ''} overflow-hidden`}
                >
                    {currentState.loading || currentState.loggingIn ? (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                            <FiLoader className="animate-spin h-12 w-12 text-blue-600 mb-4" />
                            <p className="text-gray-600 text-lg mb-2">
                                {currentState.loggingIn 
                                    ? `Realizando login no ${getTabLabel()}...` 
                                    : 'Carregando...'}
                            </p>
                            <p className="text-gray-400 text-sm">
                                Aguarde enquanto conectamos ao sistema.
                            </p>
                        </div>
                    ) : currentState.error ? (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                            <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg w-full">
                                <div className="h-20 w-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <FiAlertCircle className="h-10 w-10 text-red-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-800 mb-4">Erro ao Conectar</h2>
                                <p className="text-gray-600 mb-6 text-lg">{currentState.error}</p>
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={handleReload}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                                    >
                                        Tentar Novamente
                                    </button>
                                    <div className="flex gap-3 justify-center">
                                        <button
                                            onClick={() => handleTabChange('novo')}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                                                activeTab === 'novo' 
                                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                            }`}
                                            disabled={activeTab === 'novo'}
                                        >
                                            Ver Novo Poliweb
                                        </button>
                                        <button
                                            onClick={() => handleTabChange('antigo')}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                                                activeTab === 'antigo'
                                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                            }`}
                                            disabled={activeTab === 'antigo'}
                                        >
                                            Ver Poliweb Antigo
                                        </button>
                                    </div>
                                    <button
                                        onClick={handleOpenNewWindow}
                                        className="flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700 text-sm"
                                    >
                                        <FiExternalLink className="h-4 w-4" />
                                        Abrir no Navegador
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : currentState.proxyReady ? (
                        <iframe
                            ref={iframeRef}
                            src={getIframeSrc()}
                            className="w-full h-full border-0"
                            title={`Poliweb - ${getTabLabel()}`}
                            allow="clipboard-read; clipboard-write; fullscreen"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                            <FiClipboard className="h-16 w-16 text-gray-300 mb-4" />
                            <p className="text-gray-500 text-lg">Pronto para carregar o Poliweb</p>
                            <button
                                onClick={handleReload}
                                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                            >
                                Carregar {getTabLabel()}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
