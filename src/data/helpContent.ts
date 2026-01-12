// Help content data for the Portal ABZ Help Widget
// Organized by categories matching the portal modules

export interface HelpArticle {
    id: string;
    title: string;
    content: string;
    category: string;
    keywords: string[];
}

export interface HelpCategory {
    id: string;
    name: string;
    description: string;
    icon: string;
    articles: HelpArticle[];
}

export const helpCategories: HelpCategory[] = [
    {
        id: 'primeiro-acesso',
        name: 'Primeiro Acesso',
        description: 'Como começar a usar o portal',
        icon: 'FiLogIn',
        articles: [
            {
                id: 'como-acessar',
                title: 'Como acessar o portal pela primeira vez?',
                content: `
## Primeiro Acesso ao Portal ABZ

Para acessar o portal pela primeira vez, siga estes passos:

1. **Acesse o link do portal**: Abra seu navegador e vá para o endereço fornecido pelo RH
2. **Use suas credenciais**: Insira seu email corporativo (@groupabz.com) e a senha temporária fornecida
3. **Altere sua senha**: Na primeira vez, você será solicitado a criar uma nova senha segura
4. **Preencha seu perfil**: Complete suas informações pessoais

### Problemas comuns
- Se não recebeu suas credenciais, entre em contato com o RH
- Certifique-se de usar o email completo com @groupabz.com
        `,
                category: 'primeiro-acesso',
                keywords: ['login', 'acesso', 'primeiro', 'senha', 'credenciais']
            },
            {
                id: 'esqueci-senha',
                title: 'Esqueci minha senha, o que fazer?',
                content: `
## Recuperação de Senha

Se você esqueceu sua senha:

1. Na tela de login, clique em **"Esqueci minha senha"**
2. Digite seu email corporativo
3. Você receberá um link por email para redefinir sua senha
4. Acesse o link e crie uma nova senha

### O link não chegou?
- Verifique sua pasta de spam/lixo eletrônico
- Aguarde alguns minutos e tente novamente
- Se persistir, contate o suporte técnico
        `,
                category: 'primeiro-acesso',
                keywords: ['senha', 'esqueci', 'recuperar', 'reset', 'email']
            },
            {
                id: 'alterar-dados',
                title: 'Como alterar meus dados pessoais?',
                content: `
## Alterando Dados do Perfil

Para atualizar suas informações:

1. Clique na sua **foto de perfil** no canto superior direito
2. Selecione **"Meu Perfil"**
3. Edite as informações desejadas
4. Clique em **"Salvar"**

### Dados que você pode alterar:
- Foto de perfil
- Telefone de contato
- Endereço
- Preferências de notificação

> **Nota**: Alguns dados como nome e CPF só podem ser alterados pelo RH.
        `,
                category: 'primeiro-acesso',
                keywords: ['perfil', 'dados', 'alterar', 'editar', 'foto']
            }
        ]
    },
    {
        id: 'reembolsos',
        name: 'Reembolsos',
        description: 'Solicitação e acompanhamento de reembolsos',
        icon: 'FiDollarSign',
        articles: [
            {
                id: 'solicitar-reembolso',
                title: 'Como solicitar um reembolso?',
                content: `
## Solicitando Reembolso

Para solicitar um reembolso de despesas:

1. No menu lateral, clique em **"Reembolso"**
2. Clique no botão **"Nova Solicitação"**
3. Preencha os campos obrigatórios:
   - Tipo de despesa (alimentação, transporte, etc.)
   - Data da despesa
   - Valor
   - Descrição
4. **Anexe os comprovantes** (foto da nota fiscal ou recibo)
5. Selecione o **método de pagamento** (PIX ou transferência)
6. Revise e clique em **"Enviar"**

### Dicas importantes:
- Anexe comprovantes legíveis
- Informe o valor exato do comprovante
- Guarde os originais até a aprovação
        `,
                category: 'reembolsos',
                keywords: ['reembolso', 'solicitar', 'despesa', 'nota', 'comprovante']
            },
            {
                id: 'acompanhar-status',
                title: 'Como acompanhar o status do meu reembolso?',
                content: `
## Acompanhando seu Reembolso

Para verificar o status:

1. Acesse **"Reembolso"** no menu
2. Veja a lista de todas suas solicitações
3. Cada item mostra o status atual:

| Status | Significado |
|--------|-------------|
| 🟡 Pendente | Aguardando análise |
| 🔵 Em Análise | Sendo revisado pelo gestor |
| 🟢 Aprovado | Aprovado, aguardando pagamento |
| ✅ Pago | Valor depositado na sua conta |
| 🔴 Rejeitado | Não aprovado (veja o motivo) |

Você receberá notificações por email a cada mudança de status.
        `,
                category: 'reembolsos',
                keywords: ['status', 'acompanhar', 'aprovado', 'pago', 'pendente']
            },
            {
                id: 'anexar-comprovantes',
                title: 'Quais comprovantes devo anexar?',
                content: `
## Comprovantes Aceitos

Para que seu reembolso seja aprovado, anexe comprovantes que contenham:

### Documentos válidos:
- ✅ Nota Fiscal (NF-e ou NFC-e)
- ✅ Cupom Fiscal
- ✅ Recibo com dados do estabelecimento
- ✅ Fatura detalhada

### O comprovante deve conter:
- CNPJ do estabelecimento
- Data da compra
- Descrição dos itens
- Valor total

### Não são aceitos:
- ❌ Comprovante de cartão (sem detalhes)
- ❌ Fotos ilegíveis
- ❌ Documentos rasurados
        `,
                category: 'reembolsos',
                keywords: ['comprovante', 'nota', 'fiscal', 'recibo', 'anexar']
            }
        ]
    },
    {
        id: 'avaliacao',
        name: 'Avaliação de Desempenho',
        description: 'Ciclo de avaliação e feedback',
        icon: 'FiTrendingUp',
        articles: [
            {
                id: 'preencher-autoavaliacao',
                title: 'Como preencher minha autoavaliação?',
                content: `
## Preenchendo a Autoavaliação

Durante o período de avaliação:

1. Acesse **"Avaliação"** no menu
2. Clique na avaliação pendente
3. Responda cada pergunta com atenção:
   - Use a escala de 1 a 5
   - Seja honesto em suas respostas
   - Adicione comentários quando solicitado
4. Você pode **salvar como rascunho** e continuar depois
5. Quando terminar, clique em **"Enviar"**

### Importante:
- Após enviar, não é possível editar
- Seu gestor receberá uma notificação
- Aguarde o feedback do gestor
        `,
                category: 'avaliacao',
                keywords: ['autoavaliação', 'preencher', 'enviar', 'rascunho']
            },
            {
                id: 'visualizar-feedback',
                title: 'Como visualizar o feedback do meu gestor?',
                content: `
## Visualizando Feedback

Após seu gestor concluir a avaliação:

1. Você receberá uma **notificação por email**
2. Acesse **"Avaliação"** no menu
3. Clique na avaliação concluída
4. Veja as notas e comentários do gestor
5. Você pode adicionar um **comentário final** se desejar

### O feedback inclui:
- Notas por competência
- Comentários do gestor
- Média geral
- Áreas de melhoria
        `,
                category: 'avaliacao',
                keywords: ['feedback', 'gestor', 'nota', 'comentário', 'resultado']
            }
        ]
    },
    {
        id: 'noticias',
        name: 'Notícias e Comunicados',
        description: 'Feed de notícias da empresa',
        icon: 'FiFileText',
        articles: [
            {
                id: 'ver-noticias',
                title: 'Onde vejo as notícias da empresa?',
                content: `
## Feed de Notícias

Para acompanhar as novidades:

1. Acesse **"Notícias"** no menu lateral
2. Veja os posts mais recentes no topo
3. Use os filtros para buscar por categoria
4. Clique em um post para ver os detalhes

### Interações:
- 👍 Curta posts interessantes
- 💬 Comente para interagir
- 🔗 Compartilhe com colegas
        `,
                category: 'noticias',
                keywords: ['notícias', 'feed', 'posts', 'comunicados']
            }
        ]
    },
    {
        id: 'academia',
        name: 'Academia (Treinamentos)',
        description: 'Cursos e certificados',
        icon: 'FiBook',
        articles: [
            {
                id: 'acessar-cursos',
                title: 'Como acessar os cursos disponíveis?',
                content: `
## Acessando a Academia

Para ver os treinamentos disponíveis:

1. Clique em **"Academia"** no menu
2. Navegue pelo catálogo de cursos
3. Clique em um curso para ver detalhes
4. Clique em **"Iniciar Curso"**
5. Complete as aulas no seu ritmo

### Seu progresso:
- É salvo automaticamente
- Você pode pausar e continuar depois
- Ao concluir, recebe um certificado
        `,
                category: 'academia',
                keywords: ['curso', 'treinamento', 'academia', 'aprender']
            },
            {
                id: 'certificados',
                title: 'Onde encontro meus certificados?',
                content: `
## Seus Certificados

Para acessar certificados conquistados:

1. Acesse **"Academia"**
2. Clique na aba **"Meus Certificados"**
3. Veja a lista de cursos concluídos
4. Clique em **"Baixar PDF"** para obter o certificado

Os certificados ficam disponíveis permanentemente em seu perfil.
        `,
                category: 'academia',
                keywords: ['certificado', 'diploma', 'conclusão', 'download']
            }
        ]
    },
    {
        id: 'calendario',
        name: 'Calendário',
        description: 'Eventos e feriados',
        icon: 'FiCalendar',
        articles: [
            {
                id: 'ver-eventos',
                title: 'Como ver eventos da empresa?',
                content: `
## Calendário da Empresa

Para visualizar eventos:

1. Acesse **"Calendário"** no menu
2. Navegue pelos meses
3. Clique em um evento para ver detalhes

### Tipos de eventos:
- 📅 Reuniões corporativas
- 🎉 Eventos de confraternização
- 📚 Treinamentos
- 🏖️ Feriados
        `,
                category: 'calendario',
                keywords: ['calendário', 'evento', 'feriado', 'data']
            }
        ]
    },
    {
        id: 'wkradar',
        name: 'WKRadar (Acesso Remoto)',
        description: 'Sistema de acesso remoto',
        icon: 'FiMonitor',
        articles: [
            {
                id: 'conectar-wkradar',
                title: 'Como conectar ao WKRadar?',
                content: `
## Acessando o WKRadar

O WKRadar permite acesso remoto aos sistemas da empresa:

1. Clique em **"WKRadar"** no menu
2. Aguarde o login automático
3. Você verá a área de trabalho remota
4. Use normalmente como se estivesse no escritório

### Problemas de conexão?
- Verifique sua conexão com a internet
- Tente atualizar a página
- Se persistir, clique em **"Abrir em nova janela"**

### Dicas:
- Use o modo tela cheia para melhor experiência
- O teclado funciona normalmente
- Evite conexões muito lentas
        `,
                category: 'wkradar',
                keywords: ['wkradar', 'remoto', 'acesso', 'vpn', 'conexão']
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
