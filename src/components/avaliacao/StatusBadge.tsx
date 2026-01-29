'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/contexts/I18nContext';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig = {
  // Status atuais
  pendente: {
    label: 'Pendente',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: '⏳'
  },
  em_andamento: {
    label: 'Em Andamento',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: '✏️'
  },
  aguardando_aprovacao: {
    label: 'Aguardando Aprovação',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: '👀'
  },
  concluida: {
    label: 'Concluída',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: '✅'
  },
  devolvida: {
    label: 'Devolvida',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: '🔄'
  },
  cancelada: {
    label: 'Cancelada',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: '❌'
  },
  // Status legados para compatibilidade
  pendente_autoavaliacao: {
    label: 'Pendente de Resposta',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: '⏳'
  },
  pendente_aprovacao_gerente: {
    label: 'Aguardando Gerente',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: '👀'
  },
  pending_response: {
    label: 'Pendente de Resposta',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: '⏳'
  },
  awaiting_manager: {
    label: 'Aguardando Gerente',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: '👀'
  },
  approved: {
    label: 'Aprovado',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: '✅'
  }
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useI18n();
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pendente_autoavaliacao;

  // Mapeamento de chaves de tradução
  const translationKeys: Record<string, string> = {
    'Pendente': 'avaliacao.status.pending',
    'Em Andamento': 'avaliacao.status.in_progress',
    'Aguardando Aprovação': 'avaliacao.status.aguardando_aprovacao',
    'Concluída': 'avaliacao.status.concluida',
    'Devolvida': 'avaliacao.status.devolvida',
    'Cancelada': 'common.cancel', // Fallback se não houver status especifico
    'Pendente de Resposta': 'avaliacao.status.pending_response',
    'Aguardando Gerente': 'avaliacao.status.aguardando_aprovacao', // ou criar chave especifica se necessário
    'Aguardando': 'avaliacao.status.aguardando_finalizacao',
    'Aprovado': 'avaliacao.status.approved', // Verificando se existe
    'Rejeitado': 'common.reject'
  };

  // Melhor abordagem: usar o status key diretamente para buscar a tradução
  // Mas como currentemente o config tem label hardcoded, vamos tentar mapear ou ajustar a lógica.
  // Idealmente: t(`avaliacao.status.${status}`)

  // Vamos usar uma logica hibrida para suportar status legados que não batem direto com as chaves
  let label = config.label;

  // Tentativa de tradução direta baseada no status key
  const directKey = `avaliacao.status.${status}`;
  const directTranslation = t(directKey);

  // Se a tradução direta devolveu a chave (significa que nao achou ou é igual), tenta mapear pelo label antigo ou status conhecidos
  if (status === 'pendente') label = t('avaliacao.status.pending');
  else if (status === 'em_andamento') label = t('avaliacao.status.em_andamento');
  else if (status === 'aguardando_aprovacao') label = t('avaliacao.status.aguardando_aprovacao');
  else if (status === 'concluida') label = t('avaliacao.status.concluida');
  else if (status === 'devolvida') label = t('avaliacao.status.devolvida');
  else if (status === 'pendente_autoavaliacao' || status === 'pending_response') label = t('avaliacao.status.pending_response');
  else if (status === 'pendente_aprovacao_gerente' || status === 'awaiting_manager') label = t('avaliacao.status.aguardando_aprovacao'); // Ajuste conforme screenshot "Awaiting Manager" -> "Aguardando Gerente"
  else if (status === 'submitted') label = t('avaliacao.status.submitted');
  else if (status === 'approved') label = t('avaliacao.status.approved');
  else if (status === 'rejected') label = t('avaliacao.status.rejected');
  else if (status === 'draft') label = t('avaliacao.status.draft');

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border',
        config.color,
        className
      )}
    >
      <span>{config.icon}</span>
      <span>{label}</span>
    </span>
  );
}
