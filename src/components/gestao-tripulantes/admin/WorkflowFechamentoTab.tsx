'use client';

import React, { useState, useEffect } from 'react';
import {
  FiCheckSquare,
  FiMail,
  FiCalendar,
  FiSave,
  FiRefreshCw,
  FiCheck,
  FiAlertCircle,
  FiDownload,
  FiShield,
  FiUserCheck,
  FiClock,
} from 'react-icons/fi';
import { fetchWithToken } from '@/lib/fetchWithToken';

interface FechamentoConfig {
  dia_fechamento_mes: number;
  emails_destinatarios_dp: string[];
  emails_cc: string[];
  envio_automatico: boolean;
  assunto_email_template: string;
  corpo_email_template: string;
}

interface RelatorioRegistro {
  id: string;
  mes_referencia: string;
  ano: number;
  mes: number;
  status: 'pendente_revisao' | 'em_aprovacao' | 'aprovado' | 'rejeitado' | 'enviado';
  total_colaboradores: number;
  total_on: number;
  total_dba: number;
  total_fi: number;
  total_tre: number;
  aprovado_por_nome?: string;
  aprovado_por_cpf?: string;
  aprovado_em?: string;
  aprovado_ip?: string;
  assinatura_hash?: string;
  emails_enviados?: string[];
  enviado_em?: string;
  created_at: string;
}

