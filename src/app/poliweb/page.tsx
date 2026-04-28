'use client';

import { useEffect, useState, useRef } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import {
    FiAlertCircle,
    FiAlertTriangle,
    FiClipboard,
    FiLoader,
    FiMaximize,
    FiMinimize,
    FiRefreshCw,
    FiSettings,
    FiExternalLink,
    FiSave,
    FiX,
} from 'react-icons/fi';

type TabType = 'novo' | 'antigo';

export default function PoliwebPage() {
    const { user, isAdmin, hasAccess } = useSupabaseAuth();
    const hasPoliwebAccess = hasAccess('poliweb');

    const [activeTab, setActiveTab] = useState<TabType>('novo');
    const [loading, setLoading] = useState(true);
    const [loggingIn, setLoggingIn] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [proxyReady, setProxyReady] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showCredentialModal, setShowCredentialModal] = useState(false);
    const [missingCredentialType, setMissingCredentialType] = useState<'novo' | 'antigo' | null>(null);
    const [credentialForm, setCredentialForm] = useState({
        username_novo: '',
        password_novo: '',
        username_antigo: '',
        password_antigo: '',
    });
    const [savingCredentials, setSavingCredentials] = useState(false);

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
                    setProxyReady(true);
                } else if (data.needsCredentialUpdate) {
                    setMissingCredentialType(data.missingType);
                    setShowCredentialModal(true);
                    setLoading(false);
                    setLoggingIn(false);
                } else {
                    setError(data.error || `Falha ao realizar login no Poliweb ${activeTab === 'novo' ? 'Novo' : 'Antigo'}.`);
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
    }, [hasPoliwebAccess, user, activeTab]);

    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        setProxyReady(false);
        setLoading(true);
        setError(null);
    };

    const handleReload = () => {
        setProxyReady(false);
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setProxyReady(true);
            if (iframeRef.current) {
                const src = activeTab === 'novo'
                    ? '/api/poliweb-proxy/PainelEmpresa'
                    : '/api/poliweb-antigo-proxy/Login.aspx';
                iframeRef.current.src = src;
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
        const url = activeTab === 'novo'
            ? 'https://poliweb.policlinicamacae.com.br/PainelEmpresa'
            : 'https://www.policlinicaweb.com.br/';
        window.open(url, '_blank');
    };

    const handleSaveCredentials = async () => {
        setSavingCredentials(true);
        try {
            const getToken = () => {
                const cookies = document.cookie.split('; ');
                const abzToken = cookies.find(row => row.startsWith('abzToken='))?.split('=')[1];
                const token = cookies.find(row => row.startsWith('token='))?.split('=')[1];
                return abzToken || token;
            };
            const token = getToken();
            if (!token) {
                setError('Sessão expirada. Faça login novamente.');
                return;
            }

            const response = await fetch('/api/poliweb/credentials', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user?.id,
                    username_novo: credentialForm.username_novo,
                    password_novo: credentialForm.password_novo,
                    username_antigo: credentialForm.username_antigo,
                    password_antigo: credentialForm.password_antigo,
                }),
            });

            const data = await response.json();
            if (data.success) {
                setShowCredentialModal(false);
                setLoading(true);
                setError(null);
                setActiveTab(activeTab);
                const loginApi = activeTab === 'novo' ? '/api/poliweb/login' : '/api/poliweb-antigo/login';
                const loginResponse = await fetch(loginApi, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                const loginData = await loginResponse.json();
                if (loginData.success) {
                    setProxyReady(true);
                } else {
                    setError(loginData.error || 'Falha ao conectar após atualização.');
                }
            } else {
                setError(data.error || 'Erro ao salvar credenciais.');
            }
        } catch (err) {
            console.error('Erro ao salvar credenciais:', err);
            setError('Erro ao salvar credenciais.');
        } finally {
            setSavingCredentials(false);
            setLoading(false);
        }
    };

    const getIframeSrc = () => {
        return activeTab === 'novo'
            ? '/api/poliweb-proxy/PainelEmpresa'
            : '/api/poliweb-antigo-proxy/Login.aspx';
    };

    const getTabLabel = () => {
        return activeTab === 'novo' ? 'Novo Poliweb' : 'Poliweb Antigo';
    };

    const renderCredentialModal = () => (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-amber-100 p-2 rounded-lg">
                                <FiAlertTriangle className="h-6 w-6 text-amber-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Credenciais Não Configuradas</h2>
                                <p className="text-sm text-gray-500">Atualize seu cadastro para continuar</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                        <p className="text-sm text-amber-800">
                            Para acessar o <strong>{missingCredentialType === 'novo' ? 'Poliweb Novo' : 'Poliweb Antigo'}</strong>, 
                            você precisa cadastrar suas credenciais. Caso tenha credenciais de ambos os sistemas, 
                            preencha os dois campos para facilitar a alternância.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="border border-gray-200 rounded-lg p-4">
                            <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">Novo</span>
                                Poliweb Novo
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={credentialForm.username_novo}
                                        onChange={(e) => setCredentialForm({ ...credentialForm, username_novo: e.target.value })}
                                        placeholder="seu.email@empresa.com"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                                    <input
                                        type="password"
                                        value={credentialForm.password_novo}
                                        onChange={(e) => setCredentialForm({ ...credentialForm, password_novo: e.target.value })}
                                        placeholder="••••••••"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="border border-gray-200 rounded-lg p-4">
                            <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                                <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded">Antigo</span>
                                Poliweb Antigo
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={credentialForm.username_antigo}
                                        onChange={(e) => setCredentialForm({ ...credentialForm, username_antigo: e.target.value })}
                                        placeholder="seu.email@empresa.com"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                                    <input
                                        type="password"
                                        value={credentialForm.password_antigo}
                                        onChange={(e) => setCredentialForm({ ...credentialForm, password_antigo: e.target.value })}
                                        placeholder="••••••••"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={handleSaveCredentials}
                            disabled={savingCredentials || (!credentialForm.username_novo && !credentialForm.password_novo && !credentialForm.username_antigo && !credentialForm.password_antigo)}
                            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-medium transition-colors"
                        >
                            {savingCredentials ? (
                                <>
                                    <FiLoader className="animate-spin h-4 w-4" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <FiSave className="h-4 w-4" />
                                    Salvar e Conectar
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

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
                            {loggingIn ? `Realizando login no ${getTabLabel()}...` : 'Carregando Poliweb...'}
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
            {showCredentialModal && renderCredentialModal()}
            <div className="flex flex-col -m-4 md:-m-6 h-[calc(100vh-64px)] md:h-[calc(100vh-80px)]">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm z-10">
                    <div className="flex items-center space-x-3">
                        <div className="bg-blue-100 p-1.5 rounded-lg">
                            <FiClipboard className="h-5 w-5 text-blue-600" />
                        </div>
                        <h1 className="text-lg font-bold text-gray-800">Poliweb</h1>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => handleTabChange('novo')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                activeTab === 'novo'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Novo
                        </button>
                        <button
                            onClick={() => handleTabChange('antigo')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                activeTab === 'antigo'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Antigo
                        </button>
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

                {/* Content */}
                <div
                    ref={containerRef}
                    className={`flex-1 bg-gray-100 relative ${isFullscreen ? 'fixed inset-0 z-50' : ''} overflow-hidden`}
                >
                    {proxyReady ? (
                        <iframe
                            ref={iframeRef}
                            src={getIframeSrc()}
                            className="w-full h-full border-0"
                            title={`Poliweb - ${getTabLabel()}`}
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
