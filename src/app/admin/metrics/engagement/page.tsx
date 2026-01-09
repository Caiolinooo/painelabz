'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { fetchWithToken } from '@/lib/tokenStorage';
import { FiFilter, FiCalendar, FiClock, FiEye, FiHeart, FiSearch, FiDownload } from 'react-icons/fi';

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

export default function EngagementDashboard() {
    const { t } = useI18n();
    const [metrics, setMetrics] = useState<NewsMetric[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterTitle, setFilterTitle] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [dateRange, setDateRange] = useState('30'); // dias

    useEffect(() => {
        loadMetrics();
    }, [dateRange]);

    const loadMetrics = async () => {
        setLoading(true);
        try {
            // Endpoint novo que vamos criar
            const res = await fetchWithToken(`/api/metrics/news?days=${dateRange}`);
            if (res.ok) {
                const data = await res.json();
                setMetrics(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredMetrics = metrics.filter(m =>
        m.title.toLowerCase().includes(filterTitle.toLowerCase()) &&
        m.category.toLowerCase().includes(filterCategory.toLowerCase())
    );

    const formatTime = (seconds: number) => {
        if (!seconds) return '0s';
        if (seconds < 60) return `${Math.round(seconds)}s`;
        return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    };

    return (
        <div className="p-6 max-w-7xl mx-auto min-h-screen bg-gray-50">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Engajamento de Notícias (Real-Time)</h1>
                <div className="flex space-x-2">
                    <select
                        value={dateRange}
                        onChange={e => setDateRange(e.target.value)}
                        className="border-gray-300 rounded-md text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="7">Últimos 7 dias</option>
                        <option value="30">Últimos 30 dias</option>
                        <option value="90">Últimos 90 dias</option>
                    </select>
                    <button className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                        <FiDownload className="mr-2" /> Exportar CSV
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-center">
                <div className="flex items-center flex-1 min-w-[200px]">
                    <FiSearch className="text-gray-400 mr-2" />
                    <input
                        type="text"
                        placeholder="Filtrar por título..."
                        className="flex-1 border-none focus:ring-0 text-sm"
                        value={filterTitle}
                        onChange={e => setFilterTitle(e.target.value)}
                    />
                </div>
                <div className="w-px h-6 bg-gray-300 hidden md:block"></div>
                <div className="flex items-center w-full md:w-auto">
                    <span className="text-sm text-gray-500 mr-2">Categoria:</span>
                    <select
                        className="border-none py-0 pl-2 pr-8 text-sm font-medium focus:ring-0"
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

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Publicado em</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Views (Únicas)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <div className="flex items-center"><FiClock className="mr-1" /> Tempo Médio</div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Engajamento</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={5} className="text-center py-8">Carregando métricas...</td></tr>
                        ) : filteredMetrics.map((post) => (
                            <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-gray-900">{post.title}</div>
                                    <div className="text-xs text-gray-500">{post.category}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(post.published_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <span className="font-bold">{post.views_unique}</span> <span className="text-gray-400 text-xs">({post.views_total} total)</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${post.avg_time_seconds > 60 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {formatTime(post.avg_time_seconds)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <div className="flex space-x-4">
                                        <span className="flex items-center"><FiHeart className="mr-1 text-red-400" /> {post.likes}</span>
                                        {/* <span className="flex items-center"><FiMessageCircle className="mr-1 text-blue-400"/> {post.comments}</span> */}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
