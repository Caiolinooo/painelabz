'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSend, FiDownload, FiMail, FiCloud, FiMessageSquare } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Currency } from '@/lib/currencyConverter';
import { useI18n } from '@/contexts/I18nContext';

import { formSchema, refinedFormSchema, FormValues, validatePixKey } from '@/lib/schema';
import { formatCurrency, formatPhone, formatCPF, generateProtocol } from '@/lib/utils';
import { InputField, TextArea, SelectField, RadioGroup } from './FormFields';
import PaymentMethodRadio from './PaymentMethodRadio';
import DescriptionField from './DescriptionField';
import CurrencyInput from './CurrencyInput';

import FileUploader from './FileUploader';
import PdfViewer from './PdfViewer';
import ThankYouModal from './ThankYouModal';
import ContactPopup from './ContactPopup';

// Animation variants
const formContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      when: 'beforeChildren',
      staggerChildren: 0.1,
      duration: 0.3
    }
  }
};

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 }
  }
};

// Estilo para garantir que os elementos sejam sempre visíveis
const alwaysVisibleStyle = { opacity: 1 };

export default function ReimbursementForm() {
  const { t } = useI18n();
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [protocol, setProtocol] = useState('');
  const [showPdfViewer, setShowPdfViewer] = useState(true);
  const [showThankYou, setShowThankYou] = useState(false);
  const [showContactPopup, setShowContactPopup] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setValue,
    trigger,
    reset,
    setError,
    clearErrors
  } = useForm<FormValues>({
    resolver: zodResolver(refinedFormSchema),
    defaultValues: {
      nome: '',
      email: '',
      telefone: '',
      data: new Date().toISOString().split('T')[0],
      tipoReembolso: 'alimentacao',
      descricao: '',
      valorTotal: '',
      moeda: 'BRL',
      metodoPagamento: 'agente',
      banco: null,
      agencia: null,
      conta: null,
      pixTipo: null,
      pixChave: null,
      comprovantes: [],
      observacoes: null,
      cargo: '',
      centroCusto: undefined,
      cpf: ''
    }
  });

  // Watch values for conditional rendering
  const metodoPagamento = watch('metodoPagamento');
  const pixTipo = watch('pixTipo');
  const comprovantes = watch('comprovantes');
  const tipoReembolso = watch('tipoReembolso');
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('BRL');

  // Handle form submission
  const onSubmit = async (data: FormValues) => {
    try {
      setSubmitting(true);

      // Preparar os dados para envio
      const formData = {
        ...data,
        // Converter os comprovantes para o formato esperado pela API
        comprovantes: data.comprovantes.map((file: any) => ({
          nome: file.name,
          url: file.id, // Usamos o ID como URL temporária
          tipo: file.type,
          tamanho: file.size
        }))
      };

      // Enviar para a API
      const response = await fetch('/api/reembolso', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao enviar formulário');
      }

      const result = await response.json();

      // Salvar o protocolo
      setProtocol(result.protocolo);

      // Mostrar mensagem de sucesso
      toast.success('Formulário enviado com sucesso!');
      setSubmitSuccess(true);
      setShowThankYou(true);

      // Resetar o formulário
      reset();
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar formulário. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle input masking
  const handleCurrencyChange = (value: string) => {
    setValue('valorTotal', value);
  };

  // Handle currency change
  const handleCurrencyTypeChange = (currency: Currency) => {
    setValue('moeda', currency);
    setSelectedCurrency(currency);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('telefone', formatPhone(e.target.value));
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('cpf', formatCPF(e.target.value));
  };

  // Handle PIX key validation
  const validatePixKeyField = () => {
    const pixTipoValue = watch('pixTipo');
    const pixChaveValue = watch('pixChave');

    if (pixTipoValue && pixChaveValue) {
      const isValid = validatePixKey(pixTipoValue, pixChaveValue);

      if (!isValid) {
        setError('pixChave', {
          type: 'manual',
          message: `Chave PIX inválida para o tipo ${pixTipoValue}`
        });
      } else {
        clearErrors('pixChave');
      }
    }
  };

  return (
    <>
      <ToastContainer position="top-right" theme="colored" />

      {/* PDF Viewer Modal */}
      <AnimatePresence>
        {showPdfViewer && (
          <PdfViewer
            onClose={() => setShowPdfViewer(false)}
            onUnderstand={() => setShowPdfViewer(false)}
          />
        )}
      </AnimatePresence>

      {/* Thank You Modal */}
      <AnimatePresence>
        {showThankYou && (
          <ThankYouModal
            protocol={protocol}
            onClose={() => setShowThankYou(false)}
          />
        )}
      </AnimatePresence>

      {/* Contact Popup */}
      <AnimatePresence>
        {showContactPopup && (
          <ContactPopup onClose={() => setShowContactPopup(false)} />
        )}
      </AnimatePresence>

      {/* Main Form */}
      <motion.div
        className="bg-white rounded-lg shadow-lg p-6 md:p-8"
        variants={formContainerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{t('reimbursement.form.title')}</h2>
          <button
            type="button"
            onClick={() => setShowContactPopup(true)}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <FiMessageSquare className="mr-1" />
            <span className="text-sm">{t('common.help')}</span>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Seção 1: Dados Pessoais */}
          <motion.div variants={sectionVariants} className="bg-gray-50 p-5 rounded-lg">
            <h3 className="text-lg font-medium text-gray-800 mb-4">{t('reimbursement.form.personalInfo')}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                name="nome"
                control={control}
                render={({ field }) => (
                  <InputField
                    id="nome"
                    label={t('reimbursement.form.fullName')}
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.nome?.message}
                    required
                  />
                )}
              />

              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <InputField
                    id="email"
                    label={t('reimbursement.form.email')}
                    type="email"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.email?.message}
                    required
                  />
                )}
              />

              <Controller
                name="telefone"
                control={control}
                render={({ field }) => (
                  <InputField
                    id="telefone"
                    label={t('reimbursement.form.phone')}
                    value={field.value}
                    onChange={(e) => {
                      handlePhoneChange(e);
                      field.onChange(e);
                    }}
                    error={errors.telefone?.message}
                    required
                  />
                )}
              />

              <Controller
                name="cpf"
                control={control}
                render={({ field }) => (
                  <InputField
                    id="cpf"
                    label={t('reimbursement.form.cpf')}
                    value={field.value}
                    onChange={(e) => {
                      handleCPFChange(e);
                      field.onChange(e);
                    }}
                    error={errors.cpf?.message}
                    required
                  />
                )}
              />

              <Controller
                name="cargo"
                control={control}
                render={({ field }) => (
                  <InputField
                    id="cargo"
                    label={t('reimbursement.form.position')}
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.cargo?.message}
                    required
                  />
                )}
              />

              <Controller
                name="centroCusto"
                control={control}
                render={({ field }) => (
                  <SelectField
                    id="centroCusto"
                    label={t('reimbursement.form.costCenter')}
                    value={field.value || ''}
                    onChange={field.onChange}
                    options={[
                      { value: 'luz_maritima', label: 'Luz Marítima' },
                      { value: 'fms', label: 'FMS' },
                      { value: 'msi', label: 'MSI' },
                      { value: 'omega', label: 'Omega' },
                      { value: 'constellation', label: 'Constellation' },
                      { value: 'sentinel', label: 'Sentinel' },
                      { value: 'ahn', label: 'AHN' }
                    ]}
                    error={errors.centroCusto?.message}
                  />
                )}
              />
            </div>
          </motion.div>

          {/* Seção 2: Dados do Reembolso */}
          <motion.div variants={sectionVariants} className="bg-gray-50 p-5 rounded-lg">
            <h3 className="text-lg font-medium text-gray-800 mb-4">{t('reimbursement.form.expenseInfo')}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                name="data"
                control={control}
                render={({ field }) => (
                  <InputField
                    id="data"
                    label={t('reimbursement.form.expenseDate')}
                    type="date"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.data?.message}
                    required
                  />
                )}
              />

              <Controller
                name="tipoReembolso"
                control={control}
                render={({ field }) => (
                  <SelectField
                    id="tipoReembolso"
                    label={t('reimbursement.form.expenseType')}
                    value={field.value}
                    onChange={(e) => {
                      field.onChange(e);
                    }}
                    options={[
                      { value: 'alimentacao', label: t('locale.code') === 'en-US' ? 'Food' : 'Alimentação' },
                      { value: 'transporte', label: t('locale.code') === 'en-US' ? 'Transportation' : 'Transporte' },
                      { value: 'hospedagem', label: t('locale.code') === 'en-US' ? 'Accommodation' : 'Hospedagem' },
                      { value: 'material', label: t('locale.code') === 'en-US' ? 'Work Materials' : 'Material de Trabalho' },
                      { value: 'outro', label: t('locale.code') === 'en-US' ? 'Other' : 'Outro' }
                    ]}
                    error={errors.tipoReembolso?.message}
                    required
                  />
                )}
              />

              <Controller
                name="valorTotal"
                control={control}
                render={({ field }) => (
                  <CurrencyInput
                    id="valorTotal"
                    label={t('reimbursement.form.expenseValue')}
                    value={field.value}
                    onChange={(value) => {
                      handleCurrencyChange(value);
                      field.onChange(value);
                    }}
                    onCurrencyChange={handleCurrencyTypeChange}
                    error={errors.valorTotal?.message}
                    required
                  />
                )}
              />

              <Controller
                name="metodoPagamento"
                control={control}
                render={({ field }) => (
                  <PaymentMethodRadio
                    id="metodoPagamento"
                    label={t('reimbursement.form.bankInfo')}
                    value={field.value}
                    onChange={(value) => {
                      // Limpar os campos condicionais quando mudar o método de pagamento
                      if (value === 'deposito') {
                        setValue('pixTipo', null);
                        setValue('pixChave', null);
                      } else if (value === 'pix') {
                        setValue('banco', null);
                        setValue('agencia', null);
                        setValue('conta', null);
                      } else {
                        setValue('banco', null);
                        setValue('agencia', null);
                        setValue('conta', null);
                        setValue('pixTipo', null);
                        setValue('pixChave', null);
                      }
                      field.onChange(value);
                    }}
                    options={[
                      { value: 'deposito', label: t('locale.code') === 'en-US' ? 'Bank Deposit' : 'Depósito Bancário' },
                      { value: 'pix', label: 'PIX' },
                      { value: 'agente', label: t('locale.code') === 'en-US' ? 'Financial Agent (Cash)' : 'Agente Financeiro (Dinheiro)' }
                    ]}
                    error={errors.metodoPagamento?.message}
                    required
                  />
                )}
              />
            </div>

            {/* Campos condicionais para depósito bancário */}
            <AnimatePresence style={{ opacity: 1 }}>
              {metodoPagamento === 'deposito' && (
                <div
                  className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 border-t border-gray-200 pt-4"
                  style={{ opacity: 1, position: 'relative', zIndex: 10 }}
                >
                  <Controller
                    name="banco"
                    control={control}
                    render={({ field }) => (
                      <InputField
                        id="banco"
                        label={t('reimbursement.form.bankName')}
                        value={field.value || ''}
                        onChange={field.onChange}
                        error={errors.banco?.message}
                        required
                      />
                    )}
                  />

                  <Controller
                    name="agencia"
                    control={control}
                    render={({ field }) => (
                      <InputField
                        id="agencia"
                        label={t('reimbursement.form.agency')}
                        value={field.value || ''}
                        onChange={field.onChange}
                        error={errors.agencia?.message}
                        required
                      />
                    )}
                  />

                  <Controller
                    name="conta"
                    control={control}
                    render={({ field }) => (
                      <InputField
                        id="conta"
                        label={t('reimbursement.form.account')}
                        value={field.value || ''}
                        onChange={field.onChange}
                        error={errors.conta?.message}
                        required
                      />
                    )}
                  />
                </div>
              )}
            </AnimatePresence>

            {/* Campos condicionais para PIX */}
            <AnimatePresence style={{ opacity: 1 }}>
              {metodoPagamento === 'pix' && (
                <div
                  className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 border-t border-gray-200 pt-4"
                  style={{ opacity: 1, position: 'relative', zIndex: 10 }}
                >
                  <Controller
                    name="pixTipo"
                    control={control}
                    render={({ field }) => (
                      <div style={{ opacity: 1 }}>
                        <SelectField
                          id="pixTipo"
                          label="Tipo de Chave PIX"
                          value={field.value || ''}
                          onChange={(e) => {
                            field.onChange(e);
                            // Limpar o campo de chave PIX quando o tipo mudar
                            setValue('pixChave', '');
                            clearErrors('pixChave');
                            // Não precisamos atualizar o estado local, pois já estamos usando watch('pixTipo')
                          }}
                          options={[
                            { value: 'cpf', label: 'CPF' },
                            { value: 'email', label: 'Email' },
                            { value: 'telefone', label: 'Telefone' },
                            { value: 'aleatoria', label: 'Chave Aleatória' }
                          ]}
                          error={errors.pixTipo?.message}
                          required
                        />
                      </div>
                    )}
                  />

                  <Controller
                    name="pixChave"
                    control={control}
                    render={({ field }) => {
                      // Determinar o tipo de entrada e máscara com base no tipo de PIX
                      let inputType = 'text';
                      let placeholder = 'Digite sua chave PIX';
                      let mask = undefined;

                      if (pixTipo) {
                        switch(pixTipo) {
                          case 'cpf':
                            placeholder = '000.000.000-00';
                            mask = formatCPF;
                            break;
                          case 'email':
                            inputType = 'email';
                            placeholder = 'exemplo@email.com';
                            break;
                          case 'telefone':
                            placeholder = '(00) 00000-0000';
                            mask = formatPhone;
                            break;
                          case 'aleatoria':
                            placeholder = 'Chave aleatória PIX';
                            break;
                        }
                      }

                      return (
                        <div style={{ opacity: 1 }}>
                          <InputField
                            id="pixChave"
                            label="Chave PIX"
                            type={inputType}
                            value={field.value || ''}
                            onChange={(e) => {
                              if (mask && typeof e.target.value === 'string') {
                                field.onChange(mask(e.target.value));
                              } else {
                                field.onChange(e);
                              }
                            }}
                            onBlur={validatePixKeyField}
                            placeholder={placeholder}
                            error={errors.pixChave?.message}
                            required
                          />
                        </div>
                      );
                    }}
                  />
                </div>
              )}
            </AnimatePresence>

            {/* Campo de Descrição da Despesa */}
            <Controller
              name="descricao"
              control={control}
              render={({ field }) => (
                <DescriptionField
                  id="descricao"
                  label={t('locale.code') === 'en-US' ? 'Expense Description' : 'Descrição da Despesa'}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.descricao?.message}
                  required
                  rows={4}
                />
              )}
            />
          </motion.div>

          {/* Seção 3: Comprovantes */}
          <motion.div variants={sectionVariants} className="bg-gray-50 p-5 rounded-lg">
            <h3 className="text-lg font-medium text-gray-800 mb-4">{t('locale.code') === 'en-US' ? 'Attachments' : 'Comprovantes'}</h3>

            <Controller
              name="comprovantes"
              control={control}
              render={({ field }) => (
                <FileUploader
                  files={field.value}
                  onFilesChange={(files) => {
                    field.onChange(files);
                    trigger('comprovantes');
                  }}
                  maxFiles={5}
                  maxSizeInMB={10}
                  acceptedFileTypes={['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']}
                />
              )}
            />

            {errors.comprovantes && (
              <p className="mt-1 text-sm text-red-500">{errors.comprovantes.message}</p>
            )}

            <Controller
              name="observacoes"
              control={control}
              render={({ field }) => (
                <TextArea
                  id="observacoes"
                  label={t('locale.code') === 'en-US' ? 'Notes (optional)' : 'Observações (opcional)'}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.observacoes?.message}
                  rows={3}
                />
              )}
            />
          </motion.div>

          {/* Botões de Ação */}
          <motion.div variants={sectionVariants} className="flex flex-col md:flex-row justify-end space-y-3 md:space-y-0 md:space-x-3">
            <button
              type="button"
              onClick={() => setShowPdfViewer(true)}
              className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <FiDownload className="mr-2" />
              {t('reimbursement.form.viewPolicy')}
            </button>

            <button
              type="submit"
              disabled={isSubmitting || submitting}
              className={`flex items-center justify-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                (isSubmitting || submitting) ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {(isSubmitting || submitting) ? (
                  <>
                    {/* Loading spinner */}
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('reimbursement.form.submitting')}
                  </>
                ) : (
                  <>
                    <FiSend className="mr-2"/>
                    {t('reimbursement.form.submit')}
                  </>
                )}
              </button>
            </motion.div>
        </form>
      </motion.div>
    </>
  );
}