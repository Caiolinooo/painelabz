'use client';

import React, { useState, useEffect } from 'react';
import {
  FiX,
  FiCheckCircle,
  FiDownload,
  FiSend,
  FiShield,
  FiSearch,
  FiRefreshCw,
  FiAlertTriangle,
  FiCalendar,
  FiFileText,
  FiEdit3,
} from 'react-icons/fi';
import { fetchWithToken } from '@/lib/fetchWithToken';
import { useSignature } from '@/contexts/SignatureContext';

interface ModalAprovacaoFechamentoProps {
  isOpen: boolean;
  onClose: () => void;
  initialMesAno?: string;
  onSuccess?: () => void;
}

export default function ModalAprovacaoFechamento({
  isOpen,
  onClose,
  initialMesAno,
  onSuccess,
}: ModalAprovacaoFechamentoProps) {
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [mesAno, setMesAno] = useState(initialMesAno || currentMonthStr);
  const [isLoading, setIsLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [enviarEmail, setEnviarEmail] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<{ success: boolean; text: string; hash?: string } | null>(null);

  const { requestSignature, hasSignature } = useSignature();

  const loadPreview = async (targetMes: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    setResultMsg(null);
    try {
      const res = await fetchWithToken(`/api/gestao-tripulantes/relatorio-mensal?mesAno=${targetMes}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erro ao carregar dados do mês.');
      }
      setPreviewData(data);
    } catch (err: any) {
      console.error('Erro no preview do fechamento:', err);
      setErrorMsg(err.message || 'Falha ao buscar dados do fechamento.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPreview(mesAno);
    }
  }, [isOpen, mesAno]);

  const handleDownloadXlsx = () => {
    window.open(`/api/gestao-tripulantes/relatorio-mensal?mesAno=${mesAno}&download=true`, '_blank');
  };

  const handleApprove = async () => {
    setErrorMsg(null);
    setResultMsg(null);

    // Se o usuário não tiver assinatura cadastrada, solicitar que cadastre agora
    if (!hasSignature) {
      requestSignature({
        title: 'Assinatura Digital de Fechamento de Escala',
        description: `Cadastre sua assinatura digital para validar o fechamento de escala de ${mesAno} para o DP.`,
        documentId: `fechamento-${mesAno}`,
        onSign: async () => {
          await executeApproval();
        }
      });
      return;
    }

    await executeApproval();
  };

  const executeApproval = async () => {
    setIsApproving(true);
    try {
      const res = await fetchWithToken('/api/gestao-tripulantes/relatorio-mensal/aprovar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mesAno,
          observacoes,
          enviarEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erro ao aprovar fechamento.');
      }

      setResultMsg({
        success: true,
        text: data.message || 'Fechamento aprovado e registrado com sucesso!',
        hash: data.signatureHash,
      });

      if (onSuccess) onSuccess();
      // Recarregar preview com status atualizado
      await loadPreview(mesAno);
    } catch (err: any) {
      console.error('Erro na aprovação do fechamento:', err);
      setErrorMsg(err.message || 'Erro ao processar aprovação.');
    } finally {
      setIsApproving(false);
    }
  };

  if (!isOpen) return null;

  const colabs = previewData?.colaboradoresTotais || [];
  const filteredColabs = colabs.filter((c: any) =>
    (c.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.cpf || '').includes(searchTerm) ||
    (c.cargo || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isAlreadyApproved = previewData?.registro?.status === 'aprovado' || previewData?.registro?.status === 'enviado';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150 border border-gray-200">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-sm">
              <FiShield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Fechamento Mensal de Escalas — DP & Folha
              </h2>
              <p className="text-xs text-gray-500">
                Cômputo individual de ON, DBA, FI e TRE com aprovação e assinatura digital auditável
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-sm">
          {/* Seletor de Mês e Ações Topo */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-gray-700 uppercase flex items-center gap-1">
                <FiCalendar className="text-abz-blue" />
                Mês de Referência:
              </label>
              <input
                type="month"
                value={mesAno}
                onChange={(e) => setMesAno(e.target.value)}
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg font-bold text-gray-900 text-sm focus:ring-2 focus:ring-abz-blue shadow-sm"
              />
              <button
                onClick={() => loadPreview(mesAno)}
                disabled={isLoading}
                className="p-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
                title="Recarregar dados"
              >
                <FiRefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadXlsx}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition shadow-sm"
              >
                <FiDownload className="w-4 h-4" />
                Baixar Planilha (.xlsx)
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
              <FiAlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {resultMsg && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-2 text-green-800 text-sm">
              <div className="flex items-center gap-2 font-bold">
                <FiCheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span>{resultMsg.text}</span>
              </div>
              {resultMsg.hash && (
                <div className="text-xs font-mono bg-green-100/70 p-2 rounded text-green-900 break-all">
                  Hash de Autenticidade: <strong>{resultMsg.hash}</strong>
                </div>
              )}
            </div>
          )}

          {/* Cards de KPIs Consolidados */}
          {previewData?.totaisConsolidados && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">Tripulantes</span>
                <span className="text-xl font-black text-slate-900">
                  {previewData.totaisConsolidados.totalColaboradores}
                </span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                <span className="text-[11px] font-semibold text-emerald-700 uppercase block">ON (A Bordo)</span>
                <span className="text-xl font-black text-emerald-800">
                  {previewData.totaisConsolidados.totalON}
                </span>
              </div>
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                <span className="text-[11px] font-semibold text-amber-700 uppercase block">DBA (Dobra)</span>
                <span className="text-xl font-black text-amber-800">
                  {previewData.totaisConsolidados.totalDBA}
                </span>
              </div>
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl">
                <span className="text-[11px] font-semibold text-blue-700 uppercase block">FI (Folga Ind)</span>
                <span className="text-xl font-black text-blue-800">
                  {previewData.totaisConsolidados.totalFI}
                </span>
              </div>
              <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl">
                <span className="text-[11px] font-semibold text-purple-700 uppercase block">TRE (Treinamento)</span>
                <span className="text-xl font-black text-purple-800">
                  {previewData.totaisConsolidados.totalTRE}
                </span>
              </div>
            </div>
          )}

          {/* Tabela de Preview dos Colaboradores */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                Detalhamento dos Colaboradores ({filteredColabs.length})
              </h3>
              <div className="relative w-64">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder="Filtrar por nome ou CPF..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-abz-blue"
                />
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                <thead className="bg-gray-100 text-gray-700 font-semibold sticky top-0">
                  <tr>
                    <th className="px-3 py-2">Tripulante</th>
                    <th className="px-3 py-2">CPF</th>
                    <th className="px-3 py-2">Cargo</th>
                    <th className="px-3 py-2 text-center bg-emerald-100/50">ON</th>
                    <th className="px-3 py-2 text-center bg-amber-100/50">DBA</th>
                    <th className="px-3 py-2 text-center bg-blue-100/50">FI</th>
                    <th className="px-3 py-2 text-center bg-purple-100/50">TRE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        <FiRefreshCw className="animate-spin inline w-4 h-4 mr-1 text-abz-blue" />
                        Calculando totais da escala...
                      </td>
                    </tr>
                  ) : filteredColabs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                        Nenhum registro encontrado para este filtro.
                      </td>
                    </tr>
                  ) : (
                    filteredColabs.map((c: any, idx: number) => (
                      <tr key={c.cpf || idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-900">{c.nome}</td>
                        <td className="px-3 py-2 font-mono text-gray-500">{c.cpf}</td>
                        <td className="px-3 py-2 text-gray-600">{c.cargo}</td>
                        <td className="px-3 py-2 text-center font-bold text-emerald-700 bg-emerald-50/30">
                          {c.total_on}
                        </td>
                        <td className="px-3 py-2 text-center font-bold text-amber-700 bg-amber-50/30">
                          {c.total_dba}
                        </td>
                        <td className="px-3 py-2 text-center font-bold text-blue-700 bg-blue-50/30">
                          {c.total_fi}
                        </td>
                        <td className="px-3 py-2 text-center font-bold text-purple-700 bg-purple-50/30">
                          {c.total_tre}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Auditoria / Assinatura Digital & Opções de Envio */}
          <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-gray-900 text-xs uppercase flex items-center gap-1.5">
                <FiShield className="text-abz-blue" />
                Autenticação & Assinatura Digital
              </h4>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                hasSignature ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {hasSignature ? '✓ Assinatura Digital Cadastrada' : 'Assinatura Pendente'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Observações da Aprovação (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Escala conferida com RH e Logística, autorizada para folha."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-abz-blue"
                />
              </div>

              <div className="flex flex-col justify-center space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enviarEmail}
                    onChange={(e) => setEnviarEmail(e.target.checked)}
                    className="h-4 w-4 text-abz-blue rounded border-gray-300 focus:ring-abz-blue"
                  />
                  <span className="text-xs font-semibold text-gray-800">
                    Enviar planilha anexada por e-mail ao Departamento Pessoal (DP)
                  </span>
                </label>
                <p className="text-[11px] text-gray-500 pl-6">
                  Dispara o e-mail oficial com o anexo XLSX assinado e o resumo consolidado.
                </p>
              </div>
            </div>

            {isAlreadyApproved && previewData?.registro && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 space-y-1">
                <div>
                  <strong>Status Atual:</strong> Fechamento {previewData.registro.status.toUpperCase()} por{' '}
                  <strong>{previewData.registro.aprovado_por_nome}</strong> em{' '}
                  {new Date(previewData.registro.aprovado_em).toLocaleString('pt-BR')} (IP: {previewData.registro.aprovado_ip})
                </div>
                <div className="font-mono text-[10px] text-emerald-700">
                  Hash: {previewData.registro.assinatura_hash}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100"
          >
            Fechar
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadXlsx}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-emerald-600 text-emerald-700 rounded-lg text-sm font-semibold hover:bg-emerald-50 transition"
            >
              <FiFileText className="w-4 h-4" />
              Baixar .xlsx
            </button>

            <button
              onClick={handleApprove}
              disabled={isApproving || isLoading}
              className="inline-flex items-center gap-2 px-5 py-2 bg-abz-blue text-white rounded-lg text-sm font-bold hover:bg-blue-800 transition shadow-md disabled:opacity-50"
            >
              {isApproving ? (
                <FiRefreshCw className="animate-spin w-4 h-4" />
              ) : (
                <FiSend className="w-4 h-4" />
              )}
              {isAlreadyApproved ? 'Reaprovar & Reenviar' : 'Aprovar, Assinar & Enviar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
