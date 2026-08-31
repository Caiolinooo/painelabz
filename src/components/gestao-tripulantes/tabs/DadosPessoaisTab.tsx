'use client';

import React, { useState, useEffect } from 'react';
import { FiEdit2, FiSave, FiX, FiUser, FiMapPin, FiBriefcase } from 'react-icons/fi';
import { useI18n } from '@/contexts/I18nContext';
import { fetchWithToken } from '@/lib/tokenStorage';
import { toast } from 'react-hot-toast';
import { formatCpf, isValidCpf, formatBirthDate } from '@/lib/utils/identity';
import SearchableCreatableSelect from '@/components/gestao-tripulantes/SearchableCreatableSelect';
import {
  createGtLookupOption,
  toLookupOptions,
  type GtLookupKind,
} from '@/components/gestao-tripulantes/createGtLookupOption';

interface CollaboratorDetail {
  id: string;
  nome_completo: string;
  cpf: string;
  rg: string;
  data_nascimento: string;
  email: string;
  telefone: string;
  nacionalidade: string;
  naturalidade: string;
  nome_mae: string;
  nome_pai: string;
  estado_civil: string;
  endereco_logradouro: string;
  endereco_numero: string;
  endereco_complemento: string;
  endereco_bairro: string;
  endereco_cidade: string;
  endereco_uf: string;
  endereco_cep: string;
  matricula: string;
  cargo_id?: string | null;
  cargo_nome: string;
  empresa_id?: string | null;
  empresa_nome: string;
  embarcacao_atual_id?: string | null;
  embarcacao_nome: string;
  centro_custo_id?: string | null;
  centro_custo_nome: string;
  status_embarque: string;
  standby: boolean;
  regime_trabalho?: string | null;
  escala_embarque?: number | string | null;
  escala_folga?: number | string | null;
  data_admissao: string;
  data_ultimo_embarque?: string | null;
  data_ultimo_desembarque?: string | null;
  data_proximo_embarque: string;
}

interface LookupOption {
  id: string;
  nome: string;
  codigo?: string | null;
}

const ESTADO_CIVIL_OPTIONS = [
  { value: 'solteiro', label: 'Solteiro(a)' },
  { value: 'casado', label: 'Casado(a)' },
  { value: 'divorciado', label: 'Divorciado(a)' },
  { value: 'viuvo', label: 'Viúvo(a)' },
  { value: 'uniao_estavel', label: 'União Estável' },
] as const;

const STATUS_EMBARQUE_OPTIONS = [
  'embarcado', 'standby', 'folga', 'desembarcado', 'afastado', 'ferias', 'treinamento',
] as const;

const REGIME_ESCALA_OPTIONS = [
  { value: '14x14', label: '14 x 14 (14 dias a bordo / 14 dias folga)' },
  { value: '28x28', label: '28 x 28 (28 dias a bordo / 28 dias folga)' },
  { value: '15x15', label: '15 x 15 (15 dias a bordo / 15 dias folga)' },
  { value: '30x30', label: '30 x 30 (30 dias a bordo / 30 dias folga)' },
  { value: '60x60', label: '60 x 60 (60 dias a bordo / 60 dias folga)' },
] as const;

function toDateInput(d?: string | null): string {
  if (!d) return '';
  const s = String(d);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return '';
}

function displayDate(d?: string | null): string {
  if (!d) return '—';
  const iso = toDateInput(d);
  return iso ? formatBirthDate(iso) : '—';
}

function buildForm(data: CollaboratorDetail) {
  return {
    nome_completo: data.nome_completo || '',
    cpf: data.cpf ? formatCpf(data.cpf) : '',
    rg: data.rg || '',
    matricula: data.matricula || '',
    data_nascimento: toDateInput(data.data_nascimento),
    nacionalidade: data.nacionalidade || '',
    naturalidade: data.naturalidade || '',
    nome_mae: data.nome_mae || '',
    nome_pai: data.nome_pai || '',
    estado_civil: data.estado_civil || '',
    email: data.email || '',
    telefone: data.telefone || '',
    cargo_id: data.cargo_id || '',
    empresa_id: data.empresa_id || '',
    embarcacao_atual_id: data.embarcacao_atual_id || '',
    centro_custo_id: data.centro_custo_id || '',
    regime_trabalho: data.regime_trabalho || '14x14',
    escala_embarque: String(data.escala_embarque || 14),
    escala_folga: String(data.escala_folga || 14),
    data_admissao: toDateInput(data.data_admissao),
    data_ultimo_embarque: toDateInput(data.data_ultimo_embarque),
    data_ultimo_desembarque: toDateInput(data.data_ultimo_desembarque),
    data_proximo_embarque: toDateInput(data.data_proximo_embarque),
    status_embarque: data.status_embarque || '',
    standby: Boolean(data.standby),
    endereco_logradouro: data.endereco_logradouro || '',
    endereco_numero: data.endereco_numero || '',
    endereco_complemento: data.endereco_complemento || '',
    endereco_bairro: data.endereco_bairro || '',
    endereco_cidade: data.endereco_cidade || '',
    endereco_uf: data.endereco_uf || '',
    endereco_cep: data.endereco_cep || '',
  };
}

