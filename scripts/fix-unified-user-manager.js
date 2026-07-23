// Script para corrigir o componente UnifiedUserManager
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Caminho para o componente
const componentPath = path.join(process.cwd(), 'src', 'components', 'admin', 'UnifiedUserManager.tsx');

// Verificar se o arquivo existe
if (!fs.existsSync(componentPath)) {
  console.error(`Arquivo não encontrado: ${componentPath}`);
  process.exit(1);
}

// Ler o conteúdo do arquivo
const content = fs.readFileSync(componentPath, 'utf8');

// Função para adicionar melhorias ao componente
function improveComponent(content) {
  // Melhorar a função fetchUsers para lidar melhor com erros de token
  const improvedFetchUsers = `
  // Buscar usuários regulares
  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Tentar renovar o token primeiro
      try {
        const refreshToken = localStorage.getItem('token') || localStorage.getItem('abzToken');
        if (refreshToken) {
          console.log('Tentando renovar token antes de buscar usuários...');
          const refreshResponse = await fetch('/api/auth/token-refresh', {
            method: 'POST',
            headers: {
              'Authorization': \`Bearer \${refreshToken}\`,
            },
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            console.log('Token renovado com sucesso antes de buscar usuários');

            if (refreshData.token && refreshData.token !== refreshToken) {
              console.log('Atualizando token renovado no localStorage');
              localStorage.setItem('token', refreshData.token);
              // Remover o token antigo se existir
              localStorage.removeItem('abzToken');
            }
          }
        }
      } catch (refreshError) {
        console.error('Erro ao renovar token antes de buscar usuários:', refreshError);
      }

      // Obter o token (possivelmente renovado)
      const token = localStorage.getItem('token') || localStorage.getItem('abzToken');

      if (!token) {
        throw new Error('Não autorizado');
      }

      console.log('Buscando usuários com token:', token.substring(0, 10) + '...');

      // Tentar primeiro com a API do Supabase
      console.log('Iniciando requisição para /api/users/supabase...');

      // Adicionar timestamp para evitar cache
      const timestamp = new Date().getTime();
      const response = await fetch(\`/api/users/supabase?_=\${timestamp}\`, {
        method: 'GET',
        headers: {
          'Authorization': \`Bearer \${token}\`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      console.log('Resposta da API de usuários:', response.status, response.statusText);

      if (!response.ok) {
        // Se receber 401 ou 403, tentar corrigir o token e tentar novamente
        if (response.status === 401 || response.status === 403) {
          console.log('Acesso negado, tentando corrigir token...');

          try {
            const fixResponse = await fetch('/api/auth/fix-token', {
              method: 'POST',
              headers: {
                'Authorization': \`Bearer \${token}\`,
              },
            });

            if (fixResponse.ok) {
              const fixData = await fixResponse.json();
              console.log('Token corrigido com sucesso');

              if (fixData.token) {
                console.log('Usando novo token para tentar novamente');
                localStorage.setItem('token', fixData.token);
                localStorage.removeItem('abzToken');

                // Tentar novamente com o novo token
                const retryResponse = await fetch(\`/api/users/supabase?_=\${new Date().getTime()}\`, {
                  method: 'GET',
                  headers: {
                    'Authorization': \`Bearer \${fixData.token}\`,
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                  }
                });

                if (retryResponse.ok) {
                  const retryText = await retryResponse.text();
                  if (retryText && retryText.trim() !== '') {
                    try {
                      const retryData = JSON.parse(retryText);
                      console.log('Usuários recebidos após correção de token:', retryData.length);
                      setUsers(retryData);
                      setFilteredUsers(retryData);
                      setLoading(false);
                      return;
                    } catch (parseError) {
                      console.error('Erro ao analisar resposta JSON após correção de token:', parseError);
                    }
                  }
                }
              }
            }
          } catch (fixError) {
            console.error('Erro ao tentar corrigir token:', fixError);
          }
        }

        const errorText = await response.text();
        let errorData = {};

        try {
          errorData = JSON.parse(errorText);
        } catch (parseError) {
          console.error('Erro ao analisar resposta de erro:', parseError);
          console.log('Texto da resposta de erro:', errorText);
        }

        console.error('Erro ao buscar usuários:', errorData);
        throw new Error(errorData.error || \`Erro ao carregar usuários: \${response.status} \${response.statusText}\`);
      }

      const responseText = await response.text();
      console.log('Resposta recebida, tamanho:', responseText.length);

      // Verificar se a resposta está vazia
      if (!responseText || responseText.trim() === '') {
        console.error('Resposta vazia recebida da API');
        setUsers([]);
        setFilteredUsers([]);
        setError('Nenhum usuário encontrado. A resposta da API está vazia.');
        setLoading(false);
        return;
      }

      let data = [];
      try {
        data = JSON.parse(responseText);
        console.log('Usuários recebidos:', data.length);
        console.log('Amostra de usuários:', data.slice(0, 2));

        // Verificar se os dados estão no formato esperado
        if (Array.isArray(data)) {
          setUsers(data);
          setFilteredUsers(data);
        } else {
          console.error('Formato de resposta inesperado:', typeof data);
          throw new Error('Formato de resposta inesperado. Esperava um array de usuários.');
        }
      } catch (parseError) {
        console.error('Erro ao analisar resposta JSON:', parseError);
        console.log('Primeiros 100 caracteres da resposta:', responseText.substring(0, 100));
        throw new Error('Erro ao processar dados de usuários. Formato inválido.');
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      setError(\`Erro ao carregar usuários: \${error instanceof Error ? error.message : String(error)}\`);
    } finally {
      setLoading(false);
    }
  };`;

  // Melhorar a função fixToken para lidar melhor com erros
  const improvedFixToken = `
  // Função para corrigir o token manualmente
  const fixToken = async () => {
    setIsFixingToken(true);
    setError(null);
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('abzToken');

      if (!token) {
        throw new Error('Não há token para corrigir. Faça login novamente.');
      }

      // Primeiro tentar renovar o token
      console.log('Tentando renovar token manualmente...');
      const refreshResponse = await fetch('/api/auth/token-refresh', {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${token}\`,
        },
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        console.log('Token renovado com sucesso');

        if (refreshData.token && refreshData.token !== token) {
          console.log('Atualizando token renovado no localStorage');
          localStorage.setItem('token', refreshData.token);
          localStorage.removeItem('abzToken');

          setSuccessMessage('Token renovado com sucesso! Recarregando dados...');

          // Recarregar dados
          await fetchUsers();
          await fetchAuthorizedUsers();
          await fetchStats();

          return;
        }
      }

      // Se a renovação falhar, tentar corrigir o token
      console.log('Tentando corrigir token manualmente...');
      const fixResponse = await fetch('/api/auth/fix-token', {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${token}\`,
        },
      });

      if (fixResponse.ok) {
        const fixData = await fixResponse.json();
        console.log('Token corrigido com sucesso');

        if (fixData.token) {
          console.log('Atualizando token corrigido no localStorage');
          localStorage.setItem('token', fixData.token);
          localStorage.removeItem('abzToken');

          setSuccessMessage('Token corrigido com sucesso! Recarregando dados...');

          // Recarregar dados
          await fetchUsers();
          await fetchAuthorizedUsers();
          await fetchStats();
        } else {
          setError('Token corrigido, mas nenhum novo token foi gerado.');
        }
      } else {
        const errorData = await fixResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao corrigir token');
      }
    } catch (error) {
      console.error('Erro ao corrigir token:', error);
      setError(\`Erro ao corrigir token: \${error instanceof Error ? error.message : 'Erro desconhecido'}\`);
      
      // Se falhar, tentar criar um novo token para o administrador
      if (user?.email === 'caio.correia@groupabz.com' || user?.phoneNumber === '+5522997847289') {
        try {
          console.log('Tentando criar novo token para o administrador...');
          
          // Redirecionar para a página de correção de admin
          router.push('/admin-fix');
        } catch (adminFixError) {
          console.error('Erro ao tentar corrigir token de administrador:', adminFixError);
        }
      }
    } finally {
      setIsFixingToken(false);
    }
  };`;

  // Substituir as funções no conteúdo
  let updatedContent = content;

  // Substituir a função fetchUsers
  updatedContent = updatedContent.replace(
    /\/\/ Buscar usuários regulares\s+const fetchUsers = async \(\) => \{[\s\S]+?\};/,
    improvedFetchUsers
  );

  // Substituir a função fixToken
  updatedContent = updatedContent.replace(
    /\/\/ Função para corrigir o token manualmente\s+const fixToken = async \(\) => \{[\s\S]+?\};/,
    improvedFixToken
  );

  return updatedContent;
}

// Melhorar o componente
const updatedContent = improveComponent(content);

// Salvar as alterações
fs.writeFileSync(componentPath, updatedContent, 'utf8');

console.log('Componente UnifiedUserManager corrigido com sucesso!');
console.log('Melhorias implementadas:');
console.log('1. Melhor tratamento de erros na função fetchUsers');
console.log('2. Melhor tratamento de erros na função fixToken');
console.log('3. Redirecionamento automático para a página de correção de admin quando necessário');
console.log('\nPróximos passos:');
console.log('1. Reinicie o servidor de desenvolvimento');
console.log('2. Acesse a aplicação e teste o gerenciamento de usuários');
console.log('3. Se ainda houver problemas, execute o script run-all-fixes.js');
