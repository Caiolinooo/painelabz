'use client';

import React, { useState } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import { FiRss, FiDownload, FiEye, FiFileText } from 'react-icons/fi';
import { useI18n } from '@/contexts/I18nContext';
import LazyDocumentViewer from '@/components/LazyLoad/LazyDocumentViewer';
import { measure } from '@/lib/performance';

// Exemplo de notícias - serão traduzidas dinamicamente
const getNewsItems = (t: (key: string, defaultValue?: string) => string) => [
  {
    id: 'news-example-1',
    title: t('news.examples.title1', 'Exemplo de Notícia 1'),
    description: t('news.examples.description1', 'Breve descrição do conteúdo desta notícia ou cartilha.'),
    date: '2024-04-01',
    file: '/documentos/noticias/exemplo-noticia-1.pdf'
  },
  {
    id: 'news-example-2',
    title: t('news.examples.title2', 'Exemplo de Notícia 2'),
    description: t('news.examples.description2', 'Outro exemplo de um comunicado importante em formato PDF.'),
    date: '2024-03-25',
    file: '/documentos/noticias/exemplo-noticia-2.pdf'
  },
  // Add more items here for each news PDF you place in /public/documentos/noticias/
];

export default function NoticiasPage() {
  const { t } = useI18n();
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null);

  // Obter notícias traduzidas com medição de performance
  const newsItems = measure('getNewsItems', () => getNewsItems(t), { locale: t('locale.code', 'pt-BR') });

  const openViewer = (newsId: string) => setSelectedNewsId(newsId);
  const closeViewer = () => setSelectedNewsId(null);

  const selectedNewsDetails = newsItems.find(n => n.id === selectedNewsId);

  // Sort news items by date, newest first
  const sortedNewsItems = [...newsItems].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <MainLayout>
      <h1 className="text-3xl font-bold text-abz-text-black mb-6">{t('news.title')}</h1>

      <div className="bg-white p-6 rounded-lg shadow-md">
        {sortedNewsItems.length === 0 ? (
          <p className="text-center text-gray-500 py-8">{t('news.noNews')}</p>
        ) : (
          <div className="space-y-6">
            {sortedNewsItems.map((news) => (
              <div
                key={news.id}
                className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow flex flex-col sm:flex-row items-start gap-4"
              >
                <div className="bg-abz-light-pink p-3 rounded-full mt-1">
                    <FiRss className="text-abz-pink w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-abz-text-black mb-1">{news.title}</h3>
                  <p className="text-sm text-gray-500 mb-2">
                    {t('news.publishedAt')}: {new Date(news.date + 'T00:00:00').toLocaleDateString(t('locale.code', 'pt-BR'))}
                  </p>
                  <p className="text-sm text-abz-text-dark mb-4">
                    {news.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-auto">
                    <button
                      onClick={() => openViewer(news.id)}
                      className="flex items-center px-3 py-2 bg-abz-pink text-white rounded-md hover:bg-opacity-90 transition-colors text-sm"
                      title="Visualizar notícia"
                    >
                      <FiEye className="mr-1" />
                      {t('news.view', 'Visualizar')}
                    </button>
                    <a
                      href={news.file}
                      download // Atributo download força o download
                      className="flex items-center px-3 py-2 bg-gray-100 text-abz-text-dark rounded-md hover:bg-gray-200 transition-colors text-sm"
                    >
                      <FiDownload className="mr-1" />
                      {t('news.download', 'Download (PDF)')}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Visualizador de documento usando o componente lazy-loaded */}
      {selectedNewsId && selectedNewsDetails && (
        <LazyDocumentViewer
          title={selectedNewsDetails.title}
          filePath={selectedNewsDetails.file}
          onClose={closeViewer}
          accentColor="text-abz-pink"
        />
      )}
    </MainLayout>
  );
}