interface Props {
  data: CollaboratorDetail;
  onUpdate?: (updated: Partial<CollaboratorDetail>) => void;
  onRefresh?: () => void;
}

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className="text-sm text-gray-800 font-medium mt-0.5">{value || '—'}</p>
    </div>
  );
}

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
      {children}
    </div>
  );
}

const inputClass = 'w-full text-sm bg-white border border-gray-200 rounded px-2 py-1';

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-blue-600" />
      <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">{title}</h4>
    </div>
  );
}

export default function DadosPessoaisTab({ data, onUpdate, onRefresh }: Props) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => buildForm(data));
  const [cargos, setCargos] = useState<LookupOption[]>([]);
  const [empresas, setEmpresas] = useState<LookupOption[]>([]);
  const [embarcacoes, setEmbarcacoes] = useState<LookupOption[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<LookupOption[]>([]);

  useEffect(() => {
    setForm(buildForm(data));
  }, [data]);

  useEffect(() => {
    if (!editing) return;
    let cancelled = false;
    Promise.all([
      fetchWithToken('/api/gestao-tripulantes/cargos').then(r => r.ok ? r.json() : { data: [] }),
      fetchWithToken('/api/gestao-tripulantes/empresas').then(r => r.ok ? r.json() : { data: [] }),
      fetchWithToken('/api/gestao-tripulantes/embarcacoes').then(r => r.ok ? r.json() : { data: [] }),
      fetchWithToken('/api/gestao-tripulantes/centros-custo').then(r => r.ok ? r.json() : { data: [] }),
    ]).then(([c, e, emb, cc]) => {
      if (cancelled) return;
      setCargos(c.data || []);
      setEmpresas(e.data || []);
      setEmbarcacoes(emb.data || []);
      setCentrosCusto(cc.data || []);
    }).catch(() => {
      if (!cancelled) toast.error('Não foi possível carregar cargos/empresas para edição');
    });
    return () => { cancelled = true; };
  }, [editing]);

  const setField = <K extends keyof ReturnType<typeof buildForm>>(key: K, value: ReturnType<typeof buildForm>[K]) => {
    setForm(f => ({ ...f, [key]: value }));
  };

  const handleCreateLookup = async (
    kind: GtLookupKind,
    label: string,
    setter: React.Dispatch<React.SetStateAction<LookupOption[]>>,
  ) => {
    try {
      const created = await createGtLookupOption(kind, label);
      setter(prev => (prev.some(o => o.id === created.id) ? prev : [...prev, { id: created.id, nome: created.nome, codigo: created.codigo }]));
      toast.success(`«${created.label}» adicionado`);
      return created;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao adicionar');
      throw err;
    }
  };

  const handleSave = async () => {
    if (!form.nome_completo.trim()) {
      toast.error('Nome completo é obrigatório');
      return;
    }
    if (!form.cpf.trim() || !isValidCpf(form.cpf)) {
      toast.error('CPF inválido');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        ...form,
        cargo_id: form.cargo_id || null,
        empresa_id: form.empresa_id || null,
        embarcacao_atual_id: form.embarcacao_atual_id || null,
        centro_custo_id: form.centro_custo_id || null,
        escala_embarque: form.escala_embarque ? Number(form.escala_embarque) : null,
        escala_folga: form.escala_folga ? Number(form.escala_folga) : null,
        data_nascimento: form.data_nascimento || null,
        data_admissao: form.data_admissao || null,
        data_ultimo_embarque: form.data_ultimo_embarque || null,
        data_ultimo_desembarque: form.data_ultimo_desembarque || null,
        data_proximo_embarque: form.data_proximo_embarque || null,
        status_embarque: form.status_embarque || null,
      };
      const res = await fetchWithToken(`/api/gestao-tripulantes/colaboradores/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Falha ao salvar');
      onUpdate?.(json.data);
      setEditing(false);
      toast.success(t('gestaoTripulantes.common.save') + ' ✓');
      onRefresh?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('gestaoTripulantes.errors.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const statusColors: Record<string, string> = {
    embarcado: 'bg-green-100 text-green-700',
    standby: 'bg-orange-100 text-orange-700',
    folga: 'bg-blue-100 text-blue-700',
    desembarcado: 'bg-gray-100 text-gray-600',
    afastado: 'bg-red-100 text-red-700',
    ferias: 'bg-purple-100 text-purple-700',
    treinamento: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <div className="p-6 space-y-6">
      {/* Edit toggle */}
      <div className="flex justify-end">
        {editing ? (
          <div className="flex gap-2">
            <button
              onClick={() => { setForm(buildForm(data)); setEditing(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <FiX className="w-3.5 h-3.5" /> {t('gestaoTripulantes.common.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <FiSave className="w-3.5 h-3.5" /> {saving ? t('gestaoTripulantes.common.loading') : t('gestaoTripulantes.common.save')}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
          >
            <FiEdit2 className="w-3.5 h-3.5" /> {t('gestaoTripulantes.profile.edit')}
          </button>
        )}
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-3">
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[data.status_embarque] || 'bg-gray-100 text-gray-600'}`}>
          {t(`gestaoTripulantes.status.${data.status_embarque}`, data.status_embarque)}
          {data.standby && ' • StandBy'}
        </span>
      </div>

      {/* Dados pessoais */}
      <div>
        <SectionTitle icon={FiUser} title={t('gestaoTripulantes.personalData.fullName', 'Dados Pessoais')} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {editing ? (
            <>
              <EditField label="Nome Completo">
                <input className={inputClass} value={form.nome_completo} onChange={e => setField('nome_completo', e.target.value)} />
              </EditField>
              <EditField label={t('gestaoTripulantes.personalData.cpf')}>
                <input
                  className={inputClass}
                  value={form.cpf}
                  onChange={e => setField('cpf', formatCpf(e.target.value))}
                  inputMode="numeric"
                  autoComplete="off"
                />
              </EditField>
              <EditField label={t('gestaoTripulantes.personalData.rg')}>
                <input className={inputClass} value={form.rg} onChange={e => setField('rg', e.target.value)} />
              </EditField>
              <EditField label={t('gestaoTripulantes.personalData.registrationNumber')}>
                <input className={inputClass} value={form.matricula} onChange={e => setField('matricula', e.target.value)} />
              </EditField>
              <EditField label={t('gestaoTripulantes.personalData.birthDate')}>
                <input type="date" className={inputClass} value={form.data_nascimento} onChange={e => setField('data_nascimento', e.target.value)} />
              </EditField>
              <EditField label={t('gestaoTripulantes.personalData.nationality')}>
                <input className={inputClass} value={form.nacionalidade} onChange={e => setField('nacionalidade', e.target.value)} />
              </EditField>
              <EditField label={t('gestaoTripulantes.personalData.birthplace')}>
                <input className={inputClass} value={form.naturalidade} onChange={e => setField('naturalidade', e.target.value)} />
              </EditField>
              <EditField label={t('gestaoTripulantes.personalData.motherName')}>
                <input className={inputClass} value={form.nome_mae} onChange={e => setField('nome_mae', e.target.value)} />
              </EditField>
              <EditField label={t('gestaoTripulantes.personalData.fatherName')}>
                <input className={inputClass} value={form.nome_pai} onChange={e => setField('nome_pai', e.target.value)} />
              </EditField>
              <EditField label={t('gestaoTripulantes.personalData.maritalStatus')}>
                <select className={inputClass} value={form.estado_civil} onChange={e => setField('estado_civil', e.target.value)}>
                  <option value="">—</option>
                  {ESTADO_CIVIL_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                  {form.estado_civil && !ESTADO_CIVIL_OPTIONS.some(o => o.value === form.estado_civil) && (
                    <option value={form.estado_civil}>{form.estado_civil}</option>
                  )}
                </select>
              </EditField>
              <EditField label={t('gestaoTripulantes.personalData.email')}>
                <input type="email" className={inputClass} value={form.email} onChange={e => setField('email', e.target.value)} />
              </EditField>
              <EditField label="Telefone">
                <input className={inputClass} value={form.telefone} onChange={e => setField('telefone', e.target.value)} />
              </EditField>
            </>
          ) : (
            <>
              <InfoField label="Nome Completo" value={data.nome_completo} />
              <InfoField label={t('gestaoTripulantes.personalData.cpf')} value={data.cpf} />
              <InfoField label={t('gestaoTripulantes.personalData.rg')} value={data.rg} />
              <InfoField label={t('gestaoTripulantes.personalData.registrationNumber')} value={data.matricula} />
              <InfoField label={t('gestaoTripulantes.personalData.birthDate')} value={displayDate(data.data_nascimento)} />
              <InfoField label={t('gestaoTripulantes.personalData.nationality')} value={data.nacionalidade} />
              <InfoField label={t('gestaoTripulantes.personalData.birthplace')} value={data.naturalidade} />
              <InfoField label={t('gestaoTripulantes.personalData.motherName')} value={data.nome_mae} />
              <InfoField label={t('gestaoTripulantes.personalData.fatherName')} value={data.nome_pai} />
              <InfoField label={t('gestaoTripulantes.personalData.maritalStatus')} value={data.estado_civil} />
              <InfoField label={t('gestaoTripulantes.personalData.email')} value={data.email} />
              <InfoField label="Telefone" value={data.telefone} />
            </>
          )}
        </div>
      </div>

      {/* Dados profissionais */}
      <div>
        <SectionTitle icon={FiBriefcase} title="Dados Profissionais" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {editing ? (
            <>
              <EditField label={t('gestaoTripulantes.personalData.position')}>
                <SearchableCreatableSelect
                  className={inputClass}
                  options={toLookupOptions(cargos, 'cargos', { id: form.cargo_id, label: data.cargo_nome || form.cargo_id })}
                  value={form.cargo_id}
                  onChange={id => setField('cargo_id', id)}
                  allowCreate
                  onCreate={label => handleCreateLookup('cargos', label, setCargos)}
                  placeholder="Buscar ou adicionar cargo..."
                />
              </EditField>
              <EditField label={t('gestaoTripulantes.personalData.company')}>
                <SearchableCreatableSelect
                  className={inputClass}
                  options={toLookupOptions(empresas, 'empresas', { id: form.empresa_id, label: data.empresa_nome || form.empresa_id })}
                  value={form.empresa_id}
                  onChange={id => setField('empresa_id', id)}
                  allowCreate
                  onCreate={label => handleCreateLookup('empresas', label, setEmpresas)}
                  placeholder="Buscar ou adicionar empresa..."
                />
              </EditField>
              <EditField label={t('gestaoTripulantes.personalData.vessel', 'Embarcação')}>
                <SearchableCreatableSelect
                  className={inputClass}
                  options={toLookupOptions(embarcacoes, 'embarcacoes', { id: form.embarcacao_atual_id, label: data.embarcacao_nome || form.embarcacao_atual_id })}
                  value={form.embarcacao_atual_id}
                  onChange={id => setField('embarcacao_atual_id', id)}
                  allowCreate
                  onCreate={label => handleCreateLookup('embarcacoes', label, setEmbarcacoes)}
                  placeholder="Buscar ou adicionar embarcação..."
                />
              </EditField>
              <EditField label={t('gestaoTripulantes.personalData.costCenter')}>
                <SearchableCreatableSelect
                  className={inputClass}
                  options={toLookupOptions(centrosCusto, 'centros-custo', { id: form.centro_custo_id, label: data.centro_custo_nome || form.centro_custo_id })}
                  value={form.centro_custo_id}
                  onChange={id => setField('centro_custo_id', id)}
                  allowCreate
                  onCreate={label => handleCreateLookup('centros-custo', label, setCentrosCusto)}
                  placeholder="Buscar ou adicionar centro de custo..."
                />
              </EditField>
              <EditField label="Regime de Trabalho (Escala)">
                <select
                  className={inputClass}
                  value={form.regime_trabalho}
                  onChange={e => {
                    const val = e.target.value;
                    setField('regime_trabalho', val);
                    const match = val.match(/^(\d+)x(\d+)/i);
                    if (match) {
                      setField('escala_embarque', match[1]);
                      setField('escala_folga', match[2]);
                    }
                  }}
                >
                  <option value="">—</option>
                  {REGIME_ESCALA_OPTIONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                  {form.regime_trabalho && !REGIME_ESCALA_OPTIONS.some(r => r.value === form.regime_trabalho) && (
                    <option value={form.regime_trabalho}>{form.regime_trabalho}</option>
                  )}
                </select>
              </EditField>
              <EditField label="Dias A Bordo (Escala Regular)">
                <input
                  type="number"
                  min="1"
                  max="180"
                  className={inputClass}
                  value={form.escala_embarque}
                  onChange={e => setField('escala_embarque', e.target.value)}
                  placeholder="Ex: 14"
                />
              </EditField>
              <EditField label="Dias de Folga (Escala Regular)">
                <input
                  type="number"
                  min="1"
                  max="180"
                  className={inputClass}
                  value={form.escala_folga}
                  onChange={e => setField('escala_folga', e.target.value)}
                  placeholder="Ex: 14"
                />
              </EditField>
              <EditField label={t('gestaoTripulantes.personalData.admissionDate')}>
                <input type="date" className={inputClass} value={form.data_admissao} onChange={e => setField('data_admissao', e.target.value)} />
              </EditField>
              <EditField label="Último Embarque">
                <input type="date" className={inputClass} value={form.data_ultimo_embarque} onChange={e => setField('data_ultimo_embarque', e.target.value)} />
              </EditField>
              <EditField label="Último Desembarque">
                <input type="date" className={inputClass} value={form.data_ultimo_desembarque} onChange={e => setField('data_ultimo_desembarque', e.target.value)} />
              </EditField>
              <EditField label="Próximo Embarque">
                <input type="date" className={inputClass} value={form.data_proximo_embarque} onChange={e => setField('data_proximo_embarque', e.target.value)} />
              </EditField>
              <EditField label="Status de embarque">
                <select className={inputClass} value={form.status_embarque} onChange={e => setField('status_embarque', e.target.value)}>
                  <option value="">—</option>
                  {STATUS_EMBARQUE_OPTIONS.map(s => (
                    <option key={s} value={s}>{t(`gestaoTripulantes.status.${s}`, s)}</option>
                  ))}
                </select>
              </EditField>
              <EditField label="StandBy">
                <label className="flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="checkbox"
                    checked={form.standby}
                    onChange={e => setField('standby', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300"
                  />
                  Em StandBy
                </label>
              </EditField>
            </>
          ) : (
            <>
              <InfoField label={t('gestaoTripulantes.personalData.position')} value={data.cargo_nome} />
              <InfoField label={t('gestaoTripulantes.personalData.company')} value={data.empresa_nome} />
              <InfoField label={t('gestaoTripulantes.personalData.vessel', 'Embarcação')} value={data.embarcacao_nome} />
              <InfoField label={t('gestaoTripulantes.personalData.costCenter')} value={data.centro_custo_nome} />
              <InfoField label="Regime / Escala de Trabalho" value={data.regime_trabalho ? `${data.regime_trabalho} (${data.escala_embarque || 14}d a bordo / ${data.escala_folga || 14}d folga)` : '14x14 (14d a bordo / 14d folga)'} />
              <InfoField label={t('gestaoTripulantes.personalData.admissionDate')} value={displayDate(data.data_admissao)} />
              <InfoField label="Último Embarque" value={displayDate(data.data_ultimo_embarque)} />
              <InfoField label="Último Desembarque" value={displayDate(data.data_ultimo_desembarque)} />
              <InfoField label="Próximo Embarque" value={displayDate(data.data_proximo_embarque)} />
            </>
          )}
        </div>
      </div>

      {/* Endereço */}
      <div>
        <SectionTitle icon={FiMapPin} title={t('gestaoTripulantes.personalData.address')} />
        {editing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {([
              { key: 'endereco_logradouro', label: 'Logradouro' },
              { key: 'endereco_numero', label: 'Número' },
              { key: 'endereco_complemento', label: 'Complemento' },
              { key: 'endereco_bairro', label: 'Bairro' },
              { key: 'endereco_cidade', label: 'Cidade' },
              { key: 'endereco_uf', label: 'UF' },
              { key: 'endereco_cep', label: 'CEP' },
            ] as const).map(({ key, label }) => (
              <EditField key={key} label={label}>
                <input
                  className={inputClass}
                  value={form[key]}
                  onChange={e => setField(key, e.target.value)}
                />
              </EditField>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <InfoField label="Logradouro" value={`${data.endereco_logradouro || ''}${data.endereco_numero ? `, ${data.endereco_numero}` : ''}`} />
            <InfoField label="Complemento" value={data.endereco_complemento} />
            <InfoField label="Bairro" value={data.endereco_bairro} />
            <InfoField label="Cidade/UF" value={`${data.endereco_cidade || ''}${data.endereco_uf ? `/${data.endereco_uf}` : ''}`} />
            <InfoField label="CEP" value={data.endereco_cep} />
          </div>
        )}
      </div>
    </div>
  );
}
