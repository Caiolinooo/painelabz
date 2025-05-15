# Estrutura de Documentos

Este diretório contém todos os documentos utilizados no sistema ABZ Panel.

## Estrutura de Pastas

- `/documentos/politicas/` - Documentos de políticas da empresa
- `/documentos/manuais/` - Manuais de uso e procedimentos
- `/documentos/procedimentos/` - Procedimentos operacionais
- `/documentos/noticias/` - Documentos relacionados a notícias e comunicados

## Como Adicionar Novos Documentos

1. Identifique o tipo de documento que deseja adicionar
2. Coloque o arquivo na pasta correspondente
3. Atualize as referências no código, se necessário

### Exemplo de Referência no Código

```javascript
// Para políticas
file: '/documentos/politicas/nome-do-arquivo.pdf'

// Para manuais
file: '/documentos/manuais/nome-do-arquivo.pdf'

// Para procedimentos
file: '/documentos/procedimentos/nome-do-arquivo.pdf'

// Para notícias
file: '/documentos/noticias/nome-do-arquivo.pdf'
```

## Observações Importantes

- Todos os caminhos são relativos à pasta `public/`
- Não use caminhos absolutos, pois isso pode causar problemas quando o projeto for implantado na web
- Mantenha os nomes dos arquivos descritivos e sem caracteres especiais
- Prefira usar o formato PDF para garantir compatibilidade máxima

## Visualização de Documentos

O sistema utiliza o Google Docs Viewer para exibir os documentos PDF, o que garante compatibilidade com todos os navegadores.
