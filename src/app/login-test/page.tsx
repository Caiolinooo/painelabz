'use client';

import { useState } from 'react';
import { fetchWrapper } from '@/lib/fetch-wrapper';

export default function LoginTest() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Usar o wrapper de fetch para tratar erros de parsing JSON
      const response = await fetchWrapper.post('/api/auth/login', {
        email,
        password
      });

      console.log('Resposta do login:', response);
      
      if (response.token) {
        setMessage('Login realizado com sucesso!');
        // Armazenar o token e os dados do usuário
        localStorage.setItem('auth', 'true');
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
      } else {
        setMessage('Erro: Token não encontrado na resposta');
      }
    } catch (error: any) {
      console.error('Erro ao fazer login:', error);
      setMessage(`Erro: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Teste de Login</h1>
        
        {message && (
          <div className={`p-4 mb-4 rounded-md ${message.includes('Erro') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message}
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="seu@email.com"
              required
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="********"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Carregando...' : 'Entrar'}
          </button>
        </form>
        
        <div className="mt-4">
          <p className="text-sm text-gray-600">
            Use o email <strong>caio.correia@groupabz.com</strong> e senha <strong>Caio@2122@</strong> para testar.
          </p>
        </div>
      </div>
    </div>
  );
}
