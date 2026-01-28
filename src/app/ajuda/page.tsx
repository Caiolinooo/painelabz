'use client';

import React from 'react';
import Link from 'next/link';
import { FiPhone, FiAlertTriangle, FiHelpCircle, FiMail } from 'react-icons/fi';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

export default function AjudaPage() {
    const { user } = useSupabaseAuth();

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="space-y-2">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Central de Ajuda</h1>
                <p className="text-gray-500">
                    Encontre suporte, contatos e procedimentos importantes.
                </p>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Lista de Ramais */}
                <Link href="/contatos" className="group p-6 bg-white rounded-2xl shadow-sm hover:shadow-md border border-gray-100 transition-all duration-200">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <FiPhone className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Lista de Ramais</h3>
                    <p className="text-sm text-gray-500">
                        Acesse a lista completa de contatos e telefones úteis da empresa.
                    </p>
                </Link>

                {/* Emergência */}
                <Link href="/emergencia" className="group p-6 bg-white rounded-2xl shadow-sm hover:shadow-md border border-gray-100 transition-all duration-200">
                    <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <FiAlertTriangle className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Emergência</h3>
                    <p className="text-sm text-gray-500">
                        Procedimentos para situações de emergência e contatos críticos.
                    </p>
                </Link>

                {/* Suporte Técnico */}
                <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                        <FiHelpCircle className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Suporte Técnico</h3>
                    <p className="text-sm text-gray-500 mb-4">
                        Precisa de ajuda com o sistema? Entre em contato com o suporte.
                    </p>
                    <a href="mailto:suporte@exemplo.com" className="inline-flex items-center text-sm font-medium text-purple-600 hover:text-purple-700">
                        <FiMail className="w-4 h-4 mr-2" />
                        Abrir Chamado
                    </a>
                </div>
            </div>
        </div>
    );
}
