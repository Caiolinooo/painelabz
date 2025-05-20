'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Database } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

/**
 * Componente para criar a tabela de cards no banco de dados
 */
export function CreateCardsTable() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Função para criar a tabela de cards
  const createTable = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      setMessage('Criando tabela de cards...');

      // Chamar a API para criar a tabela
      const response = await fetch('/api/admin/cards/create-table', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar tabela de cards');
      }

      setSuccess(true);
      setMessage(data.message || 'Tabela de cards criada com sucesso');
    } catch (err) {
      console.error('Erro ao criar tabela de cards:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setMessage(null);
    } finally {
      setLoading(false);
    }
  };

  // Função para verificar se a tabela existe
  const checkTable = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      setMessage('Verificando tabela de cards...');

      // Chamar a API para verificar a tabela
      const response = await fetch('/api/admin/cards/create-table');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao verificar tabela de cards');
      }

      if (data.exists) {
        setSuccess(true);
        setMessage('A tabela de cards já existe no banco de dados');
      } else {
        setMessage('A tabela de cards não existe. Clique no botão para criá-la.');
      }
    } catch (err) {
      console.error('Erro ao verificar tabela de cards:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setMessage(null);
    } finally {
      setLoading(false);
    }
  };

  // Verificar a tabela ao montar o componente
  React.useEffect(() => {
    checkTable();
  }, []);

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <div className="flex items-center gap-2">
        <Database className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Tabela de Cards</h3>
      </div>

      <div className="text-sm text-muted-foreground">
        <p>
          Este utilitário permite criar a tabela de cards no banco de dados Supabase.
          A tabela é necessária para armazenar os cards do dashboard.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert variant="success" className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Sucesso</AlertTitle>
          <AlertDescription className="text-green-700">{message}</AlertDescription>
        </Alert>
      )}

      {message && !success && !error && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Informação</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button
          onClick={createTable}
          disabled={loading || success}
          className="bg-primary hover:bg-primary/90"
        >
          {loading ? <Spinner className="mr-2" /> : <Database className="mr-2 h-4 w-4" />}
          Criar Tabela de Cards
        </Button>

        <Button
          onClick={checkTable}
          variant="outline"
          disabled={loading}
        >
          Verificar Tabela
        </Button>
      </div>
    </div>
  );
}
