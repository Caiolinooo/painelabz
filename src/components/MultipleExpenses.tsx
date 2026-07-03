'use client';

import React, { useState } from 'react';
import { FiPlus, FiTrash2, FiDollarSign, FiAlertTriangle, FiInfo } from 'react-icons/fi';
import { useI18n } from '@/contexts/I18nContext';
import { SelectField, TextArea } from './FormFields';
import CurrencyInput from './CurrencyInput';
import FileUploader, { UploadedFile } from './FileUploader';
import {
  EXPENSE_TYPE_LIMITS,
  EXPENSE_TYPES,
  parseCurrencyValue,
  validateExpenseValue,
  formatBRLValue,
  MAX_TOTAL_REIMBURSEMENT
} from '@/lib/reimbursementValidation';

interface Expense {
  id: string;
  tipoReembolso: string;
  descricao: string;
  valor: string;
  comprovantes: UploadedFile[];
}

interface MultipleExpensesProps {
  expenses: Expense[];
  onChange: (expenses: Expense[]) => void;
  currency: string;
  onCurrencyChange?: (currency: string) => void;
  errors?: Record<string, string | string[]>;
}

const MultipleExpenses: React.FC<MultipleExpensesProps> = ({
  expenses,
  onChange,
  currency,
  onCurrencyChange,
  errors = {}
}) => {
  const { t } = useI18n();
  const locale = t('locale.code') === 'en-US' ? 'en-US' : 'pt-BR';

  // Acompanha quais despesas o usuário confirmou como "valor alto intencional"
  // (para suprimir o aviso persistente quando o usuário afirma que o valor
  // está correto, mas continua exibindo validações de limite máximo)
  const [confirmedHighValues, setConfirmedHighValues] = useState<Record<string, boolean>>({});

  const addExpense = () => {
    const newExpense: Expense = {
      id: Math.random().toString(36).substr(2, 9),
      tipoReembolso: 'alimentacao',
      descricao: '',
      valor: '',
      comprovantes: []
    };
    onChange([...expenses, newExpense]);
  };

  const removeExpense = (id: string) => {
    if (expenses.length > 1) {
      onChange(expenses.filter(expense => expense.id !== id));
      setConfirmedHighValues(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const updateExpense = (id: string, field: keyof Expense, value: any) => {
    onChange(expenses.map(expense =>
      expense.id === id ? { ...expense, [field]: value } : expense
    ));
    // Se mudou o tipo ou o valor, resetar a confirmação de valor alto
    if (field === 'tipoReembolso' || field === 'valor') {
      setConfirmedHighValues(prev => ({ ...prev, [id]: false }));
    }
  };

  const confirmHighValue = (id: string) => {
    setConfirmedHighValues(prev => ({ ...prev, [id]: true }));
  };

  const getTotalValue = () => {
    return expenses.reduce((total, expense) => {
      const value = parseCurrencyValue(expense.valor);
      return total + value;
    }, 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const totalValue = getTotalValue();
  const totalExceedsMax = totalValue > MAX_TOTAL_REIMBURSEMENT;

  // Labels traduzidos para os tipos de despesa
  const getExpenseTypeLabel = (value: string): string => {
    if (locale === 'en-US') {
      const enLabels: Record<string, string> = {
        alimentacao: 'Food',
        transporte: 'Transportation',
        hospedagem: 'Accommodation',
        combustivel: 'Fuel',
        material: 'Office Materials',
        outros: 'Others'
      };
      return enLabels[value] || value;
    }
    const limit = EXPENSE_TYPE_LIMITS[value];
    return limit ? limit.label : value;
  };

  const expenseOptions = EXPENSE_TYPES.map(type => ({
    value: type.value,
    label: getExpenseTypeLabel(type.value)
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-800">
          {t('reimbursement.form.expenses', 'Despesas')}
        </h3>
        <div className="flex items-center space-x-4">
          <div className={`text-sm ${totalExceedsMax ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
            Total: <span className="font-semibold">{formatCurrency(totalValue)}</span>
            {totalExceedsMax && (
              <span className="block text-xs mt-1">
                Excede o máximo de {formatCurrency(MAX_TOTAL_REIMBURSEMENT)}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={addExpense}
            className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <FiPlus className="mr-1" />
            {t('common.add', 'Adicionar')}
          </button>
        </div>
      </div>

      {/* Aviso educativo sobre o formato de entrada de valores */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800 flex items-start">
        <FiInfo className="mr-2 mt-0.5 flex-shrink-0" />
        <div>
          <strong>Dica:</strong> Digite o valor normalmente usando vírgula para os centavos.
          Não use pontos para centavos.
        </div>
      </div>

      {expenses.map((expense, index) => {
        const validation = validateExpenseValue(expense.tipoReembolso, expense.valor);
        const showWarning = validation.warning && !confirmedHighValues[expense.id];
        const limit = validation.limit;

        return (
          <div
            key={expense.id}
            className="bg-gray-50 p-4 rounded-lg border border-gray-200"
            style={{ opacity: 1, visibility: 'visible' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-medium text-gray-700 flex items-center">
                <FiDollarSign className="mr-2" />
                {t('reimbursement.form.expense', 'Despesa')} {index + 1}
              </h4>
              {expenses.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeExpense(expense.id)}
                  className="flex items-center px-2 py-1 text-sm text-red-600 hover:text-red-800 transition-colors"
                >
                  <FiTrash2 className="mr-1" />
                  {t('common.remove', 'Remover')}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <SelectField
                  id={`tipoReembolso-${expense.id}`}
                  label={t('reimbursement.form.expenseType')}
                  value={expense.tipoReembolso}
                  onChange={(e) => {
                    updateExpense(expense.id, 'tipoReembolso', e.target.value);
                  }}
                  options={expenseOptions}
                  error={typeof errors[`expenses.${index}.tipoReembolso`] === 'string' ? errors[`expenses.${index}.tipoReembolso`] as string : Array.isArray(errors[`expenses.${index}.tipoReembolso`]) ? errors[`expenses.${index}.tipoReembolso`][0] : undefined}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {limit.description}. Limite máximo: {formatCurrency(limit.max)}
                </p>
              </div>

              <div>
                <CurrencyInput
                  id={`valor-${expense.id}`}
                  label={t('reimbursement.form.amount')}
                  value={expense.valor}
                  onChange={(value) => updateExpense(expense.id, 'valor', value)}
                  currency={currency as any}
                  onCurrencyChange={onCurrencyChange}
                  error={typeof errors[`expenses.${index}.valor`] === 'string' ? errors[`expenses.${index}.valor`] as string : Array.isArray(errors[`expenses.${index}.valor`]) ? errors[`expenses.${index}.valor`][0] : undefined}
                  required
                />
                {/* Aviso inteligente quando o valor excede o limite máximo */}
                {!validation.valid && validation.errorMessage && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-300 rounded-md text-xs text-red-700 flex items-start">
                    <FiAlertTriangle className="mr-1 mt-0.5 flex-shrink-0" />
                    <span>{validation.errorMessage}</span>
                  </div>
                )}
                {/* Aviso amigável quando o valor está alto, mas dentro do limite */}
                {showWarning && validation.valid && validation.warningMessage && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-300 rounded-md text-xs text-yellow-800 flex items-start justify-between gap-2">
                    <div className="flex items-start">
                      <FiAlertTriangle className="mr-1 mt-0.5 flex-shrink-0 text-yellow-600" />
                      <span>{validation.warningMessage}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => confirmHighValue(expense.id)}
                      className="flex-shrink-0 px-2 py-1 text-xs bg-yellow-200 hover:bg-yellow-300 rounded font-medium transition-colors"
                    >
                      Confirmar valor
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4">
              <TextArea
                id={`descricao-${expense.id}`}
                label={t('reimbursement.form.description')}
                value={expense.descricao}
                onChange={(e) => {
                  updateExpense(expense.id, 'descricao', e.target.value);
                }}
                placeholder={t('reimbursement.form.descriptionPlaceholder')}
                error={typeof errors[`expenses.${index}.descricao`] === 'string' ? errors[`expenses.${index}.descricao`] as string : Array.isArray(errors[`expenses.${index}.descricao`]) ? errors[`expenses.${index}.descricao`][0] : undefined}
                required
                rows={3}
              />
            </div>

            <div className="mt-4">
              <FileUploader
                files={expense.comprovantes}
                onFilesChange={(files) => updateExpense(expense.id, 'comprovantes', files)}
                maxFiles={5}
                maxSizeInMB={10}
                acceptedFileTypes={['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MultipleExpenses;
