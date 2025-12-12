'use client';

import React, { useState, useEffect } from 'react';
import { FiSave, FiPlus, FiTrash2, FiMail, FiAlertCircle, FiCheck, FiDollarSign } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useI18n } from '@/contexts/I18nContext';

interface ReimbursementEmailSettingsProps {
  initialSettings?: {
    enableDomainRule: boolean;
    recipients: string[];
    financeEmails?: string[];
  };
  onSave: (settings: {
    enableDomainRule: boolean;
    recipients: string[];
    financeEmails: string[];
  }) => Promise<boolean>;
}

const ReimbursementEmailSettings: React.FC<ReimbursementEmailSettingsProps> = ({
  initialSettings,
  onSave
}) => {
  const { t } = useI18n();
  const [enableDomainRule, setEnableDomainRule] = useState(initialSettings?.enableDomainRule || false);
  const [recipients, setRecipients] = useState<string[]>(initialSettings?.recipients || ['andresa.oliveira@groupabz.com', 'fiscal@groupabz.com']);
  const [financeEmails, setFinanceEmails] = useState<string[]>(initialSettings?.financeEmails || ['financeiro@groupabz.com']);
  const [newRecipient, setNewRecipient] = useState('');
  const [newFinanceEmail, setNewFinanceEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialSettings) {
      setEnableDomainRule(initialSettings.enableDomainRule);
      setRecipients(initialSettings.recipients || []);
      setFinanceEmails(initialSettings.financeEmails || ['financeiro@groupabz.com']);
    }
  }, [initialSettings]);

  const validateEmail = (email: string): boolean => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
  };

  const handleAddRecipient = () => {
    if (!newRecipient.trim()) {
      setError(t('components.oEmailNaoPodeEstarVazio', 'O email não pode estar vazio'));
      return;
    }

    if (!validateEmail(newRecipient)) {
      setError(t('components.emailInvalido', 'Email inválido'));
      return;
    }

    if (recipients.includes(newRecipient)) {
      setError(t('components.esteEmailJaEstaNaLista', 'Este email já está na lista'));
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

  const handleAddFinanceEmail = () => {
    if (!newFinanceEmail.trim()) {
      setError(t('components.oEmailNaoPodeEstarVazio', 'O email não pode estar vazio'));
      return;
    }

    if (!validateEmail(newFinanceEmail)) {
      setError(t('components.emailInvalido', 'Email inválido'));
      return;
    }

    if (financeEmails.includes(newFinanceEmail)) {
      setError(t('components.esteEmailJaEstaNaLista', 'Este email já está na lista'));
      return;
    }

    setFinanceEmails([...financeEmails, newFinanceEmail]);
    setNewFinanceEmail('');
    setError(null);
  };

  const handleRemoveFinanceEmail = (index: number) => {
    const newFinanceEmails = [...financeEmails];
    newFinanceEmails.splice(index, 1);
    setFinanceEmails(newFinanceEmails);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const settings = {
        enableDomainRule,
        recipients,
        financeEmails
      };

      // Tentar salvar até 3 vezes em caso de erro
      let success = false;
      let attempts = 0;
      let lastError = null;

      while (!success && attempts < 3) {
        attempts++;
        try {
          console.log(t('components.tentativaAttemptsDeSalvarConfiguracoes', `Tentativa ${attempts} de salvar configurações`));
          success = await onSave(settings);

          if (success) {
            console.log(t('components.configuracoesSalvasComSucesso', 'Configurações salvas com sucesso'));
            break;
          } else {
            console.error(`Falha na tentativa ${attempts}`);
            if (attempts < 3) await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (err) {
          lastError = err;
          console.error(`Erro na tentativa ${attempts}:`, err);
          if (attempts < 3) await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (success) {
        toast.success(t('components.configuracoesDeEmailDeReembolsoSalvasComSucesso', 'Configurações de email de reembolso salvas com sucesso!'));
      } else {
        console.error('Todas as tentativas falharam');
        toast.error(t('components.erroAoSalvarConfiguracoes', 'Erro ao salvar configurações'));

        if (lastError) {
          setError(t('components.erroAoSalvarConfiguracoesErrormessageTenteNovament', 'Erro ao salvar configurações. Tente novamente.'));
        } else {
          setError(t('components.erroAoSalvarConfiguracoesTenteNovamente', 'Erro ao salvar configurações. Tente novamente.'));
        }

        toast.error(
          t('components.erroAoSalvarConfiguracoesVerifiqueADocumentacaoPar', 'Erro ao salvar configurações. Verifique a documentação para mais informações.'),
          { duration: 6000 }
        );
      }
    } catch (error) {
      console.error(t('components.erroAoSalvarConfiguracoes', 'Erro ao salvar configurações'), error);
      toast.error(t('components.erroAoSalvarConfiguracoes', 'Erro ao salvar configurações'));
      setError(t('components.erroAoSalvarConfiguracoesErrormessageTenteNovament', 'Erro ao salvar configurações. Tente novamente.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-abz-blue mb-4 flex items-center">
        <FiMail className="mr-2" /> {t('admin.reimbursementEmailSettings', 'Configurações de Email de Reembolso')}
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center">
          <FiAlertCircle className="mr-2" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Seção: Regra de Domínio */}
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="enableDomainRule"
              checked={enableDomainRule}
              onChange={(e) => setEnableDomainRule(e.target.checked)}
              className="h-4 w-4 text-abz-blue focus:ring-abz-blue border-gray-300 rounded"
            />
            <label htmlFor="enableDomainRule" className="ml-2 block text-sm text-gray-900">
              {t('admin.enableDomainRule', 'Ativar regra especial para emails com domínio @groupabz.com')}
            </label>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            {t('admin.domainRuleDescription', 'Quando ativada, esta regra enviará automaticamente os formulários de reembolso para os emails adicionais abaixo quando o solicitante tiver um email com o domínio @groupabz.com.')}
          </p>
        </div>

        {/* Seção: Destinatários de Confirmação */}
        <div className="mb-6">
          <h3 className="text-md font-medium text-gray-900 mb-2">
            {t('admin.confirmationRecipients', 'Destinatários de Confirmação')}
          </h3>
          <p className="text-sm text-gray-500 mb-3">
            {t('admin.confirmationRecipientsDescription', 'Estes emails receberão cópia dos formulários de reembolso quando solicitados.')}
          </p>

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
              <p className="text-sm text-gray-500 italic">
                {t('admin.noRecipientsConfigured', 'Nenhum destinatário adicional configurado')}
              </p>
            )}
          </div>

          <div className="flex items-center">
            <input
              type="email"
              value={newRecipient}
              onChange={(e) => setNewRecipient(e.target.value)}
              placeholder={t('admin.addNewEmail', 'Adicionar novo email')}
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

        {/* Seção: Emails do Financeiro (NOVA) */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-md font-medium text-gray-900 mb-2 flex items-center">
            <FiDollarSign className="mr-2 text-yellow-600" />
            {t('admin.financeEmailRecipients', 'Emails do Departamento Financeiro')}
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            {t('admin.financeEmailDescription', 'Estes emails serão notificados quando um reembolso for aprovado e estiver aguardando pagamento.')}
          </p>

          <div className="space-y-2 mb-4">
            {financeEmails.map((email, index) => (
              <div key={index} className="flex items-center justify-between bg-white p-2 rounded-md border border-yellow-200">
                <span className="text-sm">{email}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFinanceEmail(index)}
                  className="text-red-500 hover:text-red-700"
                  disabled={financeEmails.length === 1}
                  title={financeEmails.length === 1 ? t('admin.atLeastOneFinanceEmail', 'É necessário pelo menos um email do financeiro') : ''}
                >
                  <FiTrash2 className={financeEmails.length === 1 ? 'opacity-30' : ''} />
                </button>
              </div>
            ))}

            {financeEmails.length === 0 && (
              <p className="text-sm text-red-500 italic">
                {t('admin.noFinanceEmailConfigured', 'Atenção: Nenhum email do financeiro configurado!')}
              </p>
            )}
          </div>

          <div className="flex items-center">
            <input
              type="email"
              value={newFinanceEmail}
              onChange={(e) => setNewFinanceEmail(e.target.value)}
              placeholder={t('admin.addFinanceEmail', 'Adicionar email do financeiro')}
              className="flex-1 px-3 py-2 border border-yellow-300 rounded-l-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
            />
            <button
              type="button"
              onClick={handleAddFinanceEmail}
              className="px-4 py-2 border border-transparent rounded-r-md shadow-sm text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              <FiPlus />
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-abz-blue hover:bg-abz-blue-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-abz-blue disabled:opacity-50"
          >
            {isSaving ? (
              <>{t('common.saving', 'Salvando...')}</>
            ) : (
              <>
                <FiSave className="mr-2" /> {t('common.saveSettings', 'Salvar Configurações')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReimbursementEmailSettings;

