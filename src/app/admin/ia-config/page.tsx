'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const IAConfigPanel = dynamic(() => import('@/components/IA/IAConfigPanel'), { ssr: false });
const IAPermissionConfigPanel = dynamic(() => import('@/components/IA/IAPermissionConfigPanel'), { ssr: false });

type TabType = 'config' | 'permissions';

export default function IAAdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('config');

  useEffect(() => {
    const cookies = document.cookie.split(';');
    for (const c of cookies) {
      const [n, v] = c.trim().split('=');
      if (n === 'abzToken' || n === 'token') {
        setToken(decodeURIComponent(v));
        break;
      }
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-gray-600">Token não encontrado. Faça login novamente.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Configuração IA</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeTab === 'config' 
              ? 'Configure o endpoint, modelo e parâmetros do ABZ Assistant'
              : 'Gerencie permissões do agente IA para cada módulo'}
          </p>
        </div>
        <a href="/ia" className="text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-md transition-shadow">
          💬 Abrir Chat
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
            activeTab === 'config'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          🤖 Modelo & Configuração
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
            activeTab === 'permissions'
              ? 'bg-purple-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          ⚡ Permissões & Ações
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'config' ? (
        <IAConfigPanel token={token} />
      ) : (
        <IAPermissionConfigPanel token={token} />
      )}
    </div>
  );
}