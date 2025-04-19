# Guia do Administrador - Painel ABZ

Este guia fornece instruções detalhadas para administradores do Painel ABZ, explicando como gerenciar e configurar o sistema.

## Índice

1. [Acesso ao Painel Administrativo](#acesso-ao-painel-administrativo)
2. [Dashboard Administrativo](#dashboard-administrativo)
3. [Gerenciamento de Cards](#gerenciamento-de-cards)
4. [Gerenciamento de Menu](#gerenciamento-de-menu)
5. [Gerenciamento de Documentos](#gerenciamento-de-documentos)
6. [Gerenciamento de Notícias](#gerenciamento-de-notícias)
7. [Gerenciamento de Usuários](#gerenciamento-de-usuários)
8. [Configurações do Sistema](#configurações-do-sistema)

## Acesso ao Painel Administrativo

Para acessar o painel administrativo:

1. Acesse o sistema em `http://seu-dominio.com` (ou `http://localhost:3000` em ambiente de desenvolvimento)
2. Faça login com suas credenciais de administrador
   - Usuário padrão: `admin`
   - Senha padrão: `admin123`
3. Após o login, você será redirecionado para o dashboard
4. Clique no item "Administração" no menu lateral ou acesse diretamente `http://seu-dominio.com/admin`

## Dashboard Administrativo

O dashboard administrativo fornece uma visão geral do sistema e acesso rápido a todas as funcionalidades administrativas:

- **Cards**: Gerenciamento dos cards do dashboard principal
- **Menu**: Configuração dos itens do menu lateral
- **Documentos**: Gerenciamento de documentos, políticas e manuais
- **Notícias**: Gerenciamento de notícias e comunicados
- **Usuários**: Gerenciamento de usuários e permissões
- **Configurações**: Personalização do sistema

## Gerenciamento de Cards

Os cards são os elementos exibidos no dashboard principal do sistema. Para gerenciá-los:

1. Acesse `Admin > Cards`
2. Você verá a lista de todos os cards existentes

### Adicionar um Novo Card

1. Clique no botão "Adicionar Card"
2. Preencha os campos:
   - **Título**: Nome do card
   - **Descrição**: Breve descrição do conteúdo
   - **Link (URL)**: Para onde o card deve direcionar o usuário
   - **Ícone**: Selecione um ícone da lista
   - **Ordem**: Posição do card no dashboard (menor número = mais à esquerda/topo)
   - **Cor de Fundo**: Classe CSS para a cor de fundo (ex: `bg-abz-blue`)
   - **Cor de Hover**: Classe CSS para a cor ao passar o mouse (ex: `hover:bg-abz-blue-dark`)
   - **Ativo**: Se o card deve ser exibido
   - **Link Externo**: Se o link deve abrir em uma nova aba
3. Clique em "Adicionar"

### Editar um Card

1. Clique no ícone de edição (lápis) no card desejado
2. Modifique os campos necessários
3. Clique em "Salvar"

### Outras Ações

- **Ativar/Desativar**: Clique no ícone de olho para ativar ou desativar um card
- **Mover para Cima/Baixo**: Use as setas para ajustar a ordem dos cards
- **Excluir**: Clique no ícone de lixeira para remover um card (ação irreversível)

## Gerenciamento de Menu

O menu lateral é a principal forma de navegação do sistema. Para gerenciá-lo:

1. Acesse `Admin > Menu`
2. Você verá a lista de todos os itens do menu

### Adicionar um Novo Item de Menu

1. Clique no botão "Adicionar Item"
2. Preencha os campos:
   - **Título**: Nome do item no menu
   - **Link (URL)**: Para onde o item deve direcionar o usuário
   - **Ícone**: Selecione um ícone da lista
   - **Ordem**: Posição do item no menu (menor número = mais acima)
   - **Ativo**: Se o item deve ser exibido
   - **Link Externo**: Se o link deve abrir em uma nova aba
   - **Apenas Admin**: Se o item deve ser visível apenas para administradores
3. Clique em "Adicionar"

### Editar um Item de Menu

1. Clique no ícone de edição (lápis) no item desejado
2. Modifique os campos necessários
3. Clique em "Salvar"

### Outras Ações

- **Ativar/Desativar**: Clique no ícone de olho para ativar ou desativar um item
- **Mover para Cima/Baixo**: Use as setas para ajustar a ordem dos itens
- **Excluir**: Clique no ícone de lixeira para remover um item (ação irreversível)

## Gerenciamento de Documentos

Os documentos são arquivos como políticas, manuais e procedimentos disponibilizados no sistema. Para gerenciá-los:

1. Acesse `Admin > Documentos`
2. Você verá a lista de todos os documentos, com opção de filtrar por categoria

### Adicionar um Novo Documento

1. Clique no botão "Adicionar Documento"
2. Preencha os campos:
   - **Título**: Nome do documento
   - **Descrição**: Breve descrição do conteúdo
   - **Categoria**: Categoria do documento (ex: HSE, Qualidade, Manual)
   - **Idioma**: Idioma do documento
   - **Arquivo**: Upload do arquivo ou URL do documento
   - **Ordem**: Posição do documento na lista (menor número = mais acima)
   - **Ativo**: Se o documento deve ser exibido
3. Clique em "Adicionar"

### Editar um Documento

1. Clique no ícone de edição (lápis) no documento desejado
2. Modifique os campos necessários
3. Clique em "Salvar"

### Outras Ações

- **Ativar/Desativar**: Clique no ícone de olho para ativar ou desativar um documento
- **Mover para Cima/Baixo**: Use as setas para ajustar a ordem dos documentos
- **Baixar**: Clique em "Baixar" para acessar o documento
- **Excluir**: Clique no ícone de lixeira para remover um documento (ação irreversível)

## Gerenciamento de Notícias

As notícias são comunicados e informações exibidas na seção de notícias do sistema. Para gerenciá-las:

1. Acesse `Admin > Notícias`
2. Você verá a lista de todas as notícias, com opções de filtro por categoria e destaque

### Adicionar uma Nova Notícia

1. Clique no botão "Adicionar Notícia"
2. Preencha os campos:
   - **Título**: Título da notícia
   - **Descrição**: Resumo ou conteúdo da notícia
   - **Data**: Data de publicação
   - **Categoria**: Categoria da notícia (ex: Comunicados, Notícias)
   - **Autor**: Nome do autor ou departamento
   - **Arquivo**: Upload do arquivo ou URL do documento relacionado
   - **Miniatura**: Imagem de destaque (opcional)
   - **Ativo**: Se a notícia deve ser exibida
   - **Destaque**: Se a notícia deve aparecer em destaque
3. Clique em "Adicionar"

### Editar uma Notícia

1. Clique no ícone de edição (lápis) na notícia desejada
2. Modifique os campos necessários
3. Clique em "Salvar"

### Outras Ações

- **Ativar/Desativar**: Clique no ícone de olho para ativar ou desativar uma notícia
- **Destacar**: Clique no ícone de estrela para destacar ou remover destaque
- **Baixar**: Clique em "Baixar" para acessar o arquivo relacionado
- **Excluir**: Clique no ícone de lixeira para remover uma notícia (ação irreversível)

## Gerenciamento de Usuários

O sistema permite gerenciar usuários com diferentes níveis de acesso. Para gerenciá-los:

1. Acesse `Admin > Usuários`
2. Você verá a lista de todos os usuários do sistema

### Adicionar um Novo Usuário

1. Clique no botão "Adicionar Usuário"
2. Preencha os campos:
   - **Nome de Usuário**: Login do usuário (único)
   - **Nome Completo**: Nome completo do usuário
   - **E-mail**: E-mail do usuário (único)
   - **Função**: Nível de acesso (Usuário ou Administrador)
   - **Departamento**: Departamento do usuário (opcional)
   - **Avatar**: URL da imagem de perfil (opcional)
   - **Senha**: Senha de acesso
   - **Confirmar Senha**: Confirmação da senha
3. Clique em "Adicionar"

### Editar um Usuário

1. Clique no ícone de edição (lápis) no usuário desejado
2. Modifique os campos necessários
   - Para manter a senha atual, deixe os campos de senha em branco
3. Clique em "Salvar"

### Outras Ações

- **Pesquisar**: Use a barra de pesquisa para encontrar usuários
- **Excluir**: Clique no ícone de lixeira para remover um usuário (ação irreversível)
  - Nota: Não é possível excluir o próprio usuário logado

## Configurações do Sistema

As configurações permitem personalizar a aparência e informações gerais do sistema:

1. Acesse `Admin > Configurações`
2. Você verá o formulário de configurações dividido em seções

### Informações Básicas

- **Título do Site**: Nome exibido na aba do navegador e cabeçalho
- **Nome da Empresa**: Nome da empresa
- **Descrição**: Descrição breve do sistema
- **E-mail de Contato**: E-mail para contato
- **Texto do Rodapé**: Texto exibido no rodapé do site

### Aparência

- **Cor Primária**: Cor principal do sistema (ex: #005dff)
- **Cor Secundária**: Cor secundária do sistema (ex: #6339F5)
- **Logo**: Imagem da logo (upload ou URL)
- **Favicon**: Ícone exibido na aba do navegador (upload ou URL)

### Salvar Configurações

1. Após fazer as alterações desejadas, clique no botão "Salvar Configurações"
2. As alterações serão aplicadas imediatamente

## Suporte

Para suporte adicional, entre em contato com a equipe de desenvolvimento através do e-mail suporte@groupabz.com.
