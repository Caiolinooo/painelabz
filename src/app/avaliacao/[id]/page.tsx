'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { FiBarChart2, FiUser, FiCalendar, FiEdit, FiTrash, FiArrowLeft } from 'react-icons/fi';
import Link from 'next/link';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import MainLayout from '@/components/Layout/MainLayout';

export default function AvaliacaoDetailPage({ params }: { params: { id: string } }) {
  const { t } = useI18n();
  const { user } = useSupabaseAuth();
  const [avaliacao, setAvaliacao] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulação de carregamento de dados
    setTimeout(() => {
      setAvaliacao({
        id: params.id,
        funcionario: {
          id: '1',
          nome: 'João Silva',
          cargo: 'Desenvolvedor',
          departamento: 'TI'
        },
        avaliador: {
          id: '2',
          nome: 'Maria Souza',
          cargo: 'Gerente de TI'
        },
        periodo: 'trimestral',
        status: 'concluida',
        pontuacao: 85,
        dataAvaliacao: '2023-06-15',
        dataProximaAvaliacao: '2023-09-15',
        comentarios: 'Bom desempenho geral. Precisa melhorar em comunicação.',
        criterios: [
          { id: '1', nome: 'Produtividade', peso: 3, nota: 4, notaMaxima: 5 },
          { id: '2', nome: 'Qualidade', peso: 3, nota: 5, notaMaxima: 5 },
          { id: '3', nome: 'Comunicação', peso: 2, nota: 3, notaMaxima: 5 },
          { id: '4', nome: 'Trabalho em equipe', peso: 2, nota: 4, notaMaxima: 5 }
        ]
      });
      setLoading(false);
    }, 1000);
  }, [params.id]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-abz-blue mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
      </MainLayout>
    );
  }

  if (!avaliacao) {
    return (
      <MainLayout>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {t('avaliacao.noAvaliacoes')}
        </div>
        <div className="mt-4">
          <Link href="/avaliacao" className="text-abz-blue hover:underline flex items-center">
            <FiArrowLeft className="mr-2" />
            {t('common.back')}
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mb-6 flex items-center justify-between">
        <Link href="/avaliacao" className="text-abz-blue hover:underline flex items-center">
          <FiArrowLeft className="mr-2" />
          {t('common.back')}
        </Link>
        <div className="flex space-x-2">
          <button className="bg-abz-blue hover:bg-abz-blue-dark text-white px-4 py-2 rounded flex items-center">
            <FiEdit className="mr-2" />
            {t('avaliacao.editAvaliacao')}
          </button>
          <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded flex items-center">
            <FiTrash className="mr-2" />
            {t('avaliacao.deleteAvaliacao')}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="bg-abz-blue text-white p-6">
          <div className="flex items-center">
            <FiBarChart2 className="w-8 h-8 mr-3" />
            <div>
              <h1 className="text-2xl font-bold">{t('avaliacao.avaliacaoDetails')}</h1>
              <p className="text-blue-100">ID: {avaliacao.id}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <FiUser className="mr-2" />
                {t('avaliacao.funcionario')}
              </h2>
              <div className="space-y-2">
                <p>
                  <span className="font-medium">{t('avaliacao.funcionarios.nome')}:</span>{' '}
                  {avaliacao.funcionario.nome}
                </p>
                <p>
                  <span className="font-medium">{t('avaliacao.funcionarios.cargo')}:</span>{' '}
                  {avaliacao.funcionario.cargo}
                </p>
                <p>
                  <span className="font-medium">{t('avaliacao.funcionarios.departamento')}:</span>{' '}
                  {avaliacao.funcionario.departamento}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <FiUser className="mr-2" />
                {t('avaliacao.avaliador')}
              </h2>
              <div className="space-y-2">
                <p>
                  <span className="font-medium">{t('avaliacao.funcionarios.nome')}:</span>{' '}
                  {avaliacao.avaliador.nome}
                </p>
                <p>
                  <span className="font-medium">{t('avaliacao.funcionarios.cargo')}:</span>{' '}
                  {avaliacao.avaliador.cargo}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-2">{t('avaliacao.periodo')}</h2>
              <p>{t(`avaliacao.periodoOptions.${avaliacao.periodo}`)}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-2">{t('avaliacao.status')}</h2>
              <p>
                <span
                  className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    avaliacao.status === 'concluida'
                      ? 'bg-green-100 text-green-800'
                      : avaliacao.status === 'pendente'
                      ? 'bg-yellow-100 text-yellow-800'
                      : avaliacao.status === 'emAndamento'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {t(`avaliacao.statusOptions.${avaliacao.status}`)}
                </span>
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-2">{t('avaliacao.pontuacao')}</h2>
              <div className="flex items-center">
                <div className="text-2xl font-bold text-abz-blue">{avaliacao.pontuacao}</div>
                <div className="text-gray-500 ml-2">/ 100</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-2 flex items-center">
                <FiCalendar className="mr-2" />
                {t('avaliacao.dataAvaliacao')}
              </h2>
              <p>{new Date(avaliacao.dataAvaliacao).toLocaleDateString()}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-2 flex items-center">
                <FiCalendar className="mr-2" />
                {t('avaliacao.dataProximaAvaliacao')}
              </h2>
              <p>{new Date(avaliacao.dataProximaAvaliacao).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">{t('avaliacao.criterios')}</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('avaliacao.criterio.nome')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('avaliacao.criterio.peso')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('avaliacao.criterio.nota')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('common.total')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {avaliacao.criterios.map((criterio: any) => (
                    <tr key={criterio.id}>
                      <td className="px-6 py-4 whitespace-nowrap">{criterio.nome}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{criterio.peso}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {criterio.nota} / {criterio.notaMaxima}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {criterio.nota * criterio.peso}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">{t('avaliacao.comentarios')}</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p>{avaliacao.comentarios}</p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
