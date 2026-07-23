'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { FiPlus, FiRefreshCw, FiSave, FiTrash2, FiEye, FiEyeOff } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { fetchWithToken } from '@/lib/tokenStorage';
import type { GTTipoEventoEscala } from '@/types/gestao-tripulantes';

const emptyForm = {
  codigo: '',
  display_code: '',
  label: '',
  bg_color: '#e2efda',
  text_color: '#00b050',
  ordem: 100,
  ativo: true,
  maps_to_db_tipo: '',
};

export default function TiposEventoEscalaAdmin() {
  const [tipos, setTipos] = useState<GTTipoEventoEscala[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [edits, setEdits] = useState<Record<string, Partial<GTTipoEventoEscala>>>({});

  const fetchTipos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithToken('/api/gestao-tripulantes/tipos-evento?all=1');
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Falha ao carregar tipos');
      setTipos(data.data || []);
      setEdits({});
      if (data.fallback) {
        toast('Usando tipos padrão — rode a migration SQL para persistir.', { icon: '⚠️' });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar tipos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTipos();
  }, [fetchTipos]);

  const getEdit = (tipo: GTTipoEventoEscala, key: keyof GTTipoEventoEscala) => {
    const override = edits[tipo.id]?.[key];
    return override !== undefined ? override : tipo[key];
  };

  const setEdit = (id: string, key: keyof GTTipoEventoEscala, value: unknown) => {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], [key]: value },
    }));
  };

  const handleSave = async (tipo: GTTipoEventoEscala) => {
    const patch = edits[tipo.id];
    if (!patch || Object.keys(patch).length === 0) {
      toast('Nenhuma alteração', { icon: 'ℹ️' });
      return;
    }
    if (String(tipo.id).startsWith('default-')) {
      toast.error('Rode a migration antes de editar tipos persistidos.');
      return;
    }
    setSavingId(tipo.id);
    try {
      const res = await fetchWithToken(`/api/gestao-tripulantes/tipos-evento/${tipo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Erro ao salvar');
      toast.success('Tipo atualizado');
      await fetchTipos();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleAtivo = async (tipo: GTTipoEventoEscala) => {
    if (String(tipo.id).startsWith('default-')) {
      toast.error('Rode a migration antes de alterar tipos.');
      return;
    }
    setSavingId(tipo.id);
    try {
      const res = await fetchWithToken(`/api/gestao-tripulantes/tipos-evento/${tipo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !tipo.ativo }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Erro ao atualizar');
      toast.success(tipo.ativo ? 'Tipo desativado' : 'Tipo ativado');
      await fetchTipos();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (tipo: GTTipoEventoEscala) => {
    if (String(tipo.id).startsWith('default-')) {
      toast.error('Rode a migration antes de excluir tipos.');
      return;
    }
    const msg = tipo.is_system
      ? `Desativar tipo de sistema "${tipo.display_code}"?`
      : `Excluir tipo customizado "${tipo.display_code}"?`;
    if (!confirm(msg)) return;

    setSavingId(tipo.id);
    try {
      const res = await fetchWithToken(`/api/gestao-tripulantes/tipos-evento/${tipo.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Erro ao remover');
      toast.success(data.message || 'Removido');
      await fetchTipos();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover');
    } finally {
      setSavingId(null);
    }
  };

  const handleCreate = async () => {
    if (!form.codigo.trim() || !form.label.trim()) {
      toast.error('Código e label são obrigatórios');
      return;
    }
    setCreating(true);
    try {
      const res = await fetchWithToken('/api/gestao-tripulantes/tipos-evento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          display_code: form.display_code || form.codigo.toUpperCase(),
          maps_to_db_tipo: form.maps_to_db_tipo || form.codigo.toLowerCase(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Erro ao criar');
      toast.success('Tipo criado');
      setForm(emptyForm);
      await fetchTipos();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500 gap-2">
        <FiRefreshCw className="animate-spin" /> Carregando tipos de evento...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Marcadores de Escala (Man Schedule)</h2>
        <p className="text-sm text-gray-500 mt-1">
          Personalize código, rótulo e cores dos eventos. Tipos de sistema (ON/FI/DBA/STB/OFF-C) podem ter cores alteradas;
          exclusão de sistema apenas desativa.
        </p>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left">Preview</th>
              <th className="px-3 py-2 text-left">Código</th>
              <th className="px-3 py-2 text-left">Display</th>
              <th className="px-3 py-2 text-left">Label</th>
              <th className="px-3 py-2 text-left">Fundo</th>
              <th className="px-3 py-2 text-left">Texto</th>
              <th className="px-3 py-2 text-left">Ordem</th>
              <th className="px-3 py-2 text-left">Ativo</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tipos.map((tipo) => {
              const bg = String(getEdit(tipo, 'bg_color') || '#e2efda');
              const tc = String(getEdit(tipo, 'text_color') || '#00b050');
              const display = String(getEdit(tipo, 'display_code') || tipo.display_code);
              const busy = savingId === tipo.id;
              return (
                <tr key={tipo.id} className={!tipo.ativo ? 'opacity-50 bg-gray-50' : ''}>
                  <td className="px-3 py-2">
                    <span
                      className="inline-block min-w-[48px] text-center font-bold px-1.5 py-0.5 border border-black text-[10px]"
                      style={{ backgroundColor: bg, color: tc }}
                    >
                      {display}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-700">{tipo.codigo}</td>
                  <td className="px-3 py-2">
                    <input
                      className="w-20 px-2 py-1 border rounded text-xs"
                      value={display}
                      onChange={(e) => setEdit(tipo.id, 'display_code', e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="w-40 px-2 py-1 border rounded text-xs"
                      value={String(getEdit(tipo, 'label') || '')}
                      onChange={(e) => setEdit(tipo.id, 'label', e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={bg}
                        onChange={(e) => setEdit(tipo.id, 'bg_color', e.target.value)}
                        className="w-8 h-7 border rounded cursor-pointer"
                      />
                      <input
                        className="w-20 px-1 py-1 border rounded text-[10px] font-mono"
                        value={bg}
                        onChange={(e) => setEdit(tipo.id, 'bg_color', e.target.value)}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={tc}
                        onChange={(e) => setEdit(tipo.id, 'text_color', e.target.value)}
                        className="w-8 h-7 border rounded cursor-pointer"
                      />
                      <input
                        className="w-20 px-1 py-1 border rounded text-[10px] font-mono"
                        value={tc}
                        onChange={(e) => setEdit(tipo.id, 'text_color', e.target.value)}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      className="w-16 px-2 py-1 border rounded text-xs"
                      value={Number(getEdit(tipo, 'ordem') ?? 0)}
                      onChange={(e) => setEdit(tipo.id, 'ordem', Number(e.target.value))}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => handleToggleAtivo(tipo)}
                      disabled={busy}
                      className="text-gray-600 hover:text-abz-blue disabled:opacity-50"
                      title={tipo.ativo ? 'Desativar' : 'Ativar'}
                    >
                      {tipo.ativo ? <FiEye /> : <FiEyeOff />}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleSave(tipo)}
                      disabled={busy || !edits[tipo.id]}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-abz-blue text-white rounded hover:bg-blue-700 disabled:opacity-40 mr-1"
                    >
                      <FiSave /> Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(tipo)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-40"
                    >
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border border-dashed border-gray-300 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <FiPlus /> Novo tipo customizado
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Código (storage)</label>
            <input
              className="w-full px-2 py-1.5 border rounded text-xs font-mono"
              placeholder="ex: med"
              value={form.codigo}
              onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Display na grade</label>
            <input
              className="w-full px-2 py-1.5 border rounded text-xs"
              placeholder="ex: MED"
              value={form.display_code}
              onChange={(e) => setForm((f) => ({ ...f, display_code: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Label</label>
            <input
              className="w-full px-2 py-1.5 border rounded text-xs"
              placeholder="Atestado médico"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ordem</label>
            <input
              type="number"
              className="w-full px-2 py-1.5 border rounded text-xs"
              value={form.ordem}
              onChange={(e) => setForm((f) => ({ ...f, ordem: Number(e.target.value) }))}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Cor fundo</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={form.bg_color}
                onChange={(e) => setForm((f) => ({ ...f, bg_color: e.target.value }))}
                className="w-10 h-8 border rounded"
              />
              <input
                className="flex-1 px-2 py-1 border rounded text-xs font-mono"
                value={form.bg_color}
                onChange={(e) => setForm((f) => ({ ...f, bg_color: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Cor texto</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={form.text_color}
                onChange={(e) => setForm((f) => ({ ...f, text_color: e.target.value }))}
                className="w-10 h-8 border rounded"
              />
              <input
                className="flex-1 px-2 py-1 border rounded text-xs font-mono"
                value={form.text_color}
                onChange={(e) => setForm((f) => ({ ...f, text_color: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex items-end">
            <span
              className="inline-block min-w-[56px] text-center font-bold px-2 py-1 border border-black text-xs"
              style={{ backgroundColor: form.bg_color, color: form.text_color }}
            >
              {form.display_code || form.codigo.toUpperCase() || '…'}
            </span>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-md text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              {creating ? <FiRefreshCw className="animate-spin" /> : <FiPlus />}
              Criar tipo
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={fetchTipos}
          className="flex items-center gap-2 px-3 py-2 text-sm border rounded-md text-gray-600 hover:bg-gray-50"
        >
          <FiRefreshCw /> Recarregar tipos
        </button>
      </div>
    </div>
  );
}
