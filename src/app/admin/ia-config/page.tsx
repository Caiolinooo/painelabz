'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const IAConfigPanel = dynamic(() => import('@/components/IA/IAConfigPanel'), { ssr: false });
const IAPermissionConfigPanel = dynamic(() => import('@/components/IA/IAPermissionConfigPanel'), { ssr: false });
const IAKnowledgeBasePanel = dynamic(() => import('@/components/IA/IAKnowledgeBasePanel'), { ssr: false });
const IAFeatureTogglesPanel = dynamic(() => import('@/components/IA/IAFeatureTogglesPanel'), { ssr: false });

type TabType = 'config' | 'permissions' | 'knowledge' | 'toggles';

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

  const renderContent = () => {
    switch (activeTab) {
      case 'config': return <IAConfigPanel token={token} />;
      case 'permissions': return <IAPermissionConfigPanel token={token} />;
      case 'knowledge': return <IAKnowledgeBasePanel token={token} />;
      case 'toggles': return <IAFeatureTogglesPanel token={token} />;
      default: return null;
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Centro de Comando IA</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeTab === 'config' && 'Configure o endpoint, modelo e parâmetros do ABZ Assistant'}
            {activeTab === 'permissions' && 'Gerencie permissões do agente IA para cada módulo'}
            {activeTab === 'knowledge' && 'Gerencie a base de conhecimento e memória corporativa'}
            {activeTab === 'toggles' && 'Controle granular de ativação de ferramentas e agentes'}
          </p>
        </div>
        <a href="/ia" className="text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-md transition-shadow">
          💬 Abrir Chat
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors whitespace-nowrap ${
            activeTab === 'config' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          🤖 Modelo
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors whitespace-nowrap ${
            activeTab === 'permissions' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          ⚡ Permissões
        </button>
        <button
          onClick={() => setActiveTab('knowledge')}
          className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors whitespace-nowrap ${
            activeTab === 'knowledge' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          📚 Base de Conhecimento
        </button>
        <button
          onClick={() => setActiveTab('toggles')}
          className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors whitespace-nowrap ${
            activeTab === 'toggles' ? 'bg-orange-600 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          ⚙️ Tool Toggles
        </button>
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {renderContent()}
      </div>
    </div>
  );
}