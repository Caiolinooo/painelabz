# Sistema de Armazenamento Temporário para Anexos

Este documento descreve o sistema de armazenamento temporário para anexos de reembolso implementado no projeto.

## Visão Geral

O sistema de armazenamento temporário foi criado para resolver o problema de anexos não sendo incluídos corretamente nos emails de reembolso. Ele funciona armazenando temporariamente os arquivos no sistema de arquivos do servidor e, opcionalmente, fazendo upload para o Google Drive para armazenamento permanente.

## Componentes

O sistema é composto pelos seguintes componentes:

1. **Armazenamento Temporário** (`src/lib/temp-storage.ts`): Responsável por armazenar temporariamente os arquivos no sistema de arquivos do servidor.

2. **Integração com Google Drive** (`src/lib/google-drive.ts`): Responsável por fazer upload dos arquivos para o Google Drive para armazenamento permanente.

3. **Scripts de Utilitários**:
   - `scripts/cleanup-temp-files.js`: Remove arquivos temporários antigos.
   - `scripts/setup-google-drive.js`: Configura as credenciais do Google Drive.

## Fluxo de Funcionamento

1. Quando um usuário envia um formulário de reembolso com anexos, os arquivos são processados pelo sistema.

2. Os arquivos são armazenados temporariamente no diretório `temp-files` do servidor.

3. Os arquivos temporários são incluídos como anexos no email de reembolso.

4. Se as credenciais do Google Drive estiverem configuradas, os arquivos também são enviados para o Google Drive para armazenamento permanente.

5. Os links dos arquivos no Google Drive são armazenados no banco de dados Supabase para acesso posterior.

6. Os arquivos temporários são removidos automaticamente após um período de tempo (padrão: 24 horas).

## Configuração

### Armazenamento Temporário

O armazenamento temporário não requer configuração adicional. Os arquivos são armazenados no diretório `temp-files` na raiz do projeto.

### Google Drive (Opcional)

Para configurar a integração com o Google Drive, siga os passos abaixo:

1. Execute o script de configuração:
   ```bash
   npm run setup:drive
   ```

2. Siga as instruções para criar um projeto no Google Cloud Console e configurar as credenciais OAuth 2.0.

3. As credenciais serão salvas no arquivo `.env` do projeto.

## Manutenção

### Limpeza de Arquivos Temporários

Os arquivos temporários são removidos automaticamente quando o servidor processa novos reembolsos. No entanto, você também pode executar o script de limpeza manualmente:

```bash
npm run cleanup:temp
```

Por padrão, o script remove arquivos com mais de 24 horas. Você pode especificar um valor diferente:

```bash
npm run cleanup:temp -- 48  # Remove arquivos com mais de 48 horas
```

## Estrutura de Diretórios

- `/temp-files`: Diretório onde os arquivos temporários são armazenados.
- `/debug`: Diretório onde os arquivos de debug são armazenados.

## Considerações de Segurança

- Os arquivos temporários são armazenados no sistema de arquivos do servidor e podem conter informações sensíveis. Certifique-se de que o diretório `temp-files` não seja acessível publicamente.

- Os arquivos enviados para o Google Drive são organizados em pastas por protocolo de reembolso. Certifique-se de que as permissões de acesso ao Google Drive estejam configuradas corretamente.

## Solução de Problemas

### Arquivos não estão sendo incluídos nos emails

1. Verifique se o diretório `temp-files` existe e tem permissões de escrita.

2. Verifique os logs do servidor para ver se há erros no processamento dos arquivos.

3. Verifique se os arquivos estão sendo armazenados corretamente no diretório `temp-files`.

### Erros ao fazer upload para o Google Drive

1. Verifique se as credenciais do Google Drive estão configuradas corretamente no arquivo `.env`.

2. Verifique se a API do Google Drive está ativada no projeto do Google Cloud Console.

3. Verifique se o refresh token é válido. Se necessário, reconfigure as credenciais usando o script `setup-drive.js`.

## Limitações

- O armazenamento temporário depende do sistema de arquivos do servidor. Se o servidor for reiniciado ou o diretório `temp-files` for limpo, os arquivos temporários serão perdidos.

- A integração com o Google Drive requer configuração manual e pode estar sujeita a limites de API do Google.

## Futuras Melhorias

- Implementar um sistema de fila para processamento assíncrono de uploads para o Google Drive.

- Adicionar suporte para outros serviços de armazenamento em nuvem, como AWS S3 ou Azure Blob Storage.

- Melhorar a interface de usuário para visualização de anexos armazenados no Google Drive.
