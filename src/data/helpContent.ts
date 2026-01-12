// Help content data for the Portal ABZ Help Widget
// Based on the official Help Center document from ABZ Group

export interface HelpArticle {
    id: string;
    title: string;
    content: string;
    category: string;
    keywords: string[];
    images?: string[]; // Optional array of image paths
}

export interface HelpCategory {
    id: string;
    name: string;
    description: string;
    icon: string;
    articles: HelpArticle[];
}

export const helpCategories: HelpCategory[] = [
    // ==========================================
    // CATEGORIA: PORTAL ABZ
    // ==========================================
    {
        id: 'onboarding',
        name: 'Onboarding',
        description: 'Primeiros passos no Portal ABZ',
        icon: 'FiLogIn',
        articles: [
            {
                id: 'o-que-e-portal',
                title: 'O que é o Portal ABZ?',
                content: `
## O que é o Portal ABZ?

O **Portal ABZ** é um centro de informações exclusivo para colaboradores da ABZ Group.

### O que você encontra no portal:

- 📋 **Procedimentos** - Manuais e guias operacionais
- 📜 **Políticas** - Normas e regulamentos da empresa
- 📅 **Calendário** - Eventos e datas importantes
- 📰 **ABZ News** - Notícias e comunicados
- 💰 **Reembolsos** - Solicitação e acompanhamento
- 🎓 **Academia** - Treinamentos e cursos
- 📊 **Avaliação** - Desempenho e feedback

### Acesso

Acesse pelo link: **https://portal.groupabz.com**
        `,
                category: 'onboarding',
                keywords: ['portal', 'abz', 'o que é', 'início', 'sobre']
            },
            {
                id: 'instalar-app',
                title: 'Como fazer download do App Portal ABZ?',
                content: `
## Instalando o App Portal ABZ

O Portal ABZ pode ser instalado como um aplicativo no seu computador ou celular para acesso rápido.

### Passo a passo:

1. **Acesse o portal** pelo navegador:
   - Link: \`https://portal.groupabz.com/dashboard\`

2. **Clique no ícone de instalação**:
   - No Chrome/Edge: clique no ícone de **"Instalar aplicativo"** na barra de endereço (ao lado do ícone de lupa)

3. **Confirme a instalação**:
   - Clique em **"Instalar"**
   - Marque **"Fixar na barra de tarefas"** (opcional)
   - Clique em **"Permitir"**

4. **Pronto!**
   - O app aparecerá no seu menu iniciar e/ou área de trabalho

### Dica

Para celular, acesse o portal pelo navegador Chrome e use a opção "Adicionar à tela inicial".
        `,
                category: 'onboarding',
                keywords: ['app', 'instalar', 'download', 'aplicativo', 'pwa'],
                images: [
                    '/images/help/instalar-app-1.png',
                    '/images/help/instalar-app-2.png',
                    '/images/help/instalar-app-3.png'
                ]
            },
            {
                id: 'mudar-senha',
                title: 'Como mudar a senha inicial?',
                content: `
## Alterando sua Senha

Para maior segurança, recomendamos alterar sua senha inicial.

### Passo a passo:

1. **Clique no seu perfil** (canto inferior esquerdo da tela)

2. **Role a página até encontrar "Alterar Senha"**

3. **Preencha os campos**:
   - Senha atual
   - Nova senha (mínimo 8 caracteres)
   - Confirmar nova senha

4. **Clique em "Alterar Senha"**

### Requisitos da senha:

- ✅ Mínimo de **8 caracteres**
- ✅ Recomendado: letras, números e símbolos

### Esqueceu a senha?

Use a opção **"Esqueci minha senha"** na tela de login para receber um email de recuperação.
        `,
                category: 'onboarding',
                keywords: ['senha', 'mudar', 'alterar', 'trocar', 'password'],
                images: [
                    '/images/help/alterar-senha.png'
                ]
            },
            {
                id: 'reportar-erros',
                title: 'Como reportar erros?',
                content: `
## Reportando Erros no Portal

Encontrou um problema? Nos ajude a melhorar o portal reportando o erro.

### Passo a passo:

1. **Clique no botão de Ajuda** (ícone de interrogação no canto inferior direito)

2. **Acesse a aba "Mensagens"**

3. **Selecione "Reportar um erro/bug"**

4. **Descreva o problema**:
   - O que você estava tentando fazer
   - O que aconteceu de errado
   - Qual era o comportamento esperado

5. **Opcionalmente**:
   - Use **"Capturar Tela"** para tirar um print
   - Anexe arquivos se necessário

6. **Clique em "Enviar"**

### Dados enviados automaticamente:

- URL da página atual
- Informações do navegador
- Erros do console (se houver)
        `,
                category: 'onboarding',
                keywords: ['erro', 'bug', 'problema', 'reportar', 'ajuda'],
                images: [
                    '/images/help/reportar-erro.png'
                ]
            }
        ]
    },
    {
        id: 'reembolso',
        name: 'Reembolso',
        description: 'Solicitação e acompanhamento de reembolsos',
        icon: 'FiDollarSign',
        articles: [
            {
                id: 'preencher-formulario',
                title: 'Como preencher o formulário de reembolso?',
                content: `
## Preenchendo o Formulário de Reembolso

Siga os passos abaixo para solicitar seu reembolso corretamente.

### Passo a passo:

1. **Acesse o card "Reembolso"** no dashboard

2. **Confira seus dados pessoais**:
   - Nome, email, telefone
   - Corrija se necessário

3. **Insira seu CPF** (obrigatório)

4. **Adicione as despesas**:
   - Clique em **"Adicionar Despesa"**
   - Selecione o **tipo** (alimentação, transporte, etc.)
   - Informe a **data** da despesa
   - Digite o **valor**
   - Adicione uma **justificativa**
   - **Anexe o comprovante** (foto da nota fiscal)

5. **Adicione mais despesas se necessário**
   - Você pode incluir múltiplas despesas em um único pedido

6. **Escolha a forma de pagamento**:
   - **Depósito bancário**: informe banco, agência e conta
   - **PIX**: informe tipo e chave PIX

7. **Revise e envie**:
   - Clique em **"Enviar Solicitação"**

### Importante:

- Anexe comprovantes legíveis (nota fiscal ou cupom)
- O valor deve ser exatamente igual ao do comprovante
        `,
                category: 'reembolso',
                keywords: ['reembolso', 'formulário', 'preencher', 'despesa', 'solicitar'],
                images: [
                    '/images/help/reembolso-formulario.png',
                    '/images/help/reembolso-adicionar.png'
                ]
            },
            {
                id: 'verificar-status',
                title: 'Como verificar o status do meu reembolso?',
                content: `
## Verificando o Status do Reembolso

Acompanhe o andamento da sua solicitação de reembolso.

### Passo a passo:

1. **Acesse o card "Reembolso"** no dashboard

2. **Clique na aba "Meus Reembolsos"**

3. **Visualize suas solicitações**:
   - Cada linha mostra um pedido
   - Verifique a coluna **"Status"**

### Significado dos status:

- 🟡 **Pendente** - Aguardando análise do gestor
- 🔵 **Em Análise** - Sendo revisado
- 🟢 **Aprovado** - Aprovado, aguardando pagamento
- ✅ **Pago** - Valor depositado na sua conta
- 🔴 **Rejeitado** - Não aprovado (veja o motivo)

### Notificações:

- Você receberá um email a cada mudança de status
- Verifique também a caixa de spam
        `,
                category: 'reembolso',
                keywords: ['status', 'acompanhar', 'verificar', 'aprovado', 'pago', 'pendente'],
                images: [
                    '/images/help/reembolso-status.png'
                ]
            }
        ]
    },
    {
        id: 'contracheque',
        name: 'Contracheque',
        description: 'Acesso ao contracheque e recibos',
        icon: 'FiFileText',
        articles: [
            {
                id: 'acessar-contracheque',
                title: 'Como acessar meu contracheque?',
                content: `
## Acessando o Contracheque

O contracheque está disponível através do sistema WK Radar.

### Passo a passo:

1. **Acesse o link**:
   - \`http://wk.groupabz.com/radarwebnet\`

2. **Selecione** a opção **"Portal Empregado"**

3. **Faça login**:
   - **Usuário**: Seu CPF (apenas números)
   - **Senha**: \`1\` (no primeiro acesso)

4. **Clique em "Recibo"**

5. **Faça login novamente** (solicitação do sistema)

6. **Visualize ou imprima** seu contracheque

### Primeiro acesso:

- A senha inicial é **"1"**
- Recomendamos alterar a senha após o primeiro acesso

### Problemas de acesso?

- Verifique se o CPF está correto (sem pontos ou traços)
- Contate o RH se o problema persistir
        `,
                category: 'contracheque',
                keywords: ['contracheque', 'recibo', 'salário', 'holerite', 'wk', 'radar']
            }
        ]
    },

    // ==========================================
    // CATEGORIA: GERAL
    // ==========================================
    {
        id: 'rede-publica',
        name: 'Rede Pública (Drive Z:)',
        description: 'Acesso a arquivos e documentos compartilhados',
        icon: 'FiMonitor',
        articles: [
            {
                id: 'o-que-e-drive-z',
                title: 'O que é a Rede Pública (Z:)?',
                content: `
## Rede Pública - Drive Z:

O **Drive Z:** é o servidor interno de arquivos da ABZ Group.

### Como acessar:

1. **Abra o Explorador de Arquivos** do Windows

2. **Navegue até "Este Computador"**

3. **Procure por "Data-ABZ (Z:)"**

4. **Clique duas vezes** para abrir

### Estrutura de pastas:

- \`Z:\\1. Publico\` - Documentos públicos da empresa
- \`Z:\\1. Publico\\3. Modelos diversos\` - Templates editáveis
- \`Z:\\1. Publico\\4. Comunicação\` - Logotipos e identidade visual

### Importante:

- Nunca salve arquivos pessoais na rede pública
- Sempre crie uma **cópia** antes de editar um modelo
        `,
                category: 'rede-publica',
                keywords: ['drive', 'z', 'rede', 'público', 'arquivos', 'servidor'],
                images: [
                    '/images/help/rede-local.png',
                    '/images/help/rede-pastas.png',
                    '/images/help/rede-endereco.png'
                ]
            },
            {
                id: 'modelos-editaveis',
                title: 'Onde encontro modelos editáveis?',
                content: `
## Modelos Editáveis

Modelos de documentos padrão da empresa estão disponíveis na rede.

### Localização:

\`Z:\\1. Publico\\3. Modelos diversos\`

### O que você encontra:

- Modelos de apresentações
- Templates de documentos
- Assinatura de email padrão
- Outros formatos padrão

### Como usar:

1. **Navegue até a pasta** acima
2. **Encontre o modelo** desejado
3. **Copie o arquivo** para sua máquina ou outra pasta
4. **Edite a cópia** (nunca o original!)

> ⚠️ **Importante**: Sempre crie uma cópia antes de editar. Não modifique os arquivos originais da rede.
        `,
                category: 'rede-publica',
                keywords: ['modelo', 'template', 'editável', 'documento', 'padrão'],
                images: [
                    '/images/help/rede-modelos.png'
                ]
            },
            {
                id: 'logotipo-identidade',
                title: 'Onde encontro o logotipo e identidade visual?',
                content: `
## Logotipo e Identidade Visual

Materiais oficiais da marca ABZ Group.

### Localização:

\`Z:\\1. Publico\\4. Comunicação\`

### O que você encontra:

- 🎨 **Logotipos** em diversos formatos (PNG, JPG, PDF)
- 🔤 **Fontes** oficiais da empresa
- 🎯 **Ícones** e elementos gráficos
- 📖 **Manual da Marca** - Guia de uso da identidade visual

### Dicas:

- Use sempre os logotipos das versões mais recentes
- Consulte o manual da marca para uso correto
- Em caso de dúvidas, contate a equipe de Comunicação
        `,
                category: 'rede-publica',
                keywords: ['logo', 'logotipo', 'marca', 'identidade', 'visual', 'comunicação'],
                images: [
                    '/images/help/rede-comunicacao.png'
                ]
            }
        ]
    },
    {
        id: 'email',
        name: 'E-mail (Assinatura)',
        description: 'Configuração de assinatura de email',
        icon: 'FiFileText',
        articles: [
            {
                id: 'assinatura-outlook-classico',
                title: 'Como incluir assinatura no Outlook Clássico?',
                content: `
## Assinatura de E-mail - Outlook Clássico

Configure sua assinatura padrão da ABZ Group.

### Passo 1: Copiar o modelo

1. Acesse: \`Z:\\1. Publico\\3. Modelos diversos\`
2. Abra o arquivo: **"Assinatura de E-mail Padrão.docx"**
3. Selecione todo o conteúdo (Ctrl+A)
4. Copie (Ctrl+C)

### Passo 2: Configurar no Outlook

1. Abra o **Outlook**
2. Vá em **Arquivo** > **Opções** > **Email** > **Assinaturas**
3. Clique em **"Nova"**
4. Dê um nome (ex: "ABZ Padrão")
5. Cole a assinatura (Ctrl+V) na área de edição
6. **Atualize seus dados**:
   - Seu nome
   - Sua função/cargo
   - Seu WhatsApp (se aplicável)

### Passo 3: Definir como padrão

1. Em "Escolher assinatura padrão":
   - **Novas mensagens**: Selecione sua assinatura
   - **Respostas/encaminhamentos**: Selecione sua assinatura
2. Clique em **OK**
        `,
                category: 'email',
                keywords: ['assinatura', 'email', 'outlook', 'clássico', 'configurar'],
                images: [
                    '/images/help/outlook-menu.png',
                    '/images/help/outlook-opcoes.png',
                    '/images/help/outlook-assinatura.png'
                ]
            },
            {
                id: 'assinatura-novo-outlook',
                title: 'Como incluir assinatura no Novo Outlook?',
                content: `
## Assinatura de E-mail - Novo Outlook

Configure sua assinatura no novo Outlook (versão web/moderna).

### Passo 1: Copiar o modelo

1. Acesse: \`Z:\\1. Publico\\3. Modelos diversos\`
2. Abra: **"Assinatura de E-mail Padrão.docx"**
3. Selecione tudo (Ctrl+A) e copie (Ctrl+C)

### Passo 2: Configurar no Novo Outlook

1. Clique na **engrenagem** (Configurações) no canto superior direito
2. Vá em **Email** > **Criar e responder**
3. Role até **"Assinatura de email"**
4. Clique em **"Nova assinatura"**
5. Dê um nome (ex: "ABZ")
6. Cole a assinatura (Ctrl+V)
7. **Atualize seus dados**:
   - Nome
   - Cargo
   - WhatsApp

### Passo 3: Ativar

1. Marque a opção **"Incluir automaticamente em novas mensagens"**
2. Marque **"Incluir em respostas e encaminhamentos"**
3. Clique em **Salvar**
        `,
                category: 'email',
                keywords: ['assinatura', 'email', 'outlook', 'novo', 'web', 'configurar'],
                images: [
                    '/images/help/novo-outlook-config.png',
                    '/images/help/novo-outlook-assinatura.png',
                    '/images/help/novo-outlook-salvar.png'
                ]
            }
        ]
    },
    {
        id: 'teams',
        name: 'Teams',
        description: 'Configurações do Microsoft Teams',
        icon: 'FiMessageSquare',
        articles: [
            {
                id: 'fundo-reunioes',
                title: 'Como incluir fundo para reuniões?',
                content: `
## Fundo para Reuniões no Teams

Personalize o fundo das suas videochamadas.

### Onde encontrar fundos da ABZ:

Os fundos oficiais da ABZ estão em:
\`Z:\\1. Publico\\4. Comunicação\\Perfis e Capas\`

### Durante uma reunião:

1. Clique em **"Mais ações"** (três pontinhos)
2. Selecione **"Efeitos e avatares"** ou **"Aplicar efeitos de fundo"**
3. Escolha uma das opções:
   - **Desfocar** - Desfoca o fundo
   - **Imagem padrão** - Selecione uma das imagens do Teams
   - **Adicionar nova** - Carregue sua própria imagem

### Antes de uma reunião:

1. Ao entrar na reunião, antes de clicar em "Ingressar"
2. Ative a câmera
3. Clique em **"Filtros de fundo"**
4. Escolha ou carregue uma imagem

### Dica:

Baixe os fundos da pasta da rede para seu computador antes de usar no Teams.
        `,
                category: 'teams',
                keywords: ['teams', 'fundo', 'reunião', 'video', 'background']
            },
            {
                id: 'foto-perfil-teams',
                title: 'Como alterar foto de perfil no Teams?',
                content: `
## Alterando Foto de Perfil no Teams

Atualize sua foto de perfil para facilitar a identificação.

### Passo a passo:

1. **Abra o Teams**

2. **Clique na sua foto/iniciais** (canto superior direito)

3. **Clique na foto novamente** ou em **"Alterar foto"**

4. **Escolha uma das opções**:
   - **Carregar foto** - Selecione uma imagem do seu computador
   - **Tirar foto** - Use a webcam para tirar uma nova foto

5. **Ajuste o enquadramento** (se necessário)

6. **Clique em "Salvar"**

### Dicas para a foto:

- Use uma foto profissional
- Fundo neutro de preferência
- Rosto centralizado e visível
- Boa iluminação
        `,
                category: 'teams',
                keywords: ['teams', 'foto', 'perfil', 'avatar', 'imagem']
            }
        ]
    }
];

// Helper function to search articles
export function searchHelpArticles(query: string): HelpArticle[] {
    const lowerQuery = query.toLowerCase();
    const results: HelpArticle[] = [];

    helpCategories.forEach(category => {
        category.articles.forEach(article => {
            const matchesTitle = article.title.toLowerCase().includes(lowerQuery);
            const matchesContent = article.content.toLowerCase().includes(lowerQuery);
            const matchesKeywords = article.keywords.some(kw => kw.toLowerCase().includes(lowerQuery));

            if (matchesTitle || matchesContent || matchesKeywords) {
                results.push(article);
            }
        });
    });

    return results;
}

// Get all articles flat
export function getAllArticles(): HelpArticle[] {
    return helpCategories.flatMap(cat => cat.articles);
}

// Get article by ID
export function getArticleById(id: string): HelpArticle | undefined {
    for (const category of helpCategories) {
        const article = category.articles.find(a => a.id === id);
        if (article) return article;
    }
    return undefined;
}

// Get category by ID
export function getCategoryById(id: string): HelpCategory | undefined {
    return helpCategories.find(cat => cat.id === id);
}
