'use client';

import React, { useState, useEffect } from 'react';
import { FiSave, FiPlus, FiTrash2, FiMail, FiAlertCircle, FiDollarSign, FiUsers, FiGlobe } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useI18n } from '@/contexts/I18nContext';
import {
  DEFAULT_APPROVAL_RECIPIENTS,
  DEFAULT_EXTERNAL_RECIPIENTS,
  DEFAULT_FINANCE_EMAILS,
} from '@/lib/reimbursement-email-routing';

interface ReimbursementEmailSettingsProps {
  initialSettings?: {
    enableDomainRule: boolean;
    recipients: string[];
    externalRecipients?: string[];
    financeEmails?: string[];
  };
  onSave: (settings: {
    enableDomainRule: boolean;
    recipients: string[];
    externalRecipients: string[];
    financeEmails: string[];
  }) => Promise<boolean>;
}

type EmailListKey = 'recipients' | 'externalRecipients' | 'financeEmails';

const ReimbursementEmailSettings: React.FC<ReimbursementEmailSettingsProps> = ({
  initialSettings,
  onSave
}) => {
  const { t } = useI18n();
  const [enableDomainRule, setEnableDomainRule] = useState(initialSettings?.enableDomainRule ?? true);
  const [recipients, setRecipients] = useState<string[]>(initialSettings?.recipients || [...DEFAULT_APPROVAL_RECIPIENTS]);
  const [externalRecipients, setExternalRecipients] = useState<string[]>(
    initialSettings?.externalRecipients || [...DEFAULT_EXTERNAL_RECIPIENTS]
  );
  const [financeEmails, setFinanceEmails] = useState<string[]>(initialSettings?.financeEmails || [...DEFAULT_FINANCE_EMAILS]);
  const [newEmails, setNewEmails] = useState<Record<EmailListKey, string>>({
    recipients: '',
    externalRecipients: '',
    financeEmails: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialSettings) {
      setEnableDomainRule(initialSettings.enableDomainRule);
      setRecipients(initialSettings.recipients || [...DEFAULT_APPROVAL_RECIPIENTS]);
      setExternalRecipients(initialSettings.externalRecipients || [...DEFAULT_EXTERNAL_RECIPIENTS]);
      setFinanceEmails(initialSettings.financeEmails || [...DEFAULT_FINANCE_EMAILS]);
    }
  }, [initialSettings]);

  const validateEmail = (email: string): boolean => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
  };

  const getList = (key: EmailListKey): string[] => {
    switch (key) {
      case 'recipients':
        return recipients;
      case 'externalRecipients':
        return externalRecipients;
      case 'financeEmails':
        return financeEmails;
      default: {
        const _exhaustive: never = key;
        return _exhaustive;
      }
    }
  };

  const setList = (key: EmailListKey, next: string[]) => {
    switch (key) {
      case 'recipients':
        setRecipients(next);
        break;
      case 'externalRecipients':
        setExternalRecipients(next);
        break;
      case 'financeEmails':
        setFinanceEmails(next);
        break;
      default: {
        const _exhaustive: never = key;
        return _exhaustive;
      }
    }
  };

  const handleAddEmail = (key: EmailListKey) => {
    const value = newEmails[key].trim();
    if (!value) {
      setError(t('components.oEmailNaoPodeEstarVazio', 'O email não pode estar vazio'));
      return;
    }

    if (!validateEmail(value)) {
      setError(t('components.emailInvalido', 'Email inválido'));
      return;
    }

    const list = getList(key);
    if (list.includes(value)) {
      setError(t('components.esteEmailJaEstaNaLista', 'Este email já está na lista'));
      return;
    }

    setList(key, [...list, value]);
    setNewEmails({ ...newEmails, [key]: '' });
    setError(null);
  };

  const handleRemoveEmail = (key: EmailListKey, index: number) => {
    const list = [...getList(key)];
    if (key === 'financeEmails' && list.length <= 1) {
      setError(t('admin.atLeastOneFinanceEmail', 'É necessário pelo menos um email do financeiro'));
      return;
    }
    list.splice(index, 1);
    setList(key, list);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const settings = {
        enableDomainRule,
        recipients,
        externalRecipients,
        financeEmails
      };

      let success = false;
      let attempts = 0;
      let lastError = null;

      while (!success && attempts < 3) {
        attempts++;
        try {
          success = await onSave(settings);
          if (success) break;
          if (attempts < 3) await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err) {
          lastError = err;
          if (attempts < 3) await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (success) {
        toast.success(t('components.configuracoesDeEmailDeReembolsoSalvasComSucesso', 'Configurações de email de reembolso salvas com sucesso!'));
      } else {
        toast.error(t('components.erroAoSalvarConfiguracoes', 'Erro ao salvar configurações'));
        setError(
          lastError
            ? t('components.erroAoSalvarConfiguracoesErrormessageTenteNovament', 'Erro ao salvar configurações. Tente novamente.')
            : t('components.erroAoSalvarConfiguracoesTenteNovamente', 'Erro ao salvar configurações. Tente novamente.')
        );
      }
    } catch (err) {
      console.error(t('components.erroAoSalvarConfiguracoes', 'Erro ao salvar configurações'), err);
      toast.error(t('components.erroAoSalvarConfiguracoes', 'Erro ao salvar configurações'));
      setError(t('components.erroAoSalvarConfiguracoesErrormessageTenteNovament', 'Erro ao salvar configurações. Tente novamente.'));
    } finally {
      setIsSaving(false);
    }
  };

  const renderEmailList = (opts: {
    key: EmailListKey;
    title: string;
    description: string;
    icon: React.ReactNode;
    emptyText: string;
    placeholder: string;
    accentClass?: string;
    inputBorderClass?: string;
    buttonClass?: string;
    minOne?: boolean;
  }) => {
    const list = getList(opts.key);
    return (
      <div className={`mb-6 ${opts.accentClass || ''}`}>
        <h3 className="text-md font-medium text-gray-900 mb-2 flex items-center">
          {opts.icon}
          {opts.title}
        </h3>
        <p className="text-sm text-gray-500 mb-3">{opts.description}</p>

        <div className="space-y-2 mb-4">
          {list.map((email, index) => (
            <div
              key={`${opts.key}-${email}-${index}`}
              className="flex items-center justify-between bg-gray-50 p-2 rounded-md border border-gray-100"
            >
              <span className="text-sm">{email}</span>
              <button
                type="button"
                onClick={() => handleRemoveEmail(opts.key, index)}
                className="text-red-500 hover:text-red-700"
                disabled={opts.minOne && list.length === 1}
                title={opts.minOne && list.length === 1 ? t('admin.atLeastOneFinanceEmail', 'É necessário pelo menos um email do financeiro') : ''}
              >
                <FiTrash2 className={opts.minOne && list.length === 1 ? 'opacity-30' : ''} />
              </button>
            </div>
          ))}

          {list.length === 0 && (
            <p className="text-sm text-gray-500 italic">{opts.emptyText}</p>
          )}
        </div>

        <div className="flex items-center">
          <input
            type="email"
            value={newEmails[opts.key]}
            onChange={(e) => setNewEmails({ ...newEmails, [opts.key]: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddEmail(opts.key);
              }
            }}
            placeholder={opts.placeholder}
            className={`flex-1 px-3 py-2 border rounded-l-md shadow-sm focus:outline-none focus:ring-abz-blue focus:border-abz-blue ${opts.inputBorderClass || 'border-gray-300'}`}
          />
          <button
            type="button"
            onClick={() => handleAddEmail(opts.key)}
            className={opts.buttonClass || 'px-4 py-2 border border-transparent rounded-r-md shadow-sm text-sm font-medium text-white bg-abz-blue hover:bg-abz-blue-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-abz-blue'}
          >
            <FiPlus />
          </button>
        </div>
      </div>
    );
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
          <p className="text-sm text-gray-500">
            {t(
              'admin.domainRuleDescription',
              'Com a regra ativa, solicitantes @groupabz.com usam a lista de aprovadores internos. Outros domínios usam a lista de aprovadores externos. Após qualquer aprovação, o financeiro/fiscal recebe o email para marcar como pago.'
            )}
          </p>
        </div>

        {renderEmailList({
          key: 'recipients',
          title: t('admin.groupAbzApprovalRecipients', 'Aprovadores @groupabz.com'),
          description: t(
            'admin.groupAbzApprovalRecipientsDescription',
            'Recebem a solicitação inicial quando o solicitante tem email @groupabz.com. Adicione quantos emails precisar (ex.: Andresa).'
          ),
          icon: <FiUsers className="mr-2 text-abz-blue" />,
          emptyText: t('admin.noRecipientsConfigured', 'Nenhum aprovador interno configurado'),
          placeholder: t('admin.addNewEmail', 'Adicionar novo email'),
        })}

        {renderEmailList({
          key: 'externalRecipients',
          title: t('admin.externalApprovalRecipients', 'Aprovadores (outros domínios)'),
          description: t(
            'admin.externalApprovalRecipientsDescription',
            'Recebem a solicitação inicial quando o solicitante NÃO tem email @groupabz.com. Adicione quantos emails precisar.'
          ),
          icon: <FiGlobe className="mr-2 text-emerald-600" />,
          emptyText: t('admin.noExternalRecipientsConfigured', 'Nenhum aprovador externo configurado'),
          placeholder: t('admin.addExternalEmail', 'Adicionar email para outros domínios'),
          accentClass: 'p-4 bg-emerald-50 border border-emerald-200 rounded-lg',
          inputBorderClass: 'border-emerald-300',
          buttonClass: 'px-4 py-2 border border-transparent rounded-r-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500',
        })}

        {renderEmailList({
          key: 'financeEmails',
          title: t('admin.financeEmailRecipients', 'Emails do financeiro / fiscal (pagamento)'),
          description: t(
            'admin.financeEmailDescription',
            'Recebem o email após a aprovação, para efetuar o pagamento e alterar o status para pago. Independente do domínio do solicitante.'
          ),
          icon: <FiDollarSign className="mr-2 text-yellow-600" />,
          emptyText: t('admin.noFinanceEmailConfigured', 'Atenção: Nenhum email do financeiro configurado!'),
          placeholder: t('admin.addFinanceEmail', 'Adicionar email do financeiro'),
          accentClass: 'p-4 bg-yellow-50 border border-yellow-200 rounded-lg',
          inputBorderClass: 'border-yellow-300',
          buttonClass: 'px-4 py-2 border border-transparent rounded-r-md shadow-sm text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500',
          minOne: true,
        })}

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
