'use client';

import React, { useEffect, useState } from 'react';
import { 
  getAllModuleConfigs, 
  updateModuleConfig, 
  getMicrosoftWritePermissions,
  updateMicrosoftWritePermissions 
} from '@/lib/ia/config/manager';
import type { IAModuleConfig, IAWritePermissions } from '@/types/ia-global';

interface ConfigPanelProps {
  token: string;
}

export default function IAPermissionConfigPanel({ token }: ConfigPanelProps) {
  const [modules, setModules] = useState<IAModuleConfig[]>([]);
  const [msPermissions, setMsPermissions] = useState<IAWritePermissions['microsoft']>({
    email: false,
    calendar: false,
    teams: false,
    onedrive: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const configs = await getAllModuleConfigs();
      setModules(Array.isArray(configs) ? configs : []);
      
      const msPerms = await getMicrosoftWritePermissions();
      setMsPermissions(msPerms);
    } catch (error) {
      console.error('Error loading configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleModuleToggle = async (moduleKey: string, field: 'allowWrite' | 'allowRead', value: boolean) => {
    setSaving(true);
    setMessage(null);

    try {
      const module = modules.find(m => m.key === moduleKey);
      if (!module) return;

      await updateModuleConfig(moduleKey, {
        ...module,
        [field]: value,
      });

      await loadConfigs();
      setMessage({ type: 'success', text: 'Configuração salva!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao salvar' });
    } finally {
      setSaving(false);
    }
  };

  const handleRoleToggle = async (moduleKey: string, role: string, checked: boolean) => {
    setSaving(true);
    setMessage(null);

    try {
      const module = modules.find(m => m.key === moduleKey);
      if (!module) return;

      let newRoles = [...module.writeRoles];
      if (checked) {
        if (!newRoles.includes(role as any)) newRoles.push(role as any);
      } else {
        newRoles = newRoles.filter(r => r !== role);
      }

      await updateModuleConfig(moduleKey, {
        writeRoles: newRoles,
      });

      await loadConfigs();
      setMessage({ type: 'success', text: 'Roles atualizados!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao salvar' });
    } finally {
      setSaving(false);
    }
  };

  const handleMsPermissionToggle = async (perm: keyof typeof msPermissions) => {
    setSaving(true);
    setMessage(null);

    try {
      const newPerms = { ...msPermissions, [perm]: !msPermissions[perm] };
      await updateMicrosoftWritePermissions(newPerms);
      setMsPermissions(newPerms);
      setMessage({ type: 'success', text: 'Permissão Microsoft atualizada!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao salvar' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>⚡</span> Permissões do Agente IA
          </h2>
          <p className="text-purple-100 text-sm mt-1">
            Configure quais ações o assistente pode executar em cada módulo
          </p>
        </div>

        <div className="p-6 space-y-8">
          {message && (
            <div className={`text-sm px-4 py-3 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message.type === 'success' ? '✅' : '❌'} {message.text}
            </div>
          )}

          {/* Módulos */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Permissões por Módulo</h3>
            <div className="grid gap-4">
              {modules.filter(m => m.key !== 'admin' && m.key !== 'microsoft').map(module => (
                <div key={module.key} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{module.icon}</span>
                      <div>
                        <h4 className="font-medium text-gray-900">{module.name}</h4>
                        <p className="text-sm text-gray-500">{module.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-sm text-gray-600">Leitura</span>
                        <input
                          type="checkbox"
                          checked={module.allowRead}
                          onChange={(e) => handleModuleToggle(module.key, 'allowRead', e.target.checked)}
                          disabled={saving}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-sm text-gray-600">Escrita</span>
                        <input
                          type="checkbox"
                          checked={module.allowWrite}
                          onChange={(e) => handleModuleToggle(module.key, 'allowWrite', e.target.checked)}
                          disabled={saving}
                          className="w-4 h-4 text-purple-600 rounded"
                        />
                      </label>
                    </div>
                  </div>

                  {module.allowWrite && (
                    <div className="pl-12 flex items-center gap-4">
                      <span className="text-sm text-gray-500">Roles com acesso:</span>
                      {['ADMIN', 'GERENTE', 'USER'].map(role => (
                        <label key={role} className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={module.writeRoles.includes(role as any)}
                            onChange={(e) => handleRoleToggle(module.key, role, e.target.checked)}
                            disabled={saving}
                            className="w-3 h-3 text-purple-600 rounded"
                          />
                          <span className="text-sm text-gray-600">{role}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Microsoft Graph */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Microsoft Graph - Permissões de Escrita</h3>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-sm text-gray-500 mb-4">
                Configure quais APIs Microsoft o agente pode usar para escrita
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(msPermissions).map(([perm, enabled]) => (
                  <label key={perm} className="flex items-center gap-2 cursor-pointer p-3 bg-white rounded-lg border">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => handleMsPermissionToggle(perm as keyof typeof msPermissions)}
                      disabled={saving}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {perm === 'onedrive' ? 'OneDrive' : perm}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <span className="text-sm text-gray-400">
              {saving ? 'Salvando...' : 'Alterações aplicadas automaticamente'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
