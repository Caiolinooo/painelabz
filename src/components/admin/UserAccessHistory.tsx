'use client';

import React, { useState, useEffect } from 'react';
import { FiX, FiClock, FiActivity, FiInfo, FiRefreshCw } from 'react-icons/fi';
import { AccessHistoryEntry } from '@/models/User';

interface UserAccessHistoryProps {
  userId: string;
  userName: string;
  onClose: () => void;
}

const UserAccessHistory: React.FC<UserAccessHistoryProps> = ({ userId, userName, onClose }) => {
  const [history, setHistory] = useState<AccessHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Função para formatar data
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Função para obter o histórico de acesso
  const fetchAccessHistory = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('abzToken');
      
      if (!token) {
        throw new Error('Não autorizado');
      }
      
      const response = await fetch(`/api/users/access-history?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao obter histórico de acesso');
      }
      
      const data = await response.json();
      setHistory(data.accessHistory || []);
    } catch (error) {
      console.error('Erro ao obter histórico de acesso:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // Carregar histórico ao montar o componente
  useEffect(() => {
    fetchAccessHistory();
  }, [userId]);

  // Função para obter ícone com base na ação
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return <FiClock className="text-green-500" />;
      case 'LOGOUT':
        return <FiClock className="text-red-500" />;
      case 'PASSWORD_CHANGED':
        return <FiActivity className="text-blue-500" />;
      case 'CREATED':
        return <FiActivity className="text-purple-500" />;
      case 'PERMISSIONS_UPDATED':
        return <FiActivity className="text-orange-500" />;
      default:
        return <FiInfo className="text-gray-500" />;
    }
  };

  // Função para obter descrição legível da ação
  const getActionDescription = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return 'Login no sistema';
      case 'LOGOUT':
        return 'Logout do sistema';
      case 'PASSWORD_CHANGED':
        return 'Senha alterada';
      case 'CREATED':
        return 'Usuário criado';
      case 'PERMISSIONS_UPDATED':
        return 'Permissões atualizadas';
      default:
        return action.replace(/_/g, ' ').toLowerCase();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-abz-blue">
            Histórico de Acesso - {userName}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-red-600 p-1 rounded-full hover:bg-red-100"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-4 flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-abz-blue"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
              <p>{error}</p>
              <button 
                onClick={fetchAccessHistory}
                className="mt-2 flex items-center text-abz-blue hover:text-abz-blue-dark"
              >
                <FiRefreshCw className="mr-1" /> Tentar novamente
              </button>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum registro de acesso encontrado.
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry, index) => (
                <div 
                  key={index} 
                  className="border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start">
                    <div className="mr-3 mt-1">
                      {getActionIcon(entry.action)}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium text-gray-900">
                          {getActionDescription(entry.action)}
                        </h3>
                        <span className="text-sm text-gray-500">
                          {formatDate(entry.timestamp)}
                        </span>
                      </div>
                      {entry.details && (
                        <p className="text-sm text-gray-600 mt-1">
                          {entry.details}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="border-t p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-abz-blue"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserAccessHistory;
