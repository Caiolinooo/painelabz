'use client';

import React, { useState, useEffect } from 'react';
import { FiSettings, FiMail, FiAlertCircle } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import ReimbursementEmailSettings from '@/components/admin/ReimbursementEmailSettings';

export default function ReimbursementSettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailSettings, setEmailSettings] = useState<{
    enableDomainRule: boolean;
    recipients: string[];
  }>({
    enableDomainRule: true,
    recipients: ['andresa.oliveira@groupabz.com', 'fiscal@groupabz.com']
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Tentar usar a API principal do Supabase
      try {
        console.log('Tentando carregar configurações da API principal...');
        const response = await fetch('/api/reimbursement-settings');

        if (response.ok) {
          const data = await response.json();
          console.log('Configurações de email de reembolso carregadas da API principal:', data);
          setEmailSettings(data);
          setIsLoading(false);
          return;
        } else {
          console.error('Erro ao carregar configurações da API principal:', response.status);
          // Continuar para o fallback
        }
      } catch (mainApiError) {
        console.error('Erro ao acessar API principal:', mainApiError);
        // Continuar para o fallback
      }

      // Tentar usar a API de fallback
      try {
        console.log('Tentando carregar configurações da API de fallback...');
        const fallbackResponse = await fetch('/api/reimbursement-settings-fallback');

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          console.log('Configurações de email de reembolso carregadas da API de fallback:', fallbackData);
          setEmailSettings(fallbackData);
          setIsLoading(false);
          return;
        } else {
          console.error('Erro ao carregar configurações da API de fallback:', fallbackResponse.status);
          // Continuar para os valores padrão
        }
      } catch (fallbackApiError) {
        console.error('Erro ao acessar API de fallback:', fallbackApiError);
        // Continuar para os valores padrão
      }

      // Usar valores padrão como último recurso
      console.log('Usando valores padrão para as configurações');
      setEmailSettings({
        enableDomainRule: true,
        recipients: ['andresa.oliveira@groupabz.com', 'fiscal@groupabz.com']
      });
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
      setError('Erro ao carregar configurações. Usando valores padrão.');

      // Usar valores padrão em caso de erro
      setEmailSettings({
        enableDomainRule: true,
        recipients: ['andresa.oliveira@groupabz.com', 'fiscal@groupabz.com']
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveEmailSettings = async (settings: {
    enableDomainRule: boolean;
    recipients: string[];
  }): Promise<boolean> => {
    try {
      console.log('Salvando configurações de email de reembolso:', settings);

      // Tentar usar a API principal do Supabase
      try {
        console.log('Tentando salvar configurações na API principal...');

        // Usar a API do Supabase para salvar as configurações
        const response = await fetch('/api/reimbursement-settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(settings),
        });

        // Tentar ler o corpo da resposta
        let responseData;
        try {
          responseData = await response.json();
        } catch (parseError) {
          console.error('Erro ao analisar resposta:', parseError);
          responseData = { error: 'Erro ao analisar resposta do servidor' };
        }

        if (response.ok) {
          console.log('Configurações salvas com sucesso na API principal:', responseData);

          // Atualizar estado local
          setEmailSettings(settings);
          return true;
        }

        console.error('Erro ao salvar configurações na API principal:', responseData.error || 'Status: ' + response.status);

        // Se o erro for relacionado à tabela não existente, tentar criar a tabela
        if (responseData.error && responseData.error.includes('relation "public.settings" does not exist')) {
          console.log('Tentando criar tabela settings...');

          // Chamar a API que cria a tabela settings
          const setupResponse = await fetch('/api/setup-settings-table', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            }
          });

          if (setupResponse.ok) {
            console.log('Tabela settings criada com sucesso, tentando salvar novamente...');

            // Tentar salvar novamente após criar a tabela
            const retryResponse = await fetch('/api/reimbursement-settings', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(settings),
            });

            if (retryResponse.ok) {
              console.log('Configurações salvas com sucesso após criar tabela');
              setEmailSettings(settings);
              return true;
            } else {
              console.error('Falha ao salvar configurações após criar tabela:', await retryResponse.text());
              // Continuar para o fallback
            }
          } else {
            console.error('Falha ao criar tabela settings:', await setupResponse.text());
            // Continuar para o fallback
          }
        }
      } catch (mainApiError) {
        console.error('Erro ao acessar API principal:', mainApiError);
        // Continuar para o fallback
      }

      // Tentar usar a API de fallback
      try {
        console.log('Tentando salvar configurações na API de fallback...');

        const fallbackResponse = await fetch('/api/reimbursement-settings-fallback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(settings),
        });

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          console.log('Configurações salvas com sucesso na API de fallback:', fallbackData);

          // Atualizar estado local
          setEmailSettings(settings);
          return true;
        } else {
          console.error('Erro ao salvar configurações na API de fallback:', await fallbackResponse.text());
        }
      } catch (fallbackApiError) {
        console.error('Erro ao acessar API de fallback:', fallbackApiError);
      }

      // Se chegamos aqui, todas as tentativas falharam
      console.error('Todas as tentativas de salvar configurações falharam');
      return false;
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
      return false;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-abz-blue flex items-center">
          <FiSettings className="mr-2" /> Configurações de Reembolso
        </h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center">
          <FiAlertCircle className="mr-2" /> {error}
        </div>
      )}

      {isLoading ? (
        <div className="bg-white rounded-lg shadow-md p-6 flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-abz-blue"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <ReimbursementEmailSettings
            initialSettings={emailSettings}
            onSave={saveEmailSettings}
          />
        </div>
      )}
    </div>
  );
}
