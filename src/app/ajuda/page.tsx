'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import MainLayout from '@/components/Layout/MainLayout';
import {
    FiPhone,
    FiAlertTriangle,
    FiHelpCircle,
    FiMail,
    FiSearch,
    FiMapPin,
    FiFileText,
    FiDollarSign,
    FiAlertCircle,
    FiHeart,
    FiMonitor,
    FiMessageSquare,
    FiChevronRight,
    FiChevronDown,
    FiArrowRight
} from 'react-icons/fi';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { getHelpCategories, searchHelpArticles, HelpArticle } from '@/data/helpContent';

export default function AjudaPage() {
    const { user } = useSupabaseAuth();
    const { t, locale } = useI18n();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<HelpArticle[]>([]);
    const [expandedArticles, setExpandedArticles] = useState<Record<string, boolean>>({});

    const toggleArticle = (articleId: string) => {
        setExpandedArticles(prev => ({
            ...prev,
            [articleId]: !prev[articleId]
        }));
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (query.trim().length > 2) {
            setSearchResults(searchHelpArticles(query, locale));
        } else {
            setSearchResults([]);
        }
    };

    // Ícones para as categorias (mapeamento manual ou dinamico se o icon virar componente)
    const getIcon = (iconName: string) => {
        switch (iconName) {
            case 'FiLogIn': return <FiFileText className="w-6 h-6" />;
            case 'FiDollarSign': return <FiDollarSign className="w-6 h-6" />;
            case 'FiFileText': return <FiFileText className="w-6 h-6" />;
            case 'FiMonitor': return <FiMonitor className="w-6 h-6" />;
            case 'FiMessageSquare': return <FiMessageSquare className="w-6 h-6" />;
            default: return <FiHelpCircle className="w-6 h-6" />;
        }
    };

    return (
        <MainLayout>
            <div className="min-h-full pb-10">
                <div className="max-w-[1400px] mx-auto space-y-8">
                    {/* Header & Search - Styled like Dashboard TopGradientCard */}
                    <div className="relative w-full">
                        {/* Background Layer (Clipped) */}
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-800 rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('/images/pattern.png')]"></div>
                        </div>

                        {/* Content Layer (Visible overflow for dropdown) */}
                        <div className="relative z-10 p-8 md:p-12 text-center text-white">
                            <div className="max-w-3xl mx-auto space-y-6">
                                <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{t('ajuda.heroTitle', 'Como podemos ajudar?')}</h1>
                                <p className="text-blue-100 text-lg md:text-xl">
                                    {t('ajuda.heroSubtitle', 'Encontre guias, procedimentos e canais de atendimento.')}
                                </p>

                                <div className="relative max-w-2xl mx-auto mt-8">
                                    <div className="relative">
                                        <FiSearch className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
                                        <input
                                            type="text"
                                            placeholder={t('ajuda.searchPlaceholder', 'Buscar por artigos, termos ou dúvidas...')}
                                            className="w-full pl-14 pr-4 py-4 rounded-2xl text-gray-900 shadow-lg border-0 focus:ring-4 focus:ring-blue-500/30 outline-none transition-all placeholder:text-gray-400 text-lg"
                                            value={searchQuery}
                                            onChange={handleSearch}
                                        />
                                    </div>
                                    {/* Search Results Dropdown */}
                                    {searchQuery.trim().length > 2 && (
                                        <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 text-left max-h-96 overflow-y-auto">
                                            {searchResults.length > 0 ? (
                                                searchResults.map(result => (
                                                    <button
                                                        key={result.id}
                                                        className="w-full px-6 py-4 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors flex items-center justify-between group"
                                                    // TODO: Add click action
                                                    >
                                                        <div>
                                                            <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{result.title}</h4>
                                                            <p className="text-sm text-gray-500 line-clamp-1">{result.content.replace(/##|###|\*\*/g, '').substring(0, 100)}...</p>
                                                        </div>
                                                        <FiArrowRight className="text-gray-300 group-hover:text-blue-600" />
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="p-8 text-center text-gray-500">
                                                    {t('ajuda.noResults', 'Nenhum resultado encontrado para "{query}"').replace('{query}', searchQuery)}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Unified Contacts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Departamentos Column */}
                        <div className="lg:col-span-8 space-y-6">
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                                <FiPhone className="mr-3 text-blue-600" /> {t('ajuda.channelsTitle', 'Canais de Atendimento & Ramais')}
                            </h2>
                            <div className="bg-white rounded-[1.5rem] border border-gray-100 shadow-sm overflow-hidden">
                                <div className="divide-y divide-gray-100">
                                    {/* Logística */}
                                    <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div className="mb-4 md:mb-0">
                                            <h3 className="font-bold text-gray-900 text-lg">{t('ajuda.logistics', 'Logística')}</h3>
                                            <p className="text-sm text-gray-500">{t('ajuda.logisticsDesc', 'Programação de escala, embarque, dobras, faltas e folga indenizada')}</p>
                                        </div>
                                        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8">
                                            <a href="https://wa.me/5522992074646" target="_blank" rel="noopener noreferrer" className="flex items-center text-green-600 font-medium hover:text-green-700 bg-green-50 px-4 py-2 rounded-full">
                                                <FiPhone className="mr-2" /> (22) 99207-4646
                                            </a>
                                            <a href="mailto:logistica@groupabz.com" className="flex items-center text-gray-600 hover:text-blue-600">
                                                <FiMail className="mr-2" /> logistica@groupabz.com
                                            </a>
                                        </div>
                                    </div>

                                    {/* DP - Folha */}
                                    <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div className="mb-4 md:mb-0">
                                            <h3 className="font-bold text-gray-900 text-lg">{t('ajuda.hr', 'Departamento Pessoal')}</h3>
                                            <p className="text-sm text-gray-500">{t('ajuda.hrPayroll', 'Dúvidas sobre Folha de Pagamento')}</p>
                                        </div>
                                        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8">
                                            <div className="flex flex-col gap-2">
                                                <a href="https://wa.me/5522997782348" target="_blank" rel="noopener noreferrer" className="flex items-center text-green-600 font-medium hover:text-green-700 bg-green-50 px-4 py-2 rounded-full text-sm">
                                                    <FiPhone className="mr-2" /> (22) 99778-2348
                                                </a>
                                                <a href="https://wa.me/5522999124131" target="_blank" rel="noopener noreferrer" className="flex items-center text-green-600 font-medium hover:text-green-700 bg-green-50 px-4 py-2 rounded-full text-sm">
                                                    <FiPhone className="mr-2" /> (22) 99912-4131
                                                </a>
                                            </div>
                                            <a href="mailto:rh@groupabz.com" className="flex items-center text-gray-600 hover:text-blue-600">
                                                <FiMail className="mr-2" /> rh@groupabz.com
                                            </a>
                                        </div>
                                    </div>

                                    {/* DP - Ponto */}
                                    <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div className="mb-4 md:mb-0">
                                            <h3 className="font-bold text-gray-900 text-lg">{t('ajuda.hr', 'Departamento Pessoal')}</h3>
                                            <p className="text-sm text-gray-500">{t('ajuda.hrTimekeeping', 'Registro de Folha de Ponto')}</p>
                                        </div>
                                        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8">
                                            <a href="https://wa.me/5522992387332" target="_blank" rel="noopener noreferrer" className="flex items-center text-green-600 font-medium hover:text-green-700 bg-green-50 px-4 py-2 rounded-full">
                                                <FiPhone className="mr-2" /> (22) 99238-7332
                                            </a>
                                            <a href="mailto:rh@groupabz.com" className="flex items-center text-gray-600 hover:text-blue-600">
                                                <FiMail className="mr-2" /> rh@groupabz.com
                                            </a>
                                        </div>
                                    </div>

                                    {/* DP - Benefícios */}
                                    <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div className="mb-4 md:mb-0">
                                            <h3 className="font-bold text-gray-900 text-lg">{t('ajuda.hr', 'Departamento Pessoal')}</h3>
                                            <p className="text-sm text-gray-500">{t('ajuda.hrBenefits', 'Benefícios (Plano de saúde, VA, VR, entre outros)')}</p>
                                        </div>
                                        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8">
                                            <a href="https://wa.me/5522992081661" target="_blank" rel="noopener noreferrer" className="flex items-center text-green-600 font-medium hover:text-green-700 bg-green-50 px-4 py-2 rounded-full">
                                                <FiPhone className="mr-2" /> (22) 99208-1661
                                            </a>
                                            <a href="mailto:rh@groupabz.com" className="flex items-center text-gray-600 hover:text-blue-600">
                                                <FiMail className="mr-2" /> rh@groupabz.com
                                            </a>
                                        </div>
                                    </div>

                                    {/* QHSE */}
                                    <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div className="mb-4 md:mb-0">
                                            <h3 className="font-bold text-gray-900 text-lg">{t('ajuda.qhse', 'QHSE (SGI)')}</h3>
                                            <p className="text-sm text-gray-500">{t('ajuda.qhseDesc', 'EPI, registro de acidentes ou doenças ocupacionais')}</p>
                                        </div>
                                        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8">
                                            <a href="https://wa.me/5522999494705" target="_blank" rel="noopener noreferrer" className="flex items-center text-green-600 font-medium hover:text-green-700 bg-green-50 px-4 py-2 rounded-full">
                                                <FiPhone className="mr-2" /> (22) 99949-4705
                                            </a>
                                            <a href="mailto:sgi@groupabz.com" className="flex items-center text-gray-600 hover:text-blue-600">
                                                <FiMail className="mr-2" /> sgi@groupabz.com
                                            </a>
                                        </div>
                                    </div>

                                    {/* Ouvidoria */}
                                    <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div className="mb-4 md:mb-0">
                                            <h3 className="font-bold text-gray-900 text-lg">{t('ajuda.ombudsman', 'Ouvidoria')}</h3>
                                            <p className="text-sm text-gray-500">{t('ajuda.ombudsmanDesc', 'Denúncias, queixas, elogios ou sugestões')}</p>
                                        </div>
                                        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8">
                                            <a href="mailto:ouvidoria@groupabz.com" className="flex items-center text-gray-600 hover:text-blue-600">
                                                <FiMail className="mr-2" /> ouvidoria@groupabz.com
                                            </a>
                                        </div>
                                    </div>

                                    {/* Suporte Técnico */}
                                    <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div className="mb-4 md:mb-0">
                                            <h3 className="font-bold text-gray-900 text-lg">{t('ajuda.techSupport', 'Suporte Técnico')}</h3>
                                            <p className="text-sm text-gray-500">{t('ajuda.techSupportDesc', 'Problemas com o sistema')}</p>
                                        </div>
                                        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8">
                                            <a href="mailto:suporte@grupoabz.com" className="flex items-center text-gray-600 hover:text-blue-600">
                                                <FiMail className="mr-2" /> suporte@grupoabz.com
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Emergency Column */}
                        <div className="lg:col-span-4 space-y-6">
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                                <FiAlertTriangle className="mr-3 text-red-600" /> {t('ajuda.emergencyTitle', 'Emergência Pública')}
                            </h2>
                            <div className="space-y-4">
                                <div className="bg-red-50 rounded-[1.5rem] border border-red-100 p-6 flex items-center justify-between hover:bg-red-100 transition-colors">
                                    <div className="flex items-center">
                                        <div className="bg-red-100 p-3 rounded-xl mr-4">
                                            <FiPhone className="w-6 h-6 text-red-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-lg">{t('ajuda.fireDept', 'Bombeiros')}</h3>
                                            <p className="text-xl font-black text-red-600">193</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-red-50 rounded-[1.5rem] border border-red-100 p-6 flex items-center justify-between hover:bg-red-100 transition-colors">
                                    <div className="flex items-center">
                                        <div className="bg-gray-100 p-3 rounded-xl mr-4">
                                            <FiAlertCircle className="w-6 h-6 text-gray-700" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-lg">{t('ajuda.police', 'Polícia')}</h3>
                                            <p className="text-xl font-black text-gray-900">190</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-red-50 rounded-[1.5rem] border border-red-100 p-6 flex items-center justify-between hover:bg-red-100 transition-colors">
                                    <div className="flex items-center">
                                        <div className="bg-blue-100 p-3 rounded-xl mr-4">
                                            <FiHeart className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-lg">{t('ajuda.samu', 'SAMU')}</h3>
                                            <p className="text-xl font-black text-blue-600">192</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Knowledge Base Categories */}
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-gray-900">{t('ajuda.knowledgeBaseTitle', 'Base de Conhecimento')}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {getHelpCategories(locale).map((category) => (
                                <div key={category.id} className="bg-white rounded-[1.5rem] border border-gray-100 p-8 hover:shadow-lg transition-all duration-300 group h-fit">
                                    <div className="flex items-center space-x-4 mb-6">
                                        <span className="text-blue-600 bg-blue-50 p-3 rounded-xl group-hover:bg-blue-100 transition-colors">
                                            {getIcon(category.icon)}
                                        </span>
                                        <h3 className="font-bold text-gray-900 text-xl">{category.name}</h3>
                                    </div>
                                    <p className="text-sm text-gray-500 mb-8 min-h-[40px] leading-relaxed">{category.description}</p>

                                    <div className="space-y-4">
                                        {category.articles.slice(0, 5).map(article => (
                                            <div key={article.id} className="border-b border-gray-50 last:border-0 pb-3 last:pb-0">
                                                <button
                                                    onClick={() => toggleArticle(article.id)}
                                                    className="w-full text-left text-sm text-gray-600 hover:text-blue-600 flex items-start group/item transition-colors"
                                                >
                                                    <span className="mt-0.5 mr-2 text-gray-300 group-hover/item:text-blue-600 transition-colors">
                                                        {expandedArticles[article.id] ? <FiChevronDown /> : <FiChevronRight />}
                                                    </span>
                                                    <span className={`font-medium ${expandedArticles[article.id] ? 'text-blue-600' : ''}`}>{article.title}</span>
                                                </button>

                                                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedArticles[article.id] ? 'max-h-[2000px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
                                                    <div className="text-xs text-gray-500 pl-6 leading-relaxed bg-gray-50 p-3 rounded-lg prose prose-sm max-w-none prose-p:text-gray-600 prose-headings:text-gray-800">
                                                        {article.content ? (
                                                            <ReactMarkdown>
                                                                {article.content}
                                                            </ReactMarkdown>
                                                        ) : (
                                                            t('ajuda.inDevelopment', 'Conteúdo em desenvolvimento. Entre em contato com o suporte para mais detalhes.')
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Location / Map Section */}
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                            <FiMapPin className="mr-3 text-red-500" /> {t('ajuda.locationTitle', 'Nossa Localização')}
                        </h2>

                        <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row min-h-[400px]">
                            {/* Info */}
                            <div className="p-10 md:w-1/3 bg-gray-50 flex flex-col justify-center space-y-8">
                                <div>
                                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full mb-3 uppercase tracking-wider">{t('ajuda.headquarters', 'Sede')}</span>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-1">{t('ajuda.hqTitle', 'Escritório Central')}</h3>
                                    <p className="text-blue-600 font-medium text-lg">Macaé, RJ</p>
                                </div>

                                <div className="space-y-5">
                                    <div className="flex items-start space-x-3 text-gray-600">
                                        <FiMapPin className="mt-1 flex-shrink-0 text-blue-500" />
                                        <span>
                                            <p className="text-gray-600">
                                                <strong className="text-gray-900">{t('ajuda.hq', 'Sede ABZ')}</strong><br />
                                                Av. Nsa. Sra. da Glória, 2987<br />
                                                {t('ajuda.building', 'Edifício The Corporate')}<br />
                                                Cavaleiros, Macaé - RJ<br />
                                                CEP: 27920-360
                                            </p>
                                        </span>
                                    </div>

                                    <div className="flex items-start space-x-3 text-gray-600">
                                        <FiMonitor className="mt-1 flex-shrink-0 text-blue-500" />
                                        <span>Segunda a Sexta<br />8h às 18h</span>
                                    </div>
                                </div>

                                <a
                                    href="https://www.google.com/maps/search/Av.+Prefeito+Aristeu+Ferreira+da+Silva,+370+-+Granja+dos+Cavaleiros,+Macaé+-+RJ,+27930-070"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 hover:transform hover:-translate-y-1"
                                >
                                    <FiMapPin className="mr-2" /> {t('ajuda.openInMaps', 'Abrir no Google Maps')}
                                </a>
                            </div>

                            {/* Map Frame */}
                            <div className="md:w-2/3 h-64 md:h-auto border-t md:border-t-0 md:border-l border-gray-100 relative">
                                <iframe
                                    src="https://www.google.com/maps?q=Av.+Prefeito+Aristeu+Ferreira+da+Silva,+370+-+Granja+dos+Cavaleiros,+Macaé+-+RJ,+27930-070&output=embed"
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0 }}
                                    allowFullScreen
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    className="absolute inset-0"
                                ></iframe>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
