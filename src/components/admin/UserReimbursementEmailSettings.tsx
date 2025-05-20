'use client';

import React, { useState, useEffect } from 'react';
import { FiSave, FiPlus, FiTrash2, FiMail, FiAlertCircle, FiCheck, FiX } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

interface UserReimbursementEmailSettingsProps {
  userId?: string;
  email?: string;
  initialSettings?: {
    enabled: boolean;
    recipients: string[];
  };
  onSave?: (settings: {
    enabled: boolean;
    recipients: string[];
  }) => void;
  onClose?: () => void;
}

const UserReimbursementEmailSettings: React.FC<UserReimbursementEmailSettingsProps> = ({
  userId,
  email,
  initialSettings,
  onSave,
  onClose
}) => {
  const [enabled, setEnabled] = useState(initialSettings?.enabled || false);
  const [recipients, setRecipients] = useState<string[]>(initialSettings?.recipients || []);
  const [newRecipient, setNewRecipient] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialSettings) {
      setEnabled(initialSettings.enabled);
      setRecipients(initialSettings.recipients || []);
    } else if (userId || email) {
      fetchSettings();
    }
  }, [initialSettings, userId, email]);

  const fetchSettings = async () => {
    try {
      setIsSaving(true);
      setError(null);

      // Construir URL com parâmetros
      let url = '/api/users/reimbursement-settings-local?';
      if (userId) url += `userId=${encodeURIComponent(userId)}`;
      else if (email) url += `email=${encodeURIComponent(email)}`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao carregar configurações');
      }

      const data = await response.json();
      console.log('Configurações de email de reembolso do usuário carregadas:', data);

      if (data.reimbursement_email_settings) {
        setEnabled(data.reimbursement_email_settings.enabled || false);
        setRecipients(data.reimbursement_email_settings.recipients || []);
      }
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
      setError('Erro ao carregar configurações. Por favor, tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const validateEmail = (email: string): boolean => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
  };

  const handleAddRecipient = () => {
    if (!newRecipient.trim()) {
      setError('O email não pode estar vazio');
      return;
    }

    if (!validateEmail(newRecipient)) {
      setError('Email inválido');
      return;
    }

    if (recipients.includes(newRecipient)) {
      setError('Este email já está na lista');
      return;
    }

    setRecipients([...recipients, newRecipient]);
    setNewRecipient('');
    setError(null);
  };

  const handleRemoveRecipient = (index: number) => {
    const newRecipients = [...recipients];
    newRecipients.splice(index, 1);
    setRecipients(newRecipients);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const settings = {
        enabled,
        recipients
      };

      // Se onSave for fornecido, use-o
      if (onSave) {
        onSave(settings);
        toast.success('Configurações de email de reembolso salvas com sucesso');
        if (onClose) onClose();
        return;
      }

      // Caso contrário, salve diretamente via API
      const response = await fetch('/api/users/reimbursement-settings-local', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          email,
          enabled,
          recipients
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro ao salvar configurações:', errorData.error);
        throw new Error(errorData.error || 'Erro ao salvar configurações');
      }

      toast.success('Configurações de email de reembolso salvas com sucesso');
      if (onClose) onClose();
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
      setError('Erro ao salvar configurações. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-abz-blue flex items-center">
          <FiMail className="mr-2" /> Configurações de Email de Reembolso
        </h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FiX className="h-5 w-5" />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center">
          <FiAlertCircle className="mr-2" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="enableUserEmailSettings"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 text-abz-blue focus:ring-abz-blue border-gray-300 rounded"
            />
            <label htmlFor="enableUserEmailSettings" className="ml-2 block text-sm text-gray-900">
              Ativar configuração especial de email para este usuário
            </label>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            Quando ativada, as solicitações de reembolso deste usuário serão enviadas para os emails adicionais abaixo.
          </p>
        </div>

        {enabled && (
          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-900 mb-2">Destinatários Adicionais</h3>

            <div className="space-y-2 mb-4">
              {recipients.map((recipient, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                  <span className="text-sm">{recipient}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveRecipient(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              ))}

              {recipients.length === 0 && (
                <p className="text-sm text-gray-500 italic">Nenhum destinatário adicional configurado</p>
              )}
            </div>

            <div className="flex items-center">
              <input
                type="email"
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                placeholder="Adicionar novo email"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-abz-blue focus:border-abz-blue"
              />
              <button
                type="button"
                onClick={handleAddRecipient}
                className="px-4 py-2 border border-transparent rounded-r-md shadow-sm text-sm font-medium text-white bg-abz-blue hover:bg-abz-blue-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-abz-blue"
              >
                <FiPlus />
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-abz-blue hover:bg-abz-blue-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-abz-blue disabled:opacity-50"
          >
            {isSaving ? (
              <>Salvando...</>
            ) : (
              <>
                <FiSave className="mr-2" /> Salvar Configurações
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserReimbursementEmailSettings;
