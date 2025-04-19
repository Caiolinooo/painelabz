"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { FiX, FiDownload, FiCheckCircle } from 'react-icons/fi';
import { useI18n } from '@/contexts/I18nContext';

interface PdfViewerProps {
  onClose: () => void;
  onUnderstand: () => void;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ onClose, onUnderstand }) => {
  const { t } = useI18n();
  const isEnglish = t('locale.code') === 'en-US';
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">{isEnglish ? 'Reimbursement Policy' : 'Política de Reembolso'}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-auto p-6">
          <div className="prose max-w-none">
            <h3>{isEnglish ? 'Reimbursement Policy - ABZ Group' : 'Política de Reembolso - ABZ Group'}</h3>

            <p>
              {isEnglish
                ? 'This document establishes the guidelines and procedures for requesting and processing reimbursements of expenses related to the professional activities of ABZ Group employees.'
                : 'Este documento estabelece as diretrizes e procedimentos para solicitação e processamento de reembolsos de despesas relacionadas às atividades profissionais dos colaboradores da ABZ Group.'}
            </p>

            <h4>{isEnglish ? '1. Eligibility' : '1. Elegibilidade'}</h4>
            <p>
              {isEnglish
                ? 'Expenses directly related to professional activities, previously authorized by the responsible manager, and that comply with company policies are eligible for reimbursement.'
                : 'São elegíveis para reembolso as despesas diretamente relacionadas às atividades profissionais, previamente autorizadas pelo gestor responsável, e que estejam em conformidade com as políticas da empresa.'}
            </p>

            <h4>{isEnglish ? '2. Types of Reimbursable Expenses' : '2. Tipos de Despesas Reembolsáveis'}</h4>
            <ul>
              <li><strong>{isEnglish ? 'Food:' : 'Alimentação:'}</strong> {isEnglish ? 'Meals during business trips or external meetings.' : 'Refeições durante viagens a trabalho ou reuniões externas.'}</li>
              <li><strong>{isEnglish ? 'Transportation:' : 'Transporte:'}</strong> {isEnglish ? 'Service travel, including taxi, transport apps, fuel, tolls, and parking.' : 'Deslocamentos a serviço, incluindo táxi, aplicativos de transporte, combustível, pedágios e estacionamento.'}</li>
              <li><strong>{isEnglish ? 'Accommodation:' : 'Hospedagem:'}</strong> {isEnglish ? 'Hotel stays during business trips.' : 'Estadias em hotéis durante viagens a trabalho.'}</li>
              <li><strong>{isEnglish ? 'Work Materials:' : 'Material de Trabalho:'}</strong> {isEnglish ? 'Items necessary for performing professional activities.' : 'Itens necessários para execução das atividades profissionais.'}</li>
              <li><strong>{isEnglish ? 'Other expenses:' : 'Outras despesas:'}</strong> {isEnglish ? 'Subject to prior approval by the manager.' : 'Conforme aprovação prévia do gestor.'}</li>
            </ul>

            <h4>{isEnglish ? '3. Required Documentation' : '3. Documentação Necessária'}</h4>
            <p>
              {isEnglish
                ? 'For all reimbursement requests, it is mandatory to present valid tax receipts (invoices, tax receipts, receipts) that contain:'
                : 'Para todas as solicitações de reembolso, é obrigatória a apresentação de comprovantes fiscais válidos (notas fiscais, cupons fiscais, recibos) que contenham:'}
            </p>
            <ul>
              <li>{isEnglish ? 'Date and time of expense' : 'Data e hora da despesa'}</li>
              <li>{isEnglish ? 'Amount' : 'Valor'}</li>
              <li>{isEnglish ? 'Description of product or service' : 'Descrição do produto ou serviço'}</li>
              <li>{isEnglish ? 'Supplier identification (CNPJ or CPF)' : 'Identificação do fornecedor (CNPJ ou CPF)'}</li>
            </ul>

            <h4>{isEnglish ? '4. Deadlines' : '4. Prazos'}</h4>
            <p>
              {isEnglish
                ? 'Reimbursement requests must be submitted within 30 days after the expense is incurred. Processing will be carried out within 10 business days after manager approval.'
                : 'As solicitações de reembolso devem ser apresentadas em até 30 dias após a realização da despesa. O processamento será realizado em até 10 dias úteis após a aprovação do gestor.'}
            </p>

            <h4>{isEnglish ? '5. Payment Methods' : '5. Formas de Pagamento'}</h4>
            <p>
              {isEnglish
                ? 'Reimbursement will preferably be made by:'
                : 'O reembolso será realizado preferencialmente por:'}
            </p>
            <ul>
              <li>{isEnglish ? 'Deposit to employee\'s bank account' : 'Depósito em conta bancária do colaborador'}</li>
              <li>{isEnglish ? 'PIX transfer' : 'Transferência via PIX'}</li>
              <li>{isEnglish ? 'In exceptional cases, cash payment by the financial agent' : 'Em casos excepcionais, pagamento em espécie pelo agente financeiro'}</li>
            </ul>

            <h4>{isEnglish ? '6. Restrictions' : '6. Restrições'}</h4>
            <p>
              {isEnglish
                ? 'Expenses will not be reimbursed if:'
                : 'Não serão reembolsadas despesas:'}
            </p>
            <ul>
              <li>{isEnglish ? 'Without adequate fiscal proof' : 'Sem comprovação fiscal adequada'}</li>
              <li>{isEnglish ? 'Of a personal nature' : 'De caráter pessoal'}</li>
              <li>{isEnglish ? 'Not previously authorized (when applicable)' : 'Não autorizadas previamente (quando aplicável)'}</li>
              <li>{isEnglish ? 'In disagreement with company policies' : 'Em desacordo com as políticas da empresa'}</li>
              <li>{isEnglish ? 'With illegible or incomplete documentation' : 'Com documentação ilegível ou incompleta'}</li>
            </ul>

            <h4>{isEnglish ? '7. Final Considerations' : '7. Considerações Finais'}</h4>
            <p>
              {isEnglish
                ? 'ABZ Group reserves the right to audit reimbursement requests at any time. Omitted cases will be analyzed by the Financial Board. This policy may be reviewed and updated periodically.'
                : 'A ABZ Group se reserva o direito de auditar as solicitações de reembolso a qualquer momento. Casos omissos serão analisados pela Diretoria Financeira. Esta política pode ser revisada e atualizada periodicamente.'}
            </p>
          </div>
        </div>

        {/* Footer with buttons */}
        <div className="p-4 border-t flex justify-end space-x-3">
          <button
            onClick={onUnderstand}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <FiCheckCircle className="mr-2" />
            {isEnglish ? 'I Understand and Agree' : 'Entendi e Concordo'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PdfViewer;
