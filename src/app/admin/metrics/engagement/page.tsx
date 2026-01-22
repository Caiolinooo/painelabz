'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { fetchWithToken } from '@/lib/tokenStorage';
import {
    FiClock, FiEye, FiHeart, FiSearch, FiDownload, FiTrendingUp,
    FiUsers, FiGrid, FiFileText, FiBarChart2, FiActivity,
    FiMessageSquare, FiCalendar
} from 'react-icons/fi';

interface NewsMetric {
    id: string;
    title: string;
    category: string;
    published_at: string;
    views_total: number;
    views_unique: number;
    avg_time_seconds: number;
    likes: number;
    comments: number;
}

interface ModuleMetric {
    module_id: string;
    module_name: string;
    total_accesses: number;
    unique_users: number;
    avg_duration: number;
    last_accessed: string;
    top_users: Array<{
        user_id: string;
        name?: string;
        email?: string;
        avatar?: string;
        access_count: number;
        total_duration: number;
    }>;
}

interface ModuleData {
    modules: ModuleMetric[];
    summary: {
        total_accesses: number;
        unique_users: number;
        unique_modules: number;
    };
    patterns: {
        hourly: Record<number, number>;
        daily: Record<number, number>;
    };
}

export default function EngagementDashboard() {
    const { t } = useI18n();
    const [activeTab, setActiveTab] = useState<'news' | 'modules'>('news');

    // News state
    const [newsMetrics, setNewsMetrics] = useState<NewsMetric[]>([]);
    const [newsLoading, setNewsLoading] = useState(true);
    const [filterTitle, setFilterTitle] = useState('');
    const [filterCategory, setFilterCategory] = useState('');

    // Modules state
    const [moduleData, setModuleData] = useState<ModuleData | null>(null);
    const [modulesLoading, setModulesLoading] = useState(true);
    const [expandedModule, setExpandedModule] = useState<string | null>(null);

    // Shared
    const [dateRange, setDateRange] = useState('30');

    useEffect(() => {
        if (activeTab === 'news') {
            loadNewsMetrics();
        } else {
            loadModuleMetrics();
        }
    }, [dateRange, activeTab]);

    const loadNewsMetrics = async () => {
        setNewsLoading(true);
        try {
            const res = await fetchWithToken(`/api/metrics/news?days=${dateRange}`);
            if (res.ok) {
                const data = await res.json();
                setNewsMetrics(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setNewsLoading(false);
        }
    };

    const loadModuleMetrics = async () => {
        setModulesLoading(true);
        try {
            const res = await fetchWithToken(`/api/metrics/modules?days=${dateRange}`);
            if (res.ok) {
                const data = await res.json();
                setModuleData(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setModulesLoading(false);
        }
    };

    const filteredNewsMetrics = newsMetrics.filter(m =>
        m.title.toLowerCase().includes(filterTitle.toLowerCase()) &&
        m.category.toLowerCase().includes(filterCategory.toLowerCase())
    );

    const formatTime = (seconds: number) => {
        if (!seconds) return '0s';
        if (seconds < 60) return `${Math.round(seconds)}s`;
        return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    };

    const exportToCSV = () => {
        const data = activeTab === 'news' ? filteredNewsMetrics : moduleData?.modules || [];
        const headers = activeTab === 'news'
            ? ['Título', 'Categoria', 'Publicado', 'Views Únicas', 'Views Total', 'Tempo Médio', 'Likes']
            : ['Módulo', 'Acessos', 'Usuários Únicos', 'Duração Média', 'Último Acesso'];

        const rows = activeTab === 'news'
            ? filteredNewsMetrics.map(m => [m.title, m.category, m.published_at, m.views_unique, m.views_total, m.avg_time_seconds, m.likes])
            : (moduleData?.modules || []).map(m => [m.module_name, m.total_accesses, m.unique_users, m.avg_duration, m.last_accessed]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `engajamento-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    // Summary calculations for news
    const newsSummary = {
        totalViews: newsMetrics.reduce((sum, m) => sum + m.views_total, 0),
        uniqueViews: newsMetrics.reduce((sum, m) => sum + m.views_unique, 0),
        avgTime: newsMetrics.length > 0 ? newsMetrics.reduce((sum, m) => sum + m.avg_time_seconds, 0) / newsMetrics.length : 0,
        totalLikes: newsMetrics.reduce((sum, m) => sum + m.likes, 0),
        topPost: newsMetrics.length > 0 ? newsMetrics.reduce((max, m) => m.views_unique > max.views_unique ? m : max, newsMetrics[0]) : null
    };

    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    // Viewers Modal State
    const [showViewersModal, setShowViewersModal] = useState(false);
    const [viewers, setViewers] = useState<any[]>([]);
    const [viewersLoading, setViewersLoading] = useState(false);
    const [selectedPostTitle, setSelectedPostTitle] = useState('');

    const fetchViewers = async (postId: string, title: string) => {
        try {
            setViewersLoading(true);
            setSelectedPostTitle(title);
            setShowViewersModal(true);

            const res = await fetchWithToken(`/api/news/posts/${postId}/viewers`);
            if (res.ok) {
                const data = await res.json();
                setViewers(data.viewers || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setViewersLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
            {/* ... Header and Tabs ... */}

            {/* Viewers Modal */}
            {showViewersModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col mx-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Visualizadores</h3>
                                <p className="text-xs text-gray-500 line-clamp-1 max-w-xs">{selectedPostTitle}</p>
                            </div>
                            <button
                                onClick={() => setShowViewersModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 p-4 custom-scrollbar">
                            {viewersLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                                    <span>Carregando lista...</span>
                                </div>
                            ) : viewers.length === 0 ? (
                                <div className="text-center py-12 text-gray-500 flex flex-col items-center">
                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                        <FiUsers className="w-6 h-6 text-gray-400" />
                                    </div>
                                    <p>Nenhum visualizador registrado ainda</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {viewers.map((viewer, idx) => (
                                        <div key={idx} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-100 transition-all group">
                                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-white shadow-sm">
                                                {viewer.user?.avatar ? (
                                                    <img src={viewer.user.avatar} className="w-full h-full object-cover" alt="" />
                                                ) : (
                                                    <span className="text-sm font-bold text-gray-500">
                                                        {(viewer.user?.first_name || 'A')[0]}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-gray-900 truncate">
                                                    {viewer.user
                                                        ? `${viewer.user.first_name} ${viewer.user.last_name}`.trim() || 'Usuário sem nome'
                                                        : viewer.user_id
                                                            ? 'Usuário não identificado'
                                                            : 'Anônimo'}
                                                </div>
                                                <div className="text-xs text-gray-500 truncate">
                                                    {viewer.user
                                                        ? viewer.user.email
                                                        : viewer.user_id
                                                            ? `ID: ${viewer.user_id}`
                                                            : 'Usuário não logado'}
                                                </div>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <div className="text-xs font-medium text-gray-900">
                                                    {new Date(viewer.viewed_at).toLocaleDateString()}
                                                </div>
                                                <div className="text-[10px] text-gray-400">
                                                    {new Date(viewer.viewed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-3 border-t border-gray-100 bg-gray-50/50 text-xs text-center text-gray-400">
                            Mostrando {viewers.length} visualizações
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard de Engajamento</h1>
                    <p className="text-gray-500 mt-1">Análise detalhada de interações e uso do portal</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <select
                        value={dateRange}
                        onChange={e => setDateRange(e.target.value)}
                        className="border border-gray-300 rounded-lg px-4 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                        <option value="7">Últimos 7 dias</option>
                        <option value="30">Últimos 30 dias</option>
                        <option value="90">Últimos 90 dias</option>
                    </select>
                    <button
                        onClick={exportToCSV}
                        className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
                    >
                        <FiDownload className="mr-2" /> Exportar CSV
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 mb-6 inline-flex gap-1">
                <button
                    onClick={() => setActiveTab('news')}
                    className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${activeTab === 'news'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    <FiFileText className="w-4 h-4" />
                    Notícias
                </button>
                <button
                    onClick={() => setActiveTab('modules')}
                    className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${activeTab === 'modules'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    <FiGrid className="w-4 h-4" />
                    Módulos
                </button>
            </div>

            {/* News Tab Content */}
            {activeTab === 'news' && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Views Totais</p>
                                    <p className="text-3xl font-bold text-gray-900">{newsSummary.totalViews.toLocaleString()}</p>
                                </div>
                                <div className="p-3 bg-blue-100 rounded-full">
                                    <FiEye className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">{newsSummary.uniqueViews.toLocaleString()} únicas</p>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Tempo Médio</p>
                                    <p className="text-3xl font-bold text-gray-900">{formatTime(newsSummary.avgTime)}</p>
                                </div>
                                <div className="p-3 bg-green-100 rounded-full">
                                    <FiClock className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">por sessão</p>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Total Likes</p>
                                    <p className="text-3xl font-bold text-gray-900">{newsSummary.totalLikes.toLocaleString()}</p>
                                </div>
                                <div className="p-3 bg-red-100 rounded-full">
                                    <FiHeart className="w-6 h-6 text-red-600" />
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">engajamento positivo</p>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Top Post</p>
                                    <p className="text-lg font-bold text-gray-900 line-clamp-1">{newsSummary.topPost?.title || '-'}</p>
                                </div>
                                <div className="p-3 bg-yellow-100 rounded-full">
                                    <FiTrendingUp className="w-6 h-6 text-yellow-600" />
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">{newsSummary.topPost?.views_unique || 0} views únicas</p>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-center">
                        <div className="flex items-center flex-1 min-w-[200px]">
                            <FiSearch className="text-gray-400 mr-2" />
                            <input
                                type="text"
                                placeholder="Filtrar por título..."
                                className="flex-1 border-none focus:ring-0 text-sm bg-transparent"
                                value={filterTitle}
                                onChange={e => setFilterTitle(e.target.value)}
                            />
                        </div>
                        <div className="w-px h-6 bg-gray-300 hidden md:block"></div>
                        <div className="flex items-center">
                            <span className="text-sm text-gray-500 mr-2">Categoria:</span>
                            <select
                                className="border-none py-0 pl-2 pr-8 text-sm font-medium focus:ring-0 bg-transparent"
                                value={filterCategory}
                                onChange={e => setFilterCategory(e.target.value)}
                            >
                                <option value="">Todas</option>
                                <option value="RH">RH</option>
                                <option value="TI">TI</option>
                                <option value="Institucional">Institucional</option>
                            </select>
                        </div>
                    </div>

                    {/* News Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Título</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Publicado</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Views (Únicas)</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        <div className="flex items-center"><FiClock className="mr-1" /> Tempo Médio</div>
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Engajamento</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {newsLoading ? (
                                    <tr><td colSpan={5} className="text-center py-12 text-gray-500">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                            Carregando métricas...
                                        </div>
                                    </td></tr>
                                ) : filteredNewsMetrics.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center py-12 text-gray-500">Nenhum resultado encontrado</td></tr>
                                ) : filteredNewsMetrics.map((post) => (
                                    <tr key={post.id} className="hover:bg-blue-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">{post.title}</div>
                                            <div className="text-xs text-gray-500 mt-0.5">{post.category}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(post.published_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap cursor-pointer group" onClick={() => fetchViewers(post.id, post.title)}>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{post.views_unique}</span>
                                                <span className="text-gray-400 text-xs">({post.views_total} total)</span>
                                                <FiEye className="w-4 h-4 text-gray-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all" />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${post.avg_time_seconds > 60
                                                ? 'bg-green-100 text-green-800'
                                                : post.avg_time_seconds > 30
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                {formatTime(post.avg_time_seconds)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-4">
                                                <span className="flex items-center text-sm">
                                                    <FiHeart className="mr-1 text-red-400" /> {post.likes}
                                                </span>
                                                <span className="flex items-center text-sm text-gray-400">
                                                    <FiMessageSquare className="mr-1" /> {post.comments}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* Modules Tab Content */}
            {activeTab === 'modules' && (
                <>
                    {/* Module Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Total de Acessos</p>
                                    <p className="text-3xl font-bold text-gray-900">
                                        {moduleData?.summary.total_accesses.toLocaleString() || 0}
                                    </p>
                                </div>
                                <div className="p-3 bg-purple-100 rounded-full">
                                    <FiActivity className="w-6 h-6 text-purple-600" />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Usuários Únicos</p>
                                    <p className="text-3xl font-bold text-gray-900">
                                        {moduleData?.summary.unique_users || 0}
                                    </p>
                                </div>
                                <div className="p-3 bg-blue-100 rounded-full">
                                    <FiUsers className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Módulos Ativos</p>
                                    <p className="text-3xl font-bold text-gray-900">
                                        {moduleData?.summary.unique_modules || 0}
                                    </p>
                                </div>
                                <div className="p-3 bg-green-100 rounded-full">
                                    <FiGrid className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Access Patterns */}
                    {moduleData?.patterns && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            {/* Hourly Pattern */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <FiClock className="text-blue-600" /> Padrão por Horário
                                </h3>
                                <div className="flex items-end gap-1 h-32">
                                    {Array.from({ length: 24 }, (_, hour) => {
                                        const count = moduleData.patterns.hourly[hour] || 0;
                                        const maxCount = Math.max(...Object.values(moduleData.patterns.hourly), 1);
                                        const height = (count / maxCount) * 100;
                                        return (
                                            <div
                                                key={hour}
                                                className="flex-1 bg-blue-500/80 hover:bg-blue-600 rounded-t transition-colors cursor-pointer group relative"
                                                style={{ height: `${Math.max(height, 2)}%` }}
                                                title={`${hour}h: ${count} acessos`}
                                            >
                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                    {hour}h: {count}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex justify-between text-xs text-gray-400 mt-2">
                                    <span>0h</span>
                                    <span>6h</span>
                                    <span>12h</span>
                                    <span>18h</span>
                                    <span>23h</span>
                                </div>
                            </div>

                            {/* Daily Pattern */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <FiCalendar className="text-purple-600" /> Padrão por Dia
                                </h3>
                                <div className="flex items-end gap-2 h-32">
                                    {dayNames.map((name, day) => {
                                        const count = moduleData.patterns.daily[day] || 0;
                                        const maxCount = Math.max(...Object.values(moduleData.patterns.daily), 1);
                                        const height = (count / maxCount) * 100;
                                        return (
                                            <div key={day} className="flex-1 flex flex-col items-center">
                                                <div
                                                    className="w-full bg-purple-500/80 hover:bg-purple-600 rounded-t transition-colors cursor-pointer"
                                                    style={{ height: `${Math.max(height, 4)}%` }}
                                                    title={`${name}: ${count} acessos`}
                                                />
                                                <span className="text-xs text-gray-500 mt-2">{name}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Module Ranking Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900">Ranking de Módulos</h3>
                            <span className="text-sm text-gray-500">Ordenado por acessos</span>
                        </div>
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">#</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Módulo</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Acessos</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tempo Médio</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Usuários</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Top Usuários</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {modulesLoading ? (
                                    <tr><td colSpan={6} className="text-center py-12 text-gray-500">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                                            Carregando módulos...
                                        </div>
                                    </td></tr>
                                ) : !moduleData?.modules?.length ? (
                                    <tr><td colSpan={6} className="text-center py-12 text-gray-500">
                                        <FiGrid className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                        <p>Nenhum acesso registrado ainda</p>
                                        <p className="text-xs mt-1">Os acessos aparecerão aqui após usuários clicarem nos cards</p>
                                    </td></tr>
                                ) : moduleData.modules.map((mod, index) => (
                                    <React.Fragment key={mod.module_id}>
                                        <tr
                                            className="hover:bg-purple-50/50 transition-colors cursor-pointer"
                                            onClick={() => setExpandedModule(expandedModule === mod.module_id ? null : mod.module_id)}
                                        >
                                            <td className="px-6 py-4">
                                                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                    index === 1 ? 'bg-gray-200 text-gray-600' :
                                                        index === 2 ? 'bg-orange-100 text-orange-700' :
                                                            'bg-gray-100 text-gray-500'
                                                    }`}>
                                                    {index + 1}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900 flex items-center gap-2">
                                                    {mod.module_name}
                                                    <span className={`text-xs transform transition-transform ${expandedModule === mod.module_id ? 'rotate-180' : ''}`}>▼</span>
                                                </div>
                                                <div className="text-xs text-gray-400">ID: {mod.module_id}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-lg font-bold text-purple-600">{mod.total_accesses}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {mod.avg_duration > 60 ? (
                                                    <span className="text-sm font-medium text-blue-600">{Math.round(mod.avg_duration / 60)}min</span>
                                                ) : (
                                                    <span className="text-sm font-medium text-blue-600">{Math.round(mod.avg_duration || 0)}s</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-medium text-gray-700">{mod.unique_users}</span>
                                                <span className="text-xs text-gray-400 ml-1">únicos</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex -space-x-2">
                                                    {mod.top_users.slice(0, 4).map((user) => (
                                                        <div
                                                            key={user.user_id}
                                                            className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center overflow-hidden"
                                                            title={user.name || user.email || user.user_id}
                                                        >
                                                            {user.avatar ? (
                                                                <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span className="text-xs font-medium text-gray-600">
                                                                    {(user.name || 'U')[0]}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {mod.top_users.length > 4 && (
                                                        <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center">
                                                            <span className="text-xs text-gray-500">+{mod.top_users.length - 4}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedModule === mod.module_id && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-4 bg-purple-50/30">
                                                    <div className="text-sm font-medium text-gray-700 mb-3">👥 Usuários que acessaram este módulo:</div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                        {mod.top_users.length > 0 ? mod.top_users.map((user) => (
                                                            <div key={user.user_id} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                                    {user.avatar ? (
                                                                        <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <span className="text-sm font-bold text-white">
                                                                            {(user.name || 'U')[0]}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="font-medium text-gray-900 truncate">{user.name || 'Usuário'}</div>
                                                                    <div className="text-xs text-gray-500 truncate">{user.email || user.user_id}</div>
                                                                </div>
                                                                <div className="text-right flex-shrink-0">
                                                                    <div className="text-lg font-bold text-purple-600">
                                                                        {user.total_duration > 60
                                                                            ? `${Math.round(user.total_duration / 60)}min`
                                                                            : `${Math.round(user.total_duration)}s`}
                                                                    </div>
                                                                    <div className="text-xs text-gray-400">{user.access_count} acessos</div>
                                                                </div>
                                                            </div>
                                                        )) : (
                                                            <div className="col-span-full text-center py-4 text-gray-400">
                                                                Sem dados de usuário identificado
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
