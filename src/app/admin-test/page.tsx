'use client';

import { useState, useEffect } from 'react';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabase';

export default function AdminTest() {
  const { user, profile, isAdmin, hasAccess } = useSupabaseAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchUsers = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .limit(10);
        
        if (error) {
          throw error;
        }
        
        setUsers(data || []);
      } catch (err) {
        console.error('Erro ao buscar usuários:', err);
        setError(err instanceof Error ? err.message : 'Erro ao buscar usuários');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, [user]);
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Teste de Acesso do Administrador</h1>
      
      <div className="mb-6 space-y-4">
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
          <h2 className="text-lg font-medium mb-2">Informações do Usuário</h2>
          <div className="space-y-2">
            <p><strong>ID:</strong> {user?.id || 'Não autenticado'}</p>
            <p><strong>Email:</strong> {user?.email || 'N/A'}</p>
            <p><strong>Telefone:</strong> {profile?.phone_number || 'N/A'}</p>
            <p><strong>Nome:</strong> {profile?.first_name} {profile?.last_name}</p>
            <p><strong>Papel:</strong> {profile?.role || 'N/A'}</p>
            <p><strong>É Administrador:</strong> {isAdmin ? 'Sim' : 'Não'}</p>
            <p><strong>Acesso ao Módulo Admin:</strong> {hasAccess('admin') ? 'Sim' : 'Não'}</p>
          </div>
        </div>
        
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
          <h2 className="text-lg font-medium mb-2">Permissões</h2>
          <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto text-sm">
            {JSON.stringify(profile?.access_permissions || {}, null, 2)}
          </pre>
        </div>
        
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
          <h2 className="text-lg font-medium mb-2">Lista de Usuários</h2>
          
          {loading ? (
            <p>Carregando usuários...</p>
          ) : error ? (
            <p className="text-red-600">{error}</p>
          ) : users.length === 0 ? (
            <p>Nenhum usuário encontrado</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-2 px-4 text-left">ID</th>
                    <th className="py-2 px-4 text-left">Email</th>
                    <th className="py-2 px-4 text-left">Nome</th>
                    <th className="py-2 px-4 text-left">Papel</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-t">
                      <td className="py-2 px-4">{user.id.substring(0, 8)}...</td>
                      <td className="py-2 px-4">{user.email}</td>
                      <td className="py-2 px-4">{user.first_name} {user.last_name}</td>
                      <td className="py-2 px-4">{user.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-6">
        <button
          onClick={() => window.location.href = '/admin'}
          className="px-4 py-2 bg-blue-600 text-white rounded-md"
        >
          Ir para o Painel de Administração
        </button>
      </div>
    </div>
  );
}
