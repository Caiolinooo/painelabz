'use client';

import React, { useState } from 'react';
import { FiEdit2, FiSave, FiX, FiUser, FiMapPin, FiBriefcase } from 'react-icons/fi';
import { useI18n } from '@/contexts/I18nContext';
import { fetchWithToken } from '@/lib/tokenStorage';
import { toast } from 'react-hot-toast';

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
  cargo_nome: string;
  empresa_nome: string;
  embarcacao_nome: string;
  centro_custo_nome: string;
  status_embarque: string;
  standby: boolean;
  data_admissao: string;
  data_proximo_embarque: string;
}

interface Props {
  data: CollaboratorDetail;
  onUpdate?: (updated: Partial<CollaboratorDetail>) => void;
}

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className="text-sm text-gray-800 font-medium mt-0.5">{value || '—'}</p>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-blue-600" />
      <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">{title}</h4>
    </div>
  );
}

export default function DadosPessoaisTab({ data, onUpdate }: Props) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: data.email || '',
    telefone: data.telefone || '',
    estado_civil: data.estado_civil || '',
    endereco_logradouro: data.endereco_logradouro || '',
    endereco_numero: data.endereco_numero || '',
    endereco_complemento: data.endereco_complemento || '',
    endereco_bairro: data.endereco_bairro || '',
    endereco_cidade: data.endereco_cidade || '',
    endereco_uf: data.endereco_uf || '',
    endereco_cep: data.endereco_cep || '',
  });

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return d; }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetchWithToken(`/api/gestao-tripulantes/colaboradores/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Falha ao salvar');
      const json = await res.json();
      onUpdate?.(json.data);
      setEditing(false);
      toast.success(t('gestaoTripulantes.common.save') + ' ✓');
    } catch {
      toast.error(t('gestaoTripulantes.errors.saveError'));
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
              onClick={() => setEditing(false)}
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
          <InfoField label="Nome Completo" value={data.nome_completo} />
          <InfoField label={t('gestaoTripulantes.personalData.cpf')} value={data.cpf} />
          <InfoField label={t('gestaoTripulantes.personalData.rg')} value={data.rg} />
          <InfoField label={t('gestaoTripulantes.personalData.registrationNumber')} value={data.matricula} />
          <InfoField label={t('gestaoTripulantes.personalData.birthDate')} value={formatDate(data.data_nascimento)} />
          <InfoField label={t('gestaoTripulantes.personalData.nationality')} value={data.nacionalidade} />
          <InfoField label={t('gestaoTripulantes.personalData.birthplace')} value={data.naturalidade} />
          <InfoField label={t('gestaoTripulantes.personalData.motherName')} value={data.nome_mae} />
          <InfoField label={t('gestaoTripulantes.personalData.fatherName')} value={data.nome_pai} />

          {editing ? (
            <>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 font-medium mb-1">{t('gestaoTripulantes.personalData.maritalStatus')}</p>
                <select
                  className="w-full text-sm bg-white border border-gray-200 rounded px-2 py-1"
                  value={form.estado_civil}
                  onChange={e => setForm(f => ({ ...f, estado_civil: e.target.value }))}
                >
                  <option value="">—</option>
                  <option value="solteiro">Solteiro(a)</option>
                  <option value="casado">Casado(a)</option>
                  <option value="divorciado">Divorciado(a)</option>
                  <option value="viuvo">Viúvo(a)</option>
                  <option value="uniao_estavel">União Estável</option>
                </select>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 font-medium mb-1">{t('gestaoTripulantes.personalData.email')}</p>
                <input
                  className="w-full text-sm bg-white border border-gray-200 rounded px-2 py-1"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 font-medium mb-1">{t('gestaoTripulantes.personalData.phone')}</p>
                <input
                  className="w-full text-sm bg-white border border-gray-200 rounded px-2 py-1"
                  value={form.telefone}
                  onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                />
              </div>
            </>
          ) : (
            <>
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
          <InfoField label={t('gestaoTripulantes.personalData.position')} value={data.cargo_nome} />
          <InfoField label={t('gestaoTripulantes.personalData.company')} value={data.empresa_nome} />
          <InfoField label={t('gestaoTripulantes.personalData.vessel', 'Embarcação')} value={data.embarcacao_nome} />
          <InfoField label={t('gestaoTripulantes.personalData.costCenter')} value={data.centro_custo_nome} />
          <InfoField label={t('gestaoTripulantes.personalData.admissionDate')} value={formatDate(data.data_admissao)} />
          <InfoField label="Próximo Embarque" value={formatDate(data.data_proximo_embarque)} />
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
            ] as { key: keyof typeof form; label: string }[]).map(({ key, label }) => (
              <div key={key} className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
                <input
                  className="w-full text-sm bg-white border border-gray-200 rounded px-2 py-1"
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                />
              </div>
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
