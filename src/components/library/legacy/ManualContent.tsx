'use client';

import React, { useEffect, useState } from 'react';
import { FiBookOpen, FiDownload, FiEye } from 'react-icons/fi';
import LazyDocumentViewer from '@/components/LazyLoad/LazyDocumentViewer';
import { useI18n } from '@/contexts/I18nContext';

interface Document {
    id: string;
    title: string;
    description: string;
    category: string;
    language: string;
    file: string;
    enabled: boolean;
    order: number;
}

export default function ManualContent() {
    const [docs, setDocs] = useState<Document[]>([]);
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
    const [loading, setLoading] = useState(true);
    const { t } = useI18n();

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const res = await fetch('/api/documents?category=' + encodeURIComponent('Manual'));
                if (res.ok) {
                    const data = await res.json();
                    const filteredDocs = (data || [])
                        .filter((d: Document) => d.enabled !== false)
                        .sort((a: Document, b: Document) => (a.order || 0) - (b.order || 0));
                    setDocs(filteredDocs);
                }
            } catch (e) {
                console.warn('Falha ao carregar documentos do Manual:', e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const openViewer = (doc: Document) => setSelectedDoc(doc);
    const closeViewer = () => setSelectedDoc(null);

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-abz-text-black mb-6">
                {t('manual.mainDocument', 'Documentos do Manual')}
            </h2>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-abz-blue"></div>
                    <span className="ml-3 text-gray-500">{t('common.loading', 'Carregando...')}</span>
                </div>
            ) : docs.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center text-gray-500 py-12 px-6 border-2 border-dashed border-gray-300 rounded-lg">
                    <FiBookOpen className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-xl font-semibold text-abz-text-black mb-2">
                        {t('manual.noDocuments', 'Nenhum documento disponível')}
                    </h3>
                    <p className="text-sm">
                        {t('manual.noDocumentsDescription', 'Os documentos do manual do colaborador serão disponibilizados em breve.')}
                    </p>
                    <p className="text-xs text-gray-400 mt-4">
                        {t('manual.adminNote', 'Administradores podem adicionar documentos em Admin > Documentos')}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {docs.map((doc) => (
                        <div
                            key={doc.id}
                            className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start mb-3">
                                <div className="bg-abz-light-blue p-3 rounded-full mr-3">
                                    <FiBookOpen className="text-abz-blue w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-abz-text-black">{doc.title}</h3>
                                    {doc.language && (
                                        <p className="text-sm text-gray-500">{doc.language}</p>
                                    )}
                                </div>
                            </div>

                            <p className="text-sm text-abz-text-dark mb-4">
                                {doc.description}
                            </p>

                            <div className="flex items-center gap-2 mt-4">
                                <button
                                    onClick={() => openViewer(doc)}
                                    className="inline-flex items-center px-4 py-2 bg-abz-blue text-white rounded-md hover:bg-abz-blue-dark transition-colors text-sm font-medium shadow-sm"
                                >
                                    <FiEye className="mr-1.5" />
                                    {t('manual.view', 'Visualizar')}
                                </button>
                                <a
                                    href={doc.file}
                                    download
                                    className="inline-flex items-center px-4 py-2 bg-gray-100 text-abz-text-dark rounded-md hover:bg-gray-200 transition-colors text-sm font-medium shadow-sm"
                                >
                                    <FiDownload className="mr-1.5" />
                                    {t('manual.download', 'Download')}
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selectedDoc && (
                <LazyDocumentViewer
                    title={selectedDoc.title}
                    filePath={selectedDoc.file}
                    onClose={closeViewer}
                    accentColor="text-abz-blue"
                />
            )}
        </div>
    );
}
