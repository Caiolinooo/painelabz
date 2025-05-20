'use client';

import React, { useState } from 'react';
import { FiSave, FiPlus, FiTrash2, FiMail, FiAlertCircle, FiCheck, FiX } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

interface StandaloneUserReimbursementSettingsProps {
  email: string;
  onClose?: () => void;
}

const StandaloneUserReimbursementSettings: React.FC<StandaloneUserReimbursementSettingsProps> = ({
  email,
  onClose
}) => {
  const [enabled, setEnabled] = useState(false);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newRecipient, setNewRecipient] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
    setSuccess(null);

    try {
      const settings = {
        enabled,
        recipients
      };

      // Salvar diretamente via API sem token
      const response = await fetch('/api/users/reimbursement-settings-local', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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

      setSuccess('Configurações de email de reembolso salvas com sucesso');
      toast.success('Configurações de email de reembolso salvas com sucesso');
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

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md flex items-center">
          <FiCheck className="mr-2" /> {success}
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

export default StandaloneUserReimbursementSettings;
