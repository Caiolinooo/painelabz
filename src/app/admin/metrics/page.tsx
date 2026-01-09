'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { FiActivity, FiUsers, FiEye, FiHelpCircle, FiPlus, FiTrash2, FiTrendingUp, FiBarChart2, FiMessageSquare } from 'react-icons/fi';
import { fetchWithToken } from '@/lib/tokenStorage';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

interface WAUMetrics {
    wau: number;
    totalUsers: number;
    percentage: number;
    period: string;
}

export default function MetricsDashboard() {
    const { t } = useI18n();
    const { user } = useSupabaseAuth(); // Use proper auth context if needed
    const [wauData, setWauData] = useState<WAUMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    // States for FAQ Input
    const [department, setDepartment] = useState('RH');
    const [volume, setVolume] = useState(0);
    const [doubts, setDoubts] = useState<string[]>(['']);
    const [savingFaq, setSavingFaq] = useState(false);

    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        fetchMetrics();
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await fetchWithToken('/api/metrics/support');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    setHistory(data);
                }
            }
        } catch (e) {
            console.error('Failed to fetch history', e);
        }
    };

    const fetchMetrics = async () => {
        try {
            setLoading(true);
            const res = await fetchWithToken('/api/metrics/wau');
            if (res.ok) {
                const data = await res.json();
                setWauData(data);
            }
        } catch (error) {
            console.error('Error fetching metrics', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddDoubt = () => {
        setDoubts([...doubts, '']);
    };

    const handleDoubtChange = (index: number, value: string) => {
        const newDoubts = [...doubts];
        newDoubts[index] = value;
        setDoubts(newDoubts);
    };

    const handleSaveFaq = async () => {
        try {
            setSavingFaq(true);
            const today = new Date();
            const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

            const payload = {
                department,
                volume_estimated: volume,
                top_doubts: doubts.filter(d => d.trim().length > 0),
                period_start: lastWeek.toISOString(),
                period_end: today.toISOString()
            };

            const res = await fetchWithToken('/api/metrics/support', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert('Relatório salvo com sucesso!');
                setDoubts(['']);
                setVolume(0);
                fetchHistory(); // Atualizar lista
            } else {
                alert('Erro ao salvar relatório.');
            }
        } catch (e) {
            console.error(e);
            alert('Erro de conexão.');
        } finally {
            setSavingFaq(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                            Métricas de Comunicação
                        </h1>
                        <p className="text-gray-500 mt-2 text-lg">
                            Acompanhe o engajamento e a efetividade da comunicação interna.
                        </p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <span className="px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                            Semana Atual
                        </span>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* WAU Card */}
                    <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg border border-gray-100 group hover:shadow-xl transition-all duration-300">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <FiActivity className="w-24 h-24 text-blue-600" />
                        </div>
                        <div className="p-6 relative z-10">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="p-3 bg-blue-500 rounded-xl text-white shadow-lg shadow-blue-500/30">
                                    <FiUsers className="w-6 h-6" />
                                </div>
                                <h3 className="text-gray-600 font-semibold text-sm uppercase tracking-wider">Usuários Ativos (7d)</h3>
                            </div>

                            {loading ? (
                                <div className="h-10 w-32 bg-gray-200 animate-pulse rounded-lg"></div>
                            ) : (
                                <div className="flex items-baseline space-x-2">
                                    <span className="text-4xl font-extrabold text-gray-900 tracking-tight">
                                        {wauData?.wau || 0}
                                    </span>
                                    <span className="text-sm font-medium text-green-500 bg-green-50 px-2 py-0.5 rounded-full">
                                        {wauData?.percentage}% da base
                                    </span>
                                </div>
                            )}
                            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                <span className="text-xs text-gray-400 font-medium">Total Cadastrados</span>
                                <span className="text-sm font-bold text-gray-700">{wauData?.totalUsers || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Reach Card */}
                    <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg border border-gray-100 group hover:shadow-xl transition-all duration-300">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <FiEye className="w-24 h-24 text-purple-600" />
                        </div>
                        <div className="p-6 relative z-10">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="p-3 bg-purple-500 rounded-xl text-white shadow-lg shadow-purple-500/30">
                                    <FiBarChart2 className="w-6 h-6" />
                                </div>
                                <h3 className="text-gray-600 font-semibold text-sm uppercase tracking-wider">Alcance Médio</h3>
                            </div>

                            <div className="flex items-baseline space-x-2">
                                <span className="text-4xl font-extrabold text-gray-900 tracking-tight">--</span>
                                <span className="text-sm text-gray-400">views únicas</span>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <p className="text-xs text-gray-500">
                                    Média de visualizações por comunicado oficial.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Noise Reduction Card */}
                    <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg border border-gray-100 group hover:shadow-xl transition-all duration-300">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <FiMessageSquare className="w-24 h-24 text-green-600" />
                        </div>
                        <div className="p-6 relative z-10">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="p-3 bg-green-500 rounded-xl text-white shadow-lg shadow-green-500/30">
                                    <FiHelpCircle className="w-6 h-6" />
                                </div>
                                <h3 className="text-gray-600 font-semibold text-sm uppercase tracking-wider">Redução de Ruído</h3>
                            </div>

                            <div className="flex flex-col justify-between h-full">
                                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                                    Monitore as dúvidas frequentes para identificar falhas na comunicação.
                                </p>
                                <button
                                    onClick={() => document.getElementById('faq-section')?.scrollIntoView({ behavior: 'smooth' })}
                                    className="self-start text-sm font-bold text-green-600 hover:text-green-700 hover:underline flex items-center"
                                >
                                    <FiPlus className="mr-1" /> Novo Relatório
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* FAQ Input Section */}
                    <div id="faq-section" className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Relatório de Dúvidas Semanais</h2>
                                <p className="text-sm text-gray-500 mt-1">Registre o feedback qualitativo dos departamentos.</p>
                            </div>
                            <div className="flex items-center bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
                                <span className="text-xs font-semibold text-gray-500 px-3 uppercase">Depto:</span>
                                <select
                                    className="border-none text-sm font-bold text-gray-800 focus:ring-0 cursor-pointer bg-transparent py-1 pl-0 pr-8"
                                    value={department}
                                    onChange={(e) => setDepartment(e.target.value)}
                                >
                                    <option value="RH">Recursos Humanos</option>
                                    <option value="LOGISTICA">Logística / Transporte</option>
                                    <option value="TI">TI / Suporte</option>
                                    <option value="ADMIN">Administrativo</option>
                                    <option value="COMERCIAL">Comercial</option>
                                </select>
                            </div>
                        </div>

                        <div className="p-8 space-y-8">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                    Volume Estimado (Tickets/E-mails)
                                </label>
                                <div className="flex items-center max-w-xs">
                                    <input
                                        type="number"
                                        min="0"
                                        className="block w-full text-2xl font-bold bg-transparent border-b-2 border-gray-200 focus:border-blue-500 focus:ring-0 px-0 py-2 transition-colors placeholder-gray-300"
                                        placeholder="0"
                                        value={volume}
                                        onChange={(e) => setVolume(parseInt(e.target.value) || 0)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                                    Principais Dúvidas da Semana
                                </label>
                                <div className="space-y-3">
                                    {doubts.map((doubt, index) => (
                                        <div key={index} className="group flex items-start space-x-3">
                                            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold border border-blue-100">
                                                {index + 1}
                                            </span>
                                            <input
                                                type="text"
                                                className="flex-1 bg-gray-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-0 rounded-lg text-sm px-4 py-3 transition-all font-medium text-gray-700 placeholder-gray-400"
                                                placeholder="Descreva a dúvida frequente..."
                                                value={doubt}
                                                onChange={(e) => handleDoubtChange(index, e.target.value)}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={handleAddDoubt}
                                    className="mt-4 flex items-center text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors px-2 py-1 rounded-md hover:bg-blue-50"
                                >
                                    <FiPlus className="w-4 h-4 mr-2" />
                                    Adicionar outra dúvida
                                </button>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
                            <button
                                onClick={handleSaveFaq}
                                disabled={savingFaq}
                                className={`px-8 py-3 rounded-xl font-bold shadow-lg transition-all transform hover:-translate-y-1 ${savingFaq ? 'bg-gray-400 cursor-not-allowed text-gray-200' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/30'}`}
                            >
                                {savingFaq ? 'Salvando...' : 'Salvar Relatório'}
                            </button>
                        </div>
                    </div>

                    {/* Sidebar Widget (e.g. History or Insights) */}
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-indigo-900 to-blue-900 rounded-2xl shadow-xl p-6 text-white overflow-hidden relative">
                            <div className="relative z-10">
                                <h3 className="text-xl font-bold mb-2">Dica Pro</h3>
                                <p className="text-blue-100 text-sm leading-relaxed mb-4">
                                    Reduza tickets criando notícias oficiais sobre os temas recorrentes desta semana.
                                </p>
                                <button
                                    onClick={() => window.location.href = '/admin/noticias'}
                                    className="text-xs font-bold bg-white text-blue-900 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors uppercase tracking-wide"
                                >
                                    Criar Notícia Relacionada
                                </button>
                            </div>
                            <div className="absolute -bottom-4 -right-4 bg-white/10 rounded-full w-32 h-32 blur-2xl"></div>
                        </div>

                        {/* Recent Activity Mini-List */}
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center">
                                <FiTrendingUp className="mr-2 text-green-500" /> Histórico Recente
                            </h3>
                            <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
                                {history.length === 0 ? (
                                    <div className="text-sm text-gray-500 text-center py-4 italic">
                                        Nenhum relatório salvo recentemente.
                                    </div>
                                ) : (
                                    history.map((report: any) => (
                                        <div key={report.id} className="p-3 bg-gray-50 rounded-lg text-sm border border-gray-100">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-semibold text-gray-800">{report.department}</span>
                                                <span className="text-xs text-gray-500">{new Date(report.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <div className="text-gray-600 text-xs mb-1">
                                                Vol: <strong>{report.volume_estimated}</strong> tickets
                                            </div>
                                            {report.top_doubts && report.top_doubts.length > 0 && (
                                                <p className="text-gray-500 text-xs truncate">
                                                    "{report.top_doubts[0]}"
                                                </p>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
