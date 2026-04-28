'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import MainLayout from '@/components/Layout/MainLayout';

const ChatWindow = dynamic(() => import('@/components/IA/ChatWindow'), { ssr: false });

export default function IAPage() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getToken = () => {
      if (typeof document === 'undefined') return null;
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'abzToken' || name === 'token') {
          return decodeURIComponent(value);
        }
      }
      return null;
    };

    const t = getToken();
    if (t) {
      setToken(t);
    } else {
      window.location.href = '/login?redirect=/ia';
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <div className="w-12 h-12 border-3 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Carregando ABZ Assistant...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!token) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-gray-600">Redirecionando para login...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="-mx-4 md:-mx-8 -my-8" style={{ height: 'calc(100vh - 80px)' }}>
        <ChatWindow token={token} />
      </div>
    </MainLayout>
  );
}
