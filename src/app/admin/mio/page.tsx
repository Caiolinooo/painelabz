'use client';

import React, { useState } from 'react';
import { FiRefreshCw, FiCheckCircle, FiXCircle, FiServer, FiUsers } from 'react-icons/fi';


export default function MioAdminPage() {
    const [testing, setTesting] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<null | { success: boolean; message: string }>(null);
    const [syncResult, setSyncResult] = useState<null | { success: boolean; synced: number; errors: number; total: number; message?: string }>(null);

    const testConnection = async () => {
        setTesting(true);
        setConnectionStatus(null);
        try {
            const res = await fetch('/api/mio/test');
            const data = await res.json();
            setConnectionStatus(data);
        } catch (err) {
            setConnectionStatus({ success: false, message: 'Falha ao contatar servidor local.' });
        } finally {
            setTesting(false);
        }
    };

    const syncEmployees = async () => {
        setSyncing(true);
        setSyncResult(null);
        try {
            const res = await fetch('/api/mio/sync', { method: 'POST' });
            const data = await res.json();
            setSyncResult(data);
        } catch (err) {
            setSyncResult({ success: false, synced: 0, errors: 0, total: 0, message: 'Erro na requisição de sync.' });
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="flex-1 p-6">
            <div className="p-6 max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Integração MIO</h1>
                <p className="text-gray-600 mb-8">Gerencie a conexão e sincronização com a API MIO (mio.app.br).</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* Card de Conexão */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-700">
                                <FiServer className="text-blue-500" /> Status da Conexão
                            </h2>
                            {connectionStatus && (
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${connectionStatus.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {connectionStatus.success ? 'Conectado' : 'Erro'}
                                </span>
                            )}
                        </div>

                        <p className="text-gray-500 text-sm mb-6">
                            Verifique se o Portal consegue se autenticar com a API MIO usando as credenciais configuradas.
                        </p>

                        {connectionStatus && !connectionStatus.success && (
                            <div className="bg-red-50 p-4 rounded-lg mb-4 text-sm text-red-700 border border-red-100">
                                <strong>Erro:</strong> {connectionStatus.message}
                            </div>
                        )}

                        {connectionStatus && connectionStatus.success && (
                            <div className="bg-green-50 p-4 rounded-lg mb-4 text-sm text-green-700 border border-green-100">
                                <strong>Sucesso:</strong> {connectionStatus.message}
                            </div>
                        )}

                        <button
                            onClick={testConnection}
                            disabled={testing}
                            className="w-full py-2.5 px-4 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                        >
                            {testing ? <FiRefreshCw className="animate-spin" /> : <FiRefreshCw />}
                            {testing ? 'Testando...' : 'Testar Conexão Agora'}
                        </button>
                    </div>

                    {/* Card de Sincronização */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-700">
                                <FiUsers className="text-purple-500" /> Sincronização de Funcionários
                            </h2>
                        </div>

                        <p className="text-gray-500 text-sm mb-6">
                            Atualize a base de usuários do Portal ABZ com os dados mais recentes do MIO (Integrantes).
                        </p>

                        {syncResult && (
                            <div className={`p-4 rounded-lg mb-4 text-sm border ${syncResult.success ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                                {syncResult.success ? (
                                    <div className="space-y-1 text-green-800">
                                        <p className="font-bold flex items-center gap-2"><FiCheckCircle /> Sincronização Concluída</p>
                                        <ul className="list-disc list-inside mt-2 text-green-700 pl-1">
                                            <li>Total Processado: <b>{syncResult.total}</b></li>
                                            <li>Atualizados/Verificados: <b>{syncResult.synced}</b></li>
                                            <li>Erros: <b>{syncResult.errors}</b></li>
                                        </ul>
                                    </div>
                                ) : (
                                    <div className="text-red-800 flex items-center gap-2">
                                        <FiXCircle /> Falha: {syncResult.message}
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={syncEmployees}
                            disabled={syncing}
                            className="w-full py-2.5 px-4 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                        >
                            {syncing ? <FiRefreshCw className="animate-spin" /> : <FiUsers />}
                            {syncing ? 'Sincronizando...' : 'Iniciar Sincronização Manual'}
                        </button>
                    </div>

                </div>

                {/* Informações Técnicas */}
                <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Detalhes da Configuração</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-500">API URL:</span> <span className="font-mono text-gray-800">https://mio.app.br/api/v1</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Endpoint Auth:</span> <span className="font-mono text-gray-800">/authenticate</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
