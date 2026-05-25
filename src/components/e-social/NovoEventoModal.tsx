'use client';

import React, { useState, useEffect } from 'react';
import { FiX, FiCheckCircle, FiAlertTriangle, FiCode, FiSave, FiSend, FiInfo, FiCopy } from 'react-icons/fi';
import { fetchWithToken } from '@/lib/tokenStorage';
import { toast } from 'react-hot-toast';

interface Collaborator {
  id: string;
  nome_completo: string;
  cpf: string;
  matricula?: string;
  empresa_cnpj?: string;
}

interface CatalogEvent {
  codigo_evento: string;
  nome: string;
  descricao?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NovoEventoModal({ isOpen, onClose, onSuccess }: Props) {
  const [catalog, setCatalog] = useState<CatalogEvent[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);

  // Form states
  const [selectedEventCode, setSelectedEventCode] = useState('S-2220');
  const [selectedColabId, setSelectedColabId] = useState('');
  const [searchColab, setSearchColab] = useState('');
  const [cpf, setCpf] = useState('');
  const [cnpj, setCnpj] = useState('12.345.678/0001-90');
  const [matricula, setMatricula] = useState('');
  const [tpAmb, setTpAmb] = useState('2'); // 2 = Homologação, 1 = Produção
  const [indRetif, setIndRetif] = useState('1'); // 1 = Original, 2 = Retificação
  const [nrRecibo, setNrRecibo] = useState('');

  // Event specific fields
  const [s2200Nome, setS2200Nome] = useState('');
  const [s2200DataAdmissao, setS2200DataAdmissao] = useState(new Date().toISOString().split('T')[0]);
  const [s2200TipoAdmissao, setS2200TipoAdmissao] = useState('1');
  const [s2200Cargo, setS2200Cargo] = useState('');
  const [s2200Salario, setS2200Salario] = useState('');

  const [s2220TipoExame, setS2220TipoExame] = useState('periodico');
  const [s2220DataRealizacao, setS2220DataRealizacao] = useState(new Date().toISOString().split('T')[0]);
  const [s2220Resultado, setS2220Resultado] = useState('apto');
  const [s2220MedicoNome, setS2220MedicoNome] = useState('');
  const [s2220MedicoCrm, setS2220MedicoCrm] = useState('');
  const [s2220MedicoUf, setS2220MedicoUf] = useState('RJ');
  const [s2220Exames, setS2220Exames] = useState<{codProc: string, obsProc: string, dtExm?: string}[]>([]);

  const [s2240Condicoes, setS2240Condicoes] = useState('');
  const [s2240FatorRisco, setS2240FatorRisco] = useState('09.01.001');
  const [s2240EpiEficaz, setS2240EpiEficaz] = useState('NA');
  const [s2240CargoInput, setS2240CargoInput] = useState('');
  const [s2240RiscoSuggestions, setS2240RiscoSuggestions] = useState<any[]>([]);
  const [s2240RiscoLoading, setS2240RiscoLoading] = useState(false);

  const [s3000EventoExcluir, setS3000EventoExcluir] = useState('S-2220');
  const [s3000ReciboExcluir, setS3000ReciboExcluir] = useState('REC-');

  // Validation / Preview results
  const [xmlPreview, setXmlPreview] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [preparedEventId, setPreparedEventId] = useState<string | null>(null);

  // Load catalog and collaborators
  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch config geral for environment
        const resConfig = await fetchWithToken('/api/e-social/config/geral');
        if (resConfig.ok) {
          const dataConfig = await resConfig.json();
          if (dataConfig.config?.ambiente === 'producao') {
            setTpAmb('1');
          } else {
            setTpAmb('2');
          }
        }

        // Fetch catalog
        const resCat = await fetchWithToken('/api/e-social/catalogo?ativos=true');
        if (resCat.ok) {
          const dataCat = await resCat.json();
          setCatalog(dataCat.catalogo || []);
        }

        // Fetch collaborators
        const resCol = await fetchWithToken('/api/gestao-tripulantes/colaboradores?limit=10000');
        if (resCol.ok) {
          const dataCol = await resCol.json();
          setCollaborators(dataCol.data || []);
        }
        
        // Load history or fallback
        const savedCnpj = localStorage.getItem('esocial_default_cnpj');
        if (savedCnpj) setCnpj(savedCnpj);
        else setCnpj('17.784.306/0001-89');

        setS2200Cargo(localStorage.getItem('esocial_s2200_cargo') || '');
        setS2200Salario(localStorage.getItem('esocial_s2200_salario') || '');
        setS2220MedicoNome(localStorage.getItem('esocial_s2220_medico_nome') || '');
        setS2220MedicoCrm(localStorage.getItem('esocial_s2220_medico_crm') || '');
        setS2220MedicoUf(localStorage.getItem('esocial_s2220_medico_uf') || 'RJ');
        setS2240CargoInput(localStorage.getItem('esocial_s2240_cargo') || '');
        setS2240Condicoes(localStorage.getItem('esocial_s2240_condicoes') || '');
        setS2240FatorRisco(localStorage.getItem('esocial_s2240_fator') || '09.01.001');
        setS2240EpiEficaz(localStorage.getItem('esocial_s2240_epi') || 'NA');
      } catch (err) {
        console.error('Erro ao buscar dados iniciais:', err);
        toast.error('Erro ao carregar dados do formulário');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen]);

  // Auto-fill collaborator details
  useEffect(() => {
    if (!selectedColabId) {
      setCpf('');
      setMatricula('');
      setS2200Nome('');
      return;
    }
    const colab = collaborators.find(c => c.id === selectedColabId);
    if (colab) {
      setCpf(colab.cpf || '');
      setMatricula(colab.matricula || '');
      setS2200Nome(colab.nome_completo || '');
    }
  }, [selectedColabId, collaborators]);

  // Auto-search risk factors by cargo for S-2240
  useEffect(() => {
    if (selectedEventCode !== 'S-2240' || !s2240CargoInput || s2240CargoInput.length < 3) {
      setS2240RiscoSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setS2240RiscoLoading(true);
      try {
        const res = await fetchWithToken(`/api/e-social/fatores-risco?search=${encodeURIComponent(s2240CargoInput)}`);
        if (res.ok) {
          const data = await res.json();
          setS2240RiscoSuggestions(data.fatores || []);
        }
      } catch {} finally {
        setS2240RiscoLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [s2240CargoInput, selectedEventCode]);

  const handleSelectRisco = (item: any) => {
    setS2240Condicoes(item.descricao_atividades || '');
    setS2240FatorRisco(item.codigo_fator_risco || '09.01.001');
    setS2240EpiEficaz(item.epi_utilizado === 'NA' ? 'NA' : 'S');
    setS2240CargoInput(item.cargo);
    setS2240RiscoSuggestions([]);
  };

  if (!isOpen) return null;

  // Build current dados_evento object
  const buildDadosEvento = () => {
    const common = {
      cpf: cpf.replace(/[^\d]/g, ''),
      cnpj: cnpj.replace(/[^\d]/g, ''),
      tpAmb: parseInt(tpAmb),
      indRetif: parseInt(indRetif),
      nrRecibo: indRetif === '2' ? nrRecibo : undefined,
    };

    let dadosEspecificos = {};

    if (selectedEventCode === 'S-2200') {
      dadosEspecificos = {
        nome: s2200Nome,
        dataAdmissao: s2200DataAdmissao,
        tipoAdmissao: parseInt(s2200TipoAdmissao),
        cargo: s2200Cargo,
        salario: parseFloat(s2200Salario) || 0,
      };
    } else if (selectedEventCode === 'S-2220') {
      dadosEspecificos = {
        tipoExame: s2220TipoExame,
        dataRealizacao: s2220DataRealizacao,
        resultado: s2220Resultado,
        medico: s2220MedicoNome,
        crm: s2220MedicoCrm,
        uf: s2220MedicoUf,
        exames_realizados: s2220Exames,
      };
    } else if (selectedEventCode === 'S-2240') {
      dadosEspecificos = {
        cargo: s2240CargoInput,
        condicoesAmbiente: s2240Condicoes,
        codFatRisco: s2240FatorRisco,
        epiEficaz: s2240EpiEficaz,
      };
    } else if (selectedEventCode === 'S-3000') {
      dadosEspecificos = {
        eventoExcluir: s3000EventoExcluir,
        reciboExcluir: s3000ReciboExcluir,
      };
    }

    return {
      ...common,
      dadosEspecificos,
    };
  };

  const handleValidateAndPreview = async () => {
    if (!cpf) {
      toast.error('Informe o CPF do trabalhador');
      return;
    }
    if (!cnpj) {
      toast.error('Informe o CNPJ do empregador');
      return;
    }

    setValidating(true);
    setXmlPreview(null);
    setValidationErrors([]);
    setIsValid(null);

    try {
      const payload = {
        evento_codigo: selectedEventCode,
        cpf_trabalhador: cpf.replace(/[^\d]/g, ''),
        cnpj_empregador: cnpj.replace(/[^\d]/g, ''),
        matricula: matricula || null,
        dados_evento: buildDadosEvento(),
        modulo_origem: 'manual',
      };

      const res = await fetchWithToken('/api/e-social/eventos/preparar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem('esocial_default_cnpj', cnpj);
        localStorage.setItem('esocial_s2200_cargo', s2200Cargo);
        localStorage.setItem('esocial_s2200_salario', s2200Salario);
        localStorage.setItem('esocial_s2220_medico_nome', s2220MedicoNome);
        localStorage.setItem('esocial_s2220_medico_crm', s2220MedicoCrm);
        localStorage.setItem('esocial_s2220_medico_uf', s2220MedicoUf);
        localStorage.setItem('esocial_s2240_cargo', s2240CargoInput);
        localStorage.setItem('esocial_s2240_condicoes', s2240Condicoes);
        localStorage.setItem('esocial_s2240_fator', s2240FatorRisco);
        localStorage.setItem('esocial_s2240_epi', s2240EpiEficaz);

        setXmlPreview(data.xml_preview || '');
        setPreparedEventId(data.evento?.id || null);

        const isOk = data.validacao?.valido;
        setIsValid(isOk);
        if (isOk) {
          toast.success('Evento validado com sucesso e salvo na fila de revisão!');
        } else {
          setValidationErrors(data.validacao?.erros || ['Erro desconhecido na validação']);
          toast('O evento possui inconsistências de dados ou no layout.', { icon: '⚠️' });
        }
      } else {
        toast.error(data.error || 'Erro ao validar e preparar o evento');
        setIsValid(false);
        setValidationErrors([data.error || 'Erro desconhecido no servidor']);
      }
    } catch (err: any) {
      toast.error('Erro ao comunicar com a API de preparação');
      setIsValid(false);
      setValidationErrors([err.message || 'Falha de conexão']);
    } finally {
      setValidating(false);
    }
  };

  const handleSaveDraftOnly = async () => {
    if (!cpf) {
      toast.error('Informe o CPF do trabalhador');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        evento_codigo: selectedEventCode,
        cpf_trabalhador: cpf.replace(/[^\d]/g, ''),
        cnpj_empregador: cnpj.replace(/[^\d]/g, ''),
        matricula: matricula || null,
        dados_evento: buildDadosEvento(),
        status: 'rascunho',
        modulo_origem: 'manual',
      };

      const res = await fetchWithToken('/api/e-social/eventos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem('esocial_default_cnpj', cnpj);
        localStorage.setItem('esocial_s2200_cargo', s2200Cargo);
        localStorage.setItem('esocial_s2200_salario', s2200Salario);
        localStorage.setItem('esocial_s2220_medico_nome', s2220MedicoNome);
        localStorage.setItem('esocial_s2220_medico_crm', s2220MedicoCrm);
        localStorage.setItem('esocial_s2220_medico_uf', s2220MedicoUf);
        localStorage.setItem('esocial_s2240_cargo', s2240CargoInput);
        localStorage.setItem('esocial_s2240_condicoes', s2240Condicoes);
        localStorage.setItem('esocial_s2240_fator', s2240FatorRisco);
        localStorage.setItem('esocial_s2240_epi', s2240EpiEficaz);

        toast.success('Rascunho salvo com sucesso!');
        onSuccess();
        onClose();
      } else {
        toast.error(data.error || 'Erro ao salvar rascunho');
      }
    } catch (err: any) {
      toast.error('Erro ao salvar evento');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (!xmlPreview) return;
    navigator.clipboard.writeText(xmlPreview);
    toast.success('XML copiado para a área de transferência');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
      <div className="flex flex-col w-full max-w-5xl h-[85vh] bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Lançamento Manual de Evento e-Social</h2>
            <p className="text-xs text-gray-500">Crie, valide, visualize o XML e envie eventos diretamente para o e-Social</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition">
            <FiX size={18} />
          </button>
        </div>

        {/* Content Split Pane */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Column: Form (2/3 width) */}
          <div className="w-full md:w-3/5 p-6 overflow-y-auto border-r border-gray-100 space-y-5">
            
            {/* Event & Collaborator Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Código do Evento</label>
                <select
                  value={selectedEventCode}
                  onChange={(e) => {
                    setSelectedEventCode(e.target.value);
                    setXmlPreview(null);
                    setIsValid(null);
                    setValidationErrors([]);
                  }}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="S-2200">S-2200 - Cadastramento Inicial / Admissão</option>
                  <option value="S-2220">S-2220 - Monitoramento da Saúde (ASO)</option>
                  <option value="S-2240">S-2240 - Condições Ambientais (Riscos)</option>
                  <option value="S-3000">S-3000 - Exclusão de Eventos</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Preenchimento Automático (Trabalhador)</label>
                <input
                  type="text"
                  value={searchColab}
                  onChange={(e) => {
                    setSearchColab(e.target.value);
                    setSelectedColabId('');
                  }}
                  placeholder="Buscar por nome ou CPF..."
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-1.5"
                />
                <select
                  value={selectedColabId}
                  onChange={(e) => setSelectedColabId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">-- Selecione para preencher dados --</option>
                  {collaborators
                    .filter(c => {
                      if (!searchColab) return true;
                      const q = searchColab.toLowerCase();
                      return c.nome_completo.toLowerCase().includes(q) || c.cpf.includes(q);
                    })
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome_completo} ({c.cpf})
                      </option>
                    ))}
                </select>
                {searchColab && (
                  <span className="text-[10px] text-gray-400 mt-0.5 block">
                    {collaborators.filter(c => c.nome_completo.toLowerCase().includes(searchColab.toLowerCase()) || c.cpf.includes(searchColab)).length} resultado(s) de {collaborators.length} colaboradores
                  </span>
                )}
              </div>
            </div>

            {/* Base e-Social Fields */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3">
              <span className="text-xs font-bold text-slate-700 tracking-wider uppercase block mb-1">Informações Básicas do Envio</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">CPF Trabalhador</label>
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-1.5 text-sm border rounded-md focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">CNPJ Empregador</label>
                  <input
                    type="text"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    placeholder="00.000.000/0000-00"
                    className="w-full px-3 py-1.5 text-sm border rounded-md focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Matrícula (opcional)</label>
                  <input
                    type="text"
                    value={matricula}
                    onChange={(e) => setMatricula(e.target.value)}
                    placeholder="MAT12345"
                    className="w-full px-3 py-1.5 text-sm border rounded-md focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Ambiente de Destino</label>
                  <select
                    value={tpAmb}
                    onChange={(e) => setTpAmb(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border rounded-md focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    <option value="2">2 - Produção Restrita (Homologação)</option>
                    <option value="1">1 - Produção Real (Oficial)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Tipo de Transmissão</label>
                  <select
                    value={indRetif}
                    onChange={(e) => setIndRetif(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border rounded-md focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    <option value="1">1 - Arquivo Original</option>
                    <option value="2">2 - Retificação de Arquivo Anterior</option>
                  </select>
                </div>
              </div>

              {indRetif === '2' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Número do Recibo do Evento Original</label>
                  <input
                    type="text"
                    value={nrRecibo}
                    onChange={(e) => setNrRecibo(e.target.value)}
                    placeholder="Ex: 1.2.1234567890123456789"
                    className="w-full px-3 py-1.5 text-sm border rounded-md focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Dynamic Event Form with presets */}
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-700 tracking-wider uppercase">Dados Específicos do Evento</span>
                <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-medium">presets ativos</span>
              </div>

              {/* S-2200 Form */}
              {selectedEventCode === 'S-2200' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">Nome Completo</label>
                      <input
                        type="text"
                        value={s2200Nome}
                        onChange={(e) => setS2200Nome(e.target.value)}
                        placeholder="Nome do trabalhador"
                        className="w-full px-3 py-1.5 text-sm border rounded-md focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">Data de Admissão</label>
                      <input
                        type="date"
                        value={s2200DataAdmissao}
                        onChange={(e) => setS2200DataAdmissao(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border rounded-md focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">Tipo de Admissão</label>
                      <select
                        value={s2200TipoAdmissao}
                        onChange={(e) => setS2200TipoAdmissao(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border rounded-md bg-white focus:ring-1"
                      >
                        <option value="1">1 - Admissão Regular</option>
                        <option value="2">2 - Transferência</option>
                        <option value="3">3 - Reintegração</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">Cargo</label>
                      <input
                        type="text"
                        value={s2200Cargo}
                        onChange={(e) => setS2200Cargo(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border rounded-md focus:ring-1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">Salário Base (R$)</label>
                      <input
                        type="number"
                        value={s2200Salario}
                        onChange={(e) => setS2200Salario(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border rounded-md focus:ring-1"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* S-2220 Form */}
              {selectedEventCode === 'S-2220' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">Tipo de Exame</label>
                      <select
                        value={s2220TipoExame}
                        onChange={(e) => setS2220TipoExame(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border rounded-md bg-white focus:ring-1"
                      >
                        <option value="admissional">Admissional</option>
                        <option value="periodico">Periódico</option>
                        <option value="demissional">Demissional</option>
                        <option value="retorno">Retorno ao Trabalho</option>
                        <option value="mudanca_funcao">Mudança de Função</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">Data de Realização</label>
                      <input
                        type="date"
                        value={s2220DataRealizacao}
                        onChange={(e) => setS2220DataRealizacao(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border rounded-md focus:ring-1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">Resultado ASO</label>
                      <select
                        value={s2220Resultado}
                        onChange={(e) => setS2220Resultado(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border rounded-md bg-white focus:ring-1"
                      >
                        <option value="apto">Apto</option>
                        <option value="inapto">Inapto</option>
                        <option value="apto_condicional">Apto Condicional</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">Médico Examinador</label>
                      <input
                        type="text"
                        value={s2220MedicoNome}
                        onChange={(e) => setS2220MedicoNome(e.target.value)}
                        placeholder="Nome do médico"
                        className="w-full px-3 py-1.5 text-sm border rounded-md focus:ring-1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">CRM</label>
                      <input
                        type="text"
                        value={s2220MedicoCrm}
                        onChange={(e) => setS2220MedicoCrm(e.target.value)}
                        placeholder="CRM do médico"
                        className="w-full px-3 py-1.5 text-sm border rounded-md focus:ring-1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">Estado (UF CRM)</label>
                      <select
                        value={s2220MedicoUf}
                        onChange={(e) => setS2220MedicoUf(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border rounded-md bg-white focus:ring-1"
                      >
                        {['RJ', 'SP', 'ES', 'MG', 'BA', 'SC', 'PR', 'RS', 'PE', 'CE', 'AM'].map(uf => (
                          <option key={uf} value={uf}>{uf}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 border border-gray-100 rounded-md p-3 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-gray-700">Exames Complementares</label>
                      <button
                        type="button"
                        onClick={() => setS2220Exames([...s2220Exames, { codProc: '', obsProc: '', dtExm: '' }])}
                        className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded font-medium hover:bg-blue-100 transition"
                      >
                        + Adicionar Exame
                      </button>
                    </div>
                    {s2220Exames.length === 0 && (
                      <p className="text-xs text-gray-400 italic">Nenhum exame adicional informado.</p>
                    )}
                    <div className="space-y-2">
                      {s2220Exames.map((exame, idx) => (
                        <div key={idx} className="flex gap-2 items-start">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={exame.codProc}
                              onChange={(e) => {
                                const newEx = [...s2220Exames];
                                newEx[idx].codProc = e.target.value;
                                setS2220Exames(newEx);
                              }}
                              placeholder="Cód. e-Social (ex: 0281)"
                              className="w-full px-2 py-1 text-xs border rounded focus:ring-1"
                            />
                          </div>
                          <div className="flex-1">
                            <input
                              type="date"
                              value={exame.dtExm || ''}
                              onChange={(e) => {
                                const newEx = [...s2220Exames];
                                newEx[idx].dtExm = e.target.value;
                                setS2220Exames(newEx);
                              }}
                              className="w-full px-2 py-1 text-xs border rounded focus:ring-1"
                              title="Data do exame (se diferente do ASO)"
                            />
                          </div>
                          <div className="flex-[2]">
                            <input
                              type="text"
                              value={exame.obsProc}
                              onChange={(e) => {
                                const newEx = [...s2220Exames];
                                newEx[idx].obsProc = e.target.value;
                                setS2220Exames(newEx);
                              }}
                              placeholder="Observações do exame..."
                              className="w-full px-2 py-1 text-xs border rounded focus:ring-1"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newEx = [...s2220Exames];
                              newEx.splice(idx, 1);
                              setS2220Exames(newEx);
                            }}
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <FiX size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* S-2240 Form */}
              {selectedEventCode === 'S-2240' && (
                <div className="space-y-3">
                  <div className="relative">
                    <label className="block text-xs text-gray-500 mb-0.5">Cargo (buscar fatores de risco)</label>
                    <input
                      type="text"
                      value={s2240CargoInput}
                      onChange={(e) => setS2240CargoInput(e.target.value)}
                      placeholder="Digite o cargo para auto-preenchimento..."
                      className="w-full px-3 py-1.5 text-sm border rounded-md focus:ring-1"
                    />
                    {s2240RiscoLoading && (
                      <span className="absolute right-3 top-1/2 text-xs text-gray-400">Buscando...</span>
                    )}
                    {s2240RiscoSuggestions.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {s2240RiscoSuggestions.map((item: any) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectRisco(item)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-gray-50 last:border-0"
                          >
                            <span className="font-medium">{item.cargo}</span>
                            <span className="text-gray-400 ml-2">{item.codigo_fator_risco}</span>
                            <span className="text-gray-400 ml-1">- {item.epi_utilizado}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">Descrição das Atividades / Ambiente</label>
                    <textarea
                      value={s2240Condicoes}
                      onChange={(e) => setS2240Condicoes(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-1.5 text-sm border rounded-md focus:ring-1"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">Fator de Risco (Código e-Social)</label>
                      <select
                        value={s2240FatorRisco}
                        onChange={(e) => setS2240FatorRisco(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border rounded-md bg-white focus:ring-1"
                      >
                        <option value="09.01.001">09.01.001 - Ausência de fator de risco</option>
                        <option value="01.01.001">01.01.001 - Ruído contínuo ou intermitente</option>
                        <option value="02.01.001">02.01.001 - Exposição a poeiras minerais</option>
                        <option value="03.01.001">03.01.001 - Vibração de corpo inteiro</option>
                        <option value="03.01.007">03.01.007 - Manipulação de resíduos</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">EPI Eficaz</label>
                      <select
                        value={s2240EpiEficaz}
                        onChange={(e) => setS2240EpiEficaz(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border rounded-md bg-white focus:ring-1"
                      >
                        <option value="NA">Não Aplicável (NA)</option>
                        <option value="S">Sim (S)</option>
                        <option value="N">Não (N)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* S-3000 Form */}
              {selectedEventCode === 'S-3000' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">Tipo de Evento a Excluir</label>
                      <select
                        value={s3000EventoExcluir}
                        onChange={(e) => setS3000EventoExcluir(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border rounded-md bg-white focus:ring-1"
                      >
                        <option value="S-2200">S-2200 - Admissão</option>
                        <option value="S-2220">S-2220 - Monitoramento de Saúde</option>
                        <option value="S-2240">S-2240 - Condições Ambientais</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">Número de Recibo do Evento a Excluir</label>
                      <input
                        type="text"
                        value={s3000ReciboExcluir}
                        onChange={(e) => setS3000ReciboExcluir(e.target.value)}
                        placeholder="REC-XXXX..."
                        className="w-full px-3 py-1.5 text-sm border rounded-md focus:ring-1"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions panel */}
            <div className="flex gap-3 pt-4 border-t border-gray-100 justify-end">
              <button
                type="button"
                onClick={handleSaveDraftOnly}
                disabled={loading || validating}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
              >
                <FiSave size={15} />
                Salvar Rascunho
              </button>

              <button
                type="button"
                onClick={handleValidateAndPreview}
                disabled={loading || validating}
                className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-md shadow-blue-500/10 hover:shadow-lg transition disabled:opacity-50"
              >
                <FiCode size={15} />
                {validating ? 'Validando...' : 'Validar e Gerar XML'}
              </button>
            </div>

          </div>

          {/* Right Column: XML Preview / Logs (1/3 width) */}
          <div className="w-full md:w-2/5 bg-slate-900 text-slate-200 flex flex-col overflow-hidden">
            
            {/* Title / Action bar */}
            <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiCode className="text-blue-400 w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">XML & Validação e-Social</span>
              </div>
              {xmlPreview && (
                <button
                  onClick={handleCopyToClipboard}
                  className="p-1.5 text-slate-400 hover:text-slate-200 rounded-md hover:bg-slate-800 transition"
                  title="Copiar XML"
                >
                  <FiCopy size={14} />
                </button>
              )}
            </div>

            {/* Validation Feedback panel */}
            {isValid !== null && (
              <div className={`p-4 flex items-start gap-3 border-b ${
                isValid 
                  ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-300' 
                  : 'bg-rose-950/40 border-rose-900/60 text-rose-300'
              }`}>
                {isValid ? (
                  <>
                    <FiCheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400" />
                    <div>
                      <p className="text-sm font-bold">XML Gerado e Pronto!</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        O evento passou nas regras de preenchimento e layout. Foi salvo na fila de revisão e está pronto para envio.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <FiAlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
                    <div>
                      <p className="text-sm font-bold">Falha na Validação</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Corrija as inconsistências listadas abaixo no formulário:
                      </p>
                      <ul className="list-disc pl-4 mt-2 space-y-1 text-xs text-slate-300">
                        {validationErrors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* XML Text Preview */}
            <div className="flex-1 p-5 font-mono text-[11px] leading-relaxed overflow-auto bg-slate-950 select-text">
              {xmlPreview ? (
                <pre className="text-blue-300/90 whitespace-pre-wrap">{xmlPreview}</pre>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center px-4 space-y-3">
                  <FiCode className="w-8 h-8 text-slate-700 animate-pulse" />
                  <div>
                    <p className="text-xs font-semibold text-slate-400">Prévia do XML e-Social</p>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-[240px]">
                      Preencha os campos ao lado e clique no botão <strong>Validar e Gerar XML</strong> para carregar a prévia estruturada.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom complete action */}
            {isValid && preparedEventId && (
              <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <FiInfo />
                  <span>Salvo como pendente de revisão</span>
                </div>
                <button
                  onClick={() => {
                    onSuccess();
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-800/80 rounded-md hover:bg-emerald-900 transition"
                >
                  <FiSend className="w-3.5 h-3.5" />
                  Concluir Lançamento
                </button>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
