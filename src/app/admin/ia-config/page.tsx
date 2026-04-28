'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const IAConfigPanel = dynamic(() => import('@/components/IA/IAConfigPanel'), { ssr: false });

export default function IAAdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      {/* Page header — inline with admin layout */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Configuração IA</h1>
          <p className="text-sm text-gray-500 mt-1">Configure o endpoint, modelo e parâmetros do ABZ Assistant</p>
        </div>
        <a href="/ia" className="text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-md transition-shadow">
          💬 Abrir Chat
        </a>
      </div>

      <IAConfigPanel token={token} />
    </div>
  );
}