export default function WorkflowFechamentoTab() {
  const [config, setConfig] = useState<FechamentoConfig>({
    dia_fechamento_mes: 25,
    emails_destinatarios_dp: ['dp@groupabz.com'],
    emails_cc: [],
    envio_automatico: false,
    assunto_email_template: 'Fechamento de Escala Gestão de Tripulantes - {Mes_Ano}',
    corpo_email_template: 'Prezados,\n\nSegue em anexo o relatório oficial consolidado de escalas da Gestão de Tripulantes para o período de {Mes_Ano}.\n\nAtenciosamente,\nGestão de Tripulantes - ABZ Group'
  });

  const [destinatariosInput, setDestinatariosInput] = useState('dp@groupabz.com');
  const [ccInput, setCcInput] = useState('');
  const [historico, setHistorico] = useState<RelatorioRegistro[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const resConfig = await fetchWithToken('/api/gestao-tripulantes/relatorio-mensal/config');
      const dataConfig = await resConfig.json();
      if (dataConfig.success && dataConfig.config) {
        setConfig(dataConfig.config);
        setDestinatariosInput(
          Array.isArray(dataConfig.config.emails_destinatarios_dp)
            ? dataConfig.config.emails_destinatarios_dp.join(', ')
            : dataConfig.config.emails_destinatarios_dp || ''
        );
        setCcInput(
          Array.isArray(dataConfig.config.emails_cc)
            ? dataConfig.config.emails_cc.join(', ')
            : dataConfig.config.emails_cc || ''
        );
      }

      // Carregar preview e histórico
      const currentMes = new Date().toISOString().slice(0, 7);
      const resRel = await fetchWithToken(`/api/gestao-tripulantes/relatorio-mensal?mesAno=${currentMes}`);
      const dataRel = await resRel.json();
      if (dataRel.registro) {
        setHistorico([dataRel.registro]);
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados de fechamento:', err);
      setErrorMsg('Falha ao carregar configurações de fechamento.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const emailsDp = destinatariosInput
      .split(',')
      .map(e => e.trim())
      .filter(Boolean);

    const emailsCc = ccInput
      .split(',')
      .map(e => e.trim())
      .filter(Boolean);

    try {
      const payload = {
        ...config,
        emails_destinatarios_dp: emailsDp,
        emails_cc: emailsCc,
      };

      const res = await fetchWithToken('/api/gestao-tripulantes/relatorio-mensal/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erro ao salvar configurações.');
      }

      setSuccessMsg('Configurações de fechamento mensal salvas com sucesso!');
      setConfig(payload);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPlanilha = async (mesAno: string) => {
    try {
      window.open(`/api/gestao-tripulantes/relatorio-mensal?mesAno=${mesAno}&download=true`, '_blank');
    } catch (err) {
      console.error('Erro ao baixar relatório:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Bloco de Configuração */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FiCheckSquare className="text-abz-blue text-xl" />
              Workflow de Fechamento de Escalas & Envio DP
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Configure a data de corte mensal, destinatários do Departamento Pessoal e templates para envio automático da planilha de escalas.
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            title="Atualizar"
          >
            <FiRefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
            <FiAlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
            <FiCheck className="w-5 h-5 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveConfig} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <FiCalendar className="text-abz-blue" />
                Dia do Fechamento no Mês (Data de Corte) *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={config.dia_fechamento_mes}
                  onChange={(e) =>
                    setConfig(prev => ({ ...prev, dia_fechamento_mes: parseInt(e.target.value, 10) || 25 }))
                  }
                  required
                  className="w-24 px-3 py-2 text-sm border border-gray-300 rounded-lg font-bold text-gray-900 focus:ring-2 focus:ring-abz-blue"
                />
                <span className="text-xs text-gray-500">Todo dia {config.dia_fechamento_mes} de cada mês</span>
              </div>
            </div>

            <div className="flex items-center pt-5">
              <label className="relative flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.envio_automatico}
                  onChange={(e) => setConfig(prev => ({ ...prev, envio_automatico: e.target.checked }))}
                  className="h-4 w-4 text-abz-blue rounded border-gray-300 focus:ring-abz-blue"
                />
                <div>
                  <span className="text-sm font-semibold text-gray-900">Disparo Automático no Dia de Corte</span>
                  <p className="text-xs text-gray-500">Notificar e gerar fechamento automático via Cron</p>
                </div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <FiMail className="text-abz-blue" />
                E-mails do Departamento Pessoal (Destinatários Principais) *
              </label>
              <input
                type="text"
                placeholder="dp@groupabz.com, folha@groupabz.com"
                value={destinatariosInput}
                onChange={(e) => setDestinatariosInput(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-abz-blue"
              />
              <span className="text-[11px] text-gray-500">Separe múltiplos e-mails por vírgula</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <FiMail className="text-gray-400" />
                E-mails em Cópia (CC)
              </label>
              <input
                type="text"
                placeholder="gerencia.operacoes@groupabz.com"
                value={ccInput}
                onChange={(e) => setCcInput(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-abz-blue"
              />
              <span className="text-[11px] text-gray-500">Opcional</span>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Assunto do E-mail (Template)
              </label>
              <input
                type="text"
                value={config.assunto_email_template}
                onChange={(e) => setConfig(prev => ({ ...prev, assunto_email_template: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-abz-blue font-mono"
              />
              <span className="text-[11px] text-gray-500">Variáveis disponíveis: <code>&#123;Mes_Ano&#125;</code></span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Mensagem Padrão do E-mail (Corpo)
              </label>
              <textarea
                rows={4}
                value={config.corpo_email_template}
                onChange={(e) => setConfig(prev => ({ ...prev, corpo_email_template: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-abz-blue font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-abz-blue text-white rounded-lg text-sm font-semibold hover:bg-blue-800 transition shadow-sm disabled:opacity-50"
            >
              {isSaving ? <FiRefreshCw className="animate-spin w-4 h-4" /> : <FiSave className="w-4 h-4" />}
              Salvar Configurações
            </button>
          </div>
        </form>
      </div>

      {/* Histórico e Auditoria de Fechamentos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <FiShield className="text-emerald-600" />
          Histórico de Fechamentos & Auditoria Digital
        </h3>
        <p className="text-xs text-gray-500">
          Relatórios mensais de escala aprovados, com rastreabilidade criptográfica de quem aprovou, IP de origem e protocolo de envio ao DP.
        </p>

        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-gray-700 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Mês/Ano</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Totais (ON / DBA / FI / TRE)</th>
                <th className="px-4 py-3">Aprovado Por & IP</th>
                <th className="px-4 py-3">Hash de Integridade</th>
                <th className="px-4 py-3 text-right">Planilha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {historico.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-sm">
                    Nenhum fechamento registrado até o momento.
                  </td>
                </tr>
              ) : (
                historico.map((h) => (
                  <tr key={h.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-bold text-gray-900 font-mono">
                      {h.mes_referencia}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        h.status === 'enviado' || h.status === 'aprovado'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {h.status === 'enviado' ? 'Enviado ao DP' : (h.status === 'aprovado' ? 'Aprovado' : 'Pendente')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-gray-700">
                      ON: <span className="text-emerald-700 font-bold">{h.total_on}</span> | 
                      DBA: <span className="text-amber-700 font-bold ml-1">{h.total_dba}</span> | 
                      FI: <span className="text-blue-700 font-bold ml-1">{h.total_fi}</span> | 
                      TRE: <span className="text-gray-900 font-bold ml-1">{h.total_tre}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <div className="font-semibold text-gray-900 flex items-center gap-1">
                        <FiUserCheck className="text-emerald-600" />
                        {h.aprovado_por_nome || 'N/A'}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {h.aprovado_em ? new Date(h.aprovado_em).toLocaleString('pt-BR') : ''} • IP: {h.aprovado_ip || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">
                      <span title={h.assinatura_hash} className="bg-gray-100 px-2 py-0.5 rounded text-[11px]">
                        {h.assinatura_hash ? `${h.assinatura_hash.slice(0, 12)}...` : 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDownloadPlanilha(h.mes_referencia)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded text-xs font-semibold transition"
                      >
                        <FiDownload className="w-3.5 h-3.5" />
                        Baixar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
