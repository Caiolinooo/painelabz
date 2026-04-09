'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/Layout/MainLayout';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useSignature } from '@/contexts/SignatureContext';
import { fetchWithAuth } from '@/lib/authUtils';
import { toast } from 'react-hot-toast';
import {
    FiArrowLeft, FiCalendar, FiMapPin, FiUsers, FiCopy,
    FiLock, FiUnlock, FiClock, FiUser, FiCheck, FiFileText,
    FiDownload, FiEdit3
} from 'react-icons/fi';

interface ListaDetail {
    id: string;
    titulo: string;
    data_evento: string;
    hora_inicio: string | null;
    hora_fim: string | null;
    local: string | null;
    pauta: string | null;
    status: string;
    link_unico: string;
    total_participantes: number;
    criador_nome: string;
}

interface Registro {
    id: string;
    nome_completo: string;
    funcao: string | null;
    empresa: string | null;
    assinatura_url: string;
    created_at: string;
    user_id: string | null;
    usuario_nome: string | null;
}

export default function ListaDetailPage() {
    const params = useParams();
    const router = useRouter();
    const listaId = params?.id as string;
    const { profile, user } = useSupabaseAuth();
    const { requestSignature, hasSignature } = useSignature();

    const [lista, setLista] = useState<ListaDetail | null>(null);
    const [registros, setRegistros] = useState<Registro[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSigningIn, setIsSigningIn] = useState(false);

    const isManager = profile?.role === 'ADMIN' || profile?.role === 'MANAGER';

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            const [listaRes, regRes] = await Promise.all([
                fetchWithAuth(`/api/lista-presenca?limit=1&search=`),
                fetchWithAuth(`/api/lista-presenca/registros?lista_id=${listaId}`),
            ]);
            const listaData = await listaRes.json();
            const regData = await regRes.json();

            // Find the specific list from results
            const matchedList = (listaData.listas || []).find((l: any) => l.id === listaId);
            if (matchedList) setLista(matchedList);
            if (regData.success) setRegistros(regData.registros || []);
        } catch (err) {
            console.error('Erro ao carregar detalhes:', err);
            toast.error('Erro ao carregar detalhes da lista');
        } finally {
            setIsLoading(false);
        }
    }, [listaId]);

    useEffect(() => {
        if (listaId) fetchData();
    }, [listaId, fetchData]);

    // Assinar presença (usuário logado)
    const handleSignAttendance = async () => {
        if (!profile || !user) {
            toast.error('Faça login para assinar');
            return;
        }

        const result = await requestSignature({
            title: 'Registrar Presença',
            description: `Confirme sua identidade para registrar presença em "${lista?.titulo || 'evento'}"`,
        });

        if (!result) return;

        try {
            setIsSigningIn(true);
            const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
            const res = await fetchWithAuth('/api/lista-presenca/registros', {
                method: 'POST',
                body: ***REMOVED***
                    lista_id: listaId,
                    nome_completo: fullName,
                    funcao: profile.role || '',
                    empresa: 'ABZ Group',
                    assinatura_url: result.signatureUrl,
                    user_id: user.id,
                }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Presença registrada!');
                fetchData();
            } else {
                toast.error(data.error || 'Erro ao registrar');
            }
        } catch (err: any) {
            toast.error(err.message || 'Erro ao registrar presença');
        } finally {
            setIsSigningIn(false);
        }
    };

    const handleCopyLink = () => {
        if (!lista) return;
        const url = `${window.location.origin}/lista-presenca/public/${lista.link_unico}`;
        navigator.clipboard.writeText(url);
        toast.success('Link copiado!');
    };

    const formatDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const formatTime = (t: string | null) => t ? t.slice(0, 5) : '';
    const formatDateTime = (d: string) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    // Check if current user already signed
    const alreadySigned = registros.some(r => r.user_id === user?.id);

    if (isLoading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center py-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Back + Header */}
                <div>
                    <button onClick={() => router.push('/lista-presenca')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
                        <FiArrowLeft className="w-4 h-4" />
                        Voltar
                    </button>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex-1 min-w-0">
                                <h1 className="text-xl font-bold text-gray-900">{lista?.titulo || 'Lista de Presença'}</h1>
                                <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
                                    <span className="flex items-center gap-1.5">
                                        <FiCalendar className="w-4 h-4 text-gray-400" />
                                        {lista ? formatDate(lista.data_evento) : ''}
                                    </span>
                                    {lista?.hora_inicio && (
                                        <span className="flex items-center gap-1.5">
                                            <FiClock className="w-4 h-4 text-gray-400" />
                                            {formatTime(lista.hora_inicio)}{lista.hora_fim ? ` – ${formatTime(lista.hora_fim)}` : ''}
                                        </span>
                                    )}
                                    {lista?.local && (
                                        <span className="flex items-center gap-1.5">
                                            <FiMapPin className="w-4 h-4 text-gray-400" />
                                            {lista.local}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1.5">
                                        <FiUsers className="w-4 h-4 text-gray-400" />
                                        {lista?.total_participantes || registros.length} participantes
                                    </span>
                                </div>
                                {lista?.pauta && (
                                    <div className="mt-4 p-3 bg-gray-50 rounded-xl text-sm text-gray-600">{lista.pauta}</div>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={handleCopyLink} className="flex items-center gap-1.5 px-3 py-2 text-sm text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors">
                                    <FiCopy className="w-4 h-4" />
                                    Copiar Link
                                </button>
                                {lista?.status === 'aberta' && !alreadySigned && (
                                    <button
                                        onClick={handleSignAttendance}
                                        disabled={isSigningIn}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:bg-gray-300 transition-colors font-medium text-sm"
                                    >
                                        {isSigningIn ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <FiEdit3 className="w-4 h-4" />}
                                        Assinar Presença
                                    </button>
                                )}
                                {alreadySigned && (
                                    <span className="flex items-center gap-1.5 px-4 py-2.5 bg-green-50 text-green-700 rounded-xl text-sm font-medium">
                                        <FiCheck className="w-4 h-4" />
                                        Presença Registrada
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Records Table */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-900">Registros de Presença</h2>
                    </div>

                    {registros.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <FiUsers className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm">Nenhuma presença registrada ainda.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                    <tr>
                                        <th className="px-6 py-3 text-left font-medium">#</th>
                                        <th className="px-6 py-3 text-left font-medium">Nome / Name</th>
                                        <th className="px-6 py-3 text-left font-medium">Função / Position</th>
                                        <th className="px-6 py-3 text-left font-medium">Assinatura / Signature</th>
                                        <th className="px-6 py-3 text-left font-medium">Data/Hora</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {registros.map((reg, idx) => (
                                        <tr key={reg.id} className="hover:bg-gray-50/50">
                                            <td className="px-6 py-3 text-gray-400 font-mono">{idx + 1}</td>
                                            <td className="px-6 py-3 font-medium text-gray-900">{reg.nome_completo}</td>
                                            <td className="px-6 py-3 text-gray-500">{reg.funcao || '—'}</td>
                                            <td className="px-6 py-3">
                                                <img
                                                    src={reg.assinatura_url}
                                                    alt={`Assinatura de ${reg.nome_completo}`}
                                                    className="h-10 max-w-[120px] object-contain"
                                                    crossOrigin="anonymous"
                                                />
                                            </td>
                                            <td className="px-6 py-3 text-gray-400 text-xs">{formatDateTime(reg.created_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
