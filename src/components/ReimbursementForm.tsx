'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller, SubmitHandler, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSend, FiDownload, FiMessageSquare } from 'react-icons/fi';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Currency } from '@/lib/currencyConverter';
import { useI18n } from '@/contexts/I18nContext';
import { UserProfile } from '@/contexts/SupabaseAuthContext';

import type { FormValues } from '@/lib/schema';
import { refinedFormSchema, validatePixKey } from '@/lib/schema';
import { formatCurrency, formatPhone, formatCPF } from '@/lib/utils';
import { InputField, TextArea, SelectField } from './FormFields';
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

interface ReimbursementFormProps {
  profile?: UserProfile | null;
}

export default function ReimbursementForm({ profile }: ReimbursementFormProps) {
  const { t } = useI18n();
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [protocol, setProtocol] = useState('');
  const [showPdfViewer, setShowPdfViewer] = useState(true);
  const [showThankYou, setShowThankYou] = useState(false);
  const [showContactPopup, setShowContactPopup] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('BRL');
  const [fieldsPopulated, setFieldsPopulated] = useState(false);

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
    resolver: zodResolver(refinedFormSchema) as Resolver<FormValues>,
    defaultValues: {
      nome: '',
      email: '',
      telefone: '',
      data: new Date().toISOString().split('T')[0],
      tipoReembolso: 'alimentacao',
      descricao: '',
      valorTotal: '',
      moeda: 'BRL' as Currency,
      metodoPagamento: 'agente',
      banco: null,
      agencia: null,
      conta: null,
      pixTipo: null,
      pixChave: null,
      comprovantes: [],
      observacoes: null,
      cargo: '',
      centroCusto: '',
      cpf: ''
    }
  });

  // Watch values for conditional rendering with fallbacks for undefined values
  const metodoPagamento = watch('metodoPagamento') || 'agente';
  const pixTipo = watch('pixTipo') || null;
  const tipoReembolso = watch('tipoReembolso') || 'alimentacao';

  // Auto-populate form fields with user profile data
  useEffect(() => {
    if (profile && !fieldsPopulated) {
      console.log('Auto-populating form fields with user profile data');

      // Map profile fields to form fields
      if (profile.first_name && profile.last_name) {
        const fullName = `${profile.first_name} ${profile.last_name}`.trim();
        setValue('nome', fullName);
        console.log('Auto-populated name:', fullName);
      }

      if (profile.email) {
        setValue('email', profile.email);
        console.log('Auto-populated email:', profile.email);
      }

      if (profile.phone_number) {
        const formattedPhone = formatPhone(profile.phone_number);
        setValue('telefone', formattedPhone);
        console.log('Auto-populated phone:', formattedPhone);
      }

      if (profile.position) {
        setValue('cargo', profile.position);
        console.log('Auto-populated position:', profile.position);
      }

      if (profile.department) {
        // Map department to a cost center if possible
        let costCenter = '';
        const department = profile.department.toLowerCase();

        if (department.includes('luz') || department.includes('maritima')) {
          costCenter = 'luz_maritima';
        } else if (department.includes('fms')) {
          costCenter = 'fms';
        } else if (department.includes('msi')) {
          costCenter = 'msi';
        } else if (department.includes('omega')) {
          costCenter = 'omega';
        } else if (department.includes('constellation')) {
          costCenter = 'constellation';
        } else if (department.includes('sentinel')) {
          costCenter = 'sentinel';
        } else if (department.includes('ahk')) {
          costCenter = 'ahk';
        }

        if (costCenter) {
          setValue('centroCusto', costCenter);
          console.log('Auto-populated cost center from department:', costCenter);
        }
      }

      // Mark fields as populated to prevent re-population on re-renders
      setFieldsPopulated(true);
    }
  }, [profile, fieldsPopulated, setValue]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      setSubmitting(true);
      console.log('Iniciando envio do formulário de reembolso...');

      const normalizedValue = data.valorTotal.replace(/\./g, '').replace(',', '.');
      console.log(`Valor normalizado: ${normalizedValue} (original: ${data.valorTotal})`);

      if (!data.comprovantes || data.comprovantes.length === 0) {
        toast.error('É necessário anexar pelo menos um comprovante.');
        setSubmitting(false);
        return;
      }

      console.log(`Comprovantes anexados: ${data.comprovantes.length}`);

      if (!data.centroCusto) {
        setError('centroCusto', { type: 'manual', message: t('reimbursement.form.costCenterRequired') });
        setSubmitting(false);
        return;
      }

      const formData = {
        ...data,
        valorTotal: normalizedValue,
        comprovantes: data.comprovantes.map((file: any) => {
          const isLocalFile = file.isLocalFile === true;
          let base64Buffer = null;

          if (file.buffer) {
            try {
              if (typeof file.buffer === 'string' && file.buffer.startsWith('data:')) {
                base64Buffer = file.buffer;
                console.log(`Arquivo ${file.name} já tem DataURL (${base64Buffer.length} caracteres)`);
              } else if (file.buffer instanceof ArrayBuffer) {
                const bytes = new Uint8Array(file.buffer);
                const len = bytes.byteLength;
                let binary = '';
                for (let i = 0; i < len; i++) {
                  binary += String.fromCharCode(bytes[i]);
                }
                base64Buffer = btoa(binary);
                console.log(`Buffer do arquivo ${file.name} convertido para base64 (${base64Buffer.length} caracteres)`);
              } else {
                console.log(`Tipo de buffer não reconhecido para ${file.name}: ${typeof file.buffer}`);
              }
            } catch (bufferError) {
              console.error(`Erro ao processar buffer: ${file.name}`, bufferError);
            }
          }

          return {
            nome: file.name,
            url: file.id,
            tipo: file.type,
            tamanho: file.size,
            publicUrl: file.url,
            isLocalFile,
            file: isLocalFile ? file.file : undefined,
            buffer: base64Buffer,
            dados: base64Buffer
          };
        })
      };

      console.log('Enviando dados para a API de criação de reembolso...');

      const token = localStorage.getItem('supabase.auth.token');

      const response = await fetch('/api/reembolso/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(formData),
      });

      console.log(`Resposta da API: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro retornado pela API:', errorData);
        throw new Error(errorData.error || 'Erro ao enviar formulário');
      }

      const result = await response.json();
      console.log('Resultado do envio:', result);

      setProtocol(result.protocolo);
      console.log(`Protocolo gerado: ${result.protocolo}`);

      toast.success('Formulário enviado com sucesso!');
      setSubmitSuccess(true);
      setShowThankYou(true);

      reset();
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar formulário. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCurrencyChange = (value: string) => {
    setValue('valorTotal', value);
  };

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

  const validatePixKeyField = () => {
    const pixTipoValue = watch('pixTipo');
    const pixChaveValue = watch('pixChave');

    if (pixTipoValue && pixChaveValue) {
      const isValid = validatePixKey(pixTipoValue, pixChaveValue);

      if (!isValid) {
        setError('pixChave', {
          type: 'manual',
          message: t('locale.code') === 'en-US'
            ? `Invalid PIX key for type ${pixTipoValue === 'cpf' ? 'TAX ID' : pixTipoValue}`
            : `Chave PIX inválida para o tipo ${pixTipoValue}`
        });
      } else {
        clearErrors('pixChave');
      }
    }
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {showPdfViewer && (
          <PdfViewer
            onClose={() => setShowPdfViewer(false)}
            onUnderstand={() => setShowPdfViewer(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {showThankYou && (
          <ThankYouModal
            protocol={protocol}
            onClose={() => setShowThankYou(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {showContactPopup && (
          <ContactPopup onClose={() => setShowContactPopup(false)} />
        )}
      </AnimatePresence>

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
                      { value: 'ahk', label: 'AHK' }
                    ]}
                    error={errors.centroCusto?.message}
                  />
                )}
              />
            </div>
          </motion.div>

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
            <AnimatePresence mode="wait">
              {metodoPagamento === 'deposito' && (
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 border-t border-gray-200 pt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
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
                </motion.div>
              )}
            </AnimatePresence>

            {/* Campos condicionais para PIX */}
            <AnimatePresence mode="wait">
              {metodoPagamento === 'pix' && (
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 border-t border-gray-200 pt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Controller
                    name="pixTipo"
                    control={control}
                    render={({ field }) => (
                      <SelectField
                        id="pixTipo"
                        label={t('reimbursement.form.pixKeyType')}
                        value={field.value || ''}
                        onChange={(e) => {
                          field.onChange(e);
                          setValue('pixChave', '');
                          clearErrors('pixChave');
                        }}
                        options={[
                          { value: 'cpf', label: t('locale.code') === 'en-US' ? 'TAX ID' : 'CPF' },
                          { value: 'email', label: 'Email' },
                          { value: 'telefone', label: t('locale.code') === 'en-US' ? 'Phone' : 'Telefone' },
                          { value: 'aleatoria', label: t('locale.code') === 'en-US' ? 'Random Key' : 'Chave Aleatória' }
                        ]}
                        error={errors.pixTipo?.message}
                        required
                      />
                    )}
                  />

                  <Controller
                    name="pixChave"
                    control={control}
                    render={({ field }) => {
                      let inputType = 'text';
                      let placeholder = t('locale.code') === 'en-US' ? 'Enter your PIX key' : 'Digite sua chave PIX';
                      let mask = undefined;

                      if (pixTipo) {
                        switch(pixTipo) {
                          case 'cpf':
                            placeholder = t('locale.code') === 'en-US' ? '000.000.000-00 (TAX ID)' : '000.000.000-00';
                            mask = formatCPF;
                            break;
                          case 'email':
                            inputType = 'email';
                            placeholder = t('locale.code') === 'en-US' ? 'example@email.com' : 'exemplo@email.com';
                            break;
                          case 'telefone':
                            placeholder = t('locale.code') === 'en-US' ? '(00) 00000-0000' : '(00) 00000-0000';
                            mask = formatPhone;
                            break;
                          case 'aleatoria':
                            placeholder = t('locale.code') === 'en-US' ? 'Random PIX key' : 'Chave aleatória PIX';
                            break;
                        }
                      }

                      return (
                        <InputField
                          id="pixChave"
                          label={t('reimbursement.form.pixKey')}
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
                      );
                    }}
                  />
                </motion.div>
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
                  value={field.value ?? ''}
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
