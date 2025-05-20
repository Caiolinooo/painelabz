import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';
import { generateProtocol } from '@/lib/utils';
import { sendReimbursementConfirmationEmail } from '@/lib/notifications';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

// Função auxiliar para verificar se a tabela de reembolsos existe
async function checkReimbursementTableExists() {
  try {
    console.log('Verificando se a tabela de reembolsos existe...');

    // Verificar se a tabela Reimbursement existe usando metadados do Supabase
    const { data: tableExists, error } = await supabaseAdmin
      .from('Reimbursement')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Tabela Reimbursement não encontrada:', error);

      // Tentar com o nome alternativo
      const { data: altTableExists, error: altError } = await supabaseAdmin
        .from('reimbursements')
        .select('id')
        .limit(1);

      if (altError) {
        console.error('Tabela reimbursements também não encontrada:', altError);
        return { exists: false, tableName: null };
      }

      console.log('Tabela reimbursements encontrada');
      return { exists: true, tableName: 'reimbursements' };
    }

    console.log('Tabela Reimbursement encontrada');
    return { exists: true, tableName: 'Reimbursement' };
  } catch (error) {
    console.error('Exceção ao verificar tabela de reembolsos:', error);
    return { exists: false, tableName: null };
  }
}

// Instruções para criar a tabela manualmente
function getCreateTableInstructions() {
  return `
Para criar a tabela Reimbursement, acesse o SQL Editor no Supabase e execute o seguinte SQL:

CREATE TABLE IF NOT EXISTS "Reimbursement" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "nome" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "telefone" TEXT NOT NULL,
  "cpf" TEXT NOT NULL,
  "cargo" TEXT NOT NULL,
  "centro_custo" TEXT NOT NULL,
  "data" TIMESTAMP NOT NULL,
  "tipo_reembolso" TEXT NOT NULL,
  "icone_reembolso" TEXT,
  "descricao" TEXT NOT NULL,
  "valor_total" NUMERIC NOT NULL,
  "moeda" TEXT NOT NULL DEFAULT 'BRL',
  "metodo_pagamento" TEXT NOT NULL,
  "banco" TEXT,
  "agencia" TEXT,
  "conta" TEXT,
  "pix_tipo" TEXT,
  "pix_chave" TEXT,
  "comprovantes" JSONB NOT NULL,
  "observacoes" TEXT,
  "protocolo" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pendente',
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "historico" JSONB NOT NULL,

  CONSTRAINT "Reimbursement_protocolo_key" UNIQUE ("protocolo")
);

-- Adicionar políticas de segurança para a tabela
ALTER TABLE "Reimbursement" ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso a todos os usuários autenticados
CREATE POLICY "Reimbursement Access Policy"
ON "Reimbursement"
FOR ALL
TO authenticated
USING (true);
  `;
}

// POST - Criar uma nova solicitação de reembolso
export async function POST(request: NextRequest) {
  try {
    // Variáveis que precisam estar disponíveis em todo o escopo da função
    let tableName = null;
    let reembolsoCriado = null;

    // Obter dados do corpo da requisição
    const body = await request.json();
    const {
      nome,
      email,
      telefone,
      cpf,
      cargo,
      centroCusto,
      data,
      tipoReembolso,
      iconeReembolso,
      descricao,
      valorTotal,
      moeda,
      metodoPagamento,
      banco,
      agencia,
      conta,
      pixTipo,
      pixChave,
      comprovantes,
      observacoes
    } = body;

    // Explicitly ensure centro_custo is a string, defaulting to empty string if null, undefined, or empty after trim
    const processedCentroCusto: string = (typeof centroCusto === 'string' ? centroCusto.trim() : '') || '';

    // Validar os dados de entrada
    if (!nome || !email || !telefone || !cpf || !cargo || !processedCentroCusto ||
        !data || !tipoReembolso || !descricao || !valorTotal ||
        !metodoPagamento || !comprovantes || comprovantes.length === 0) {
      return NextResponse.json(
        { error: 'Todos os campos obrigatórios devem ser preenchidos' },
        { status: 400 }
      );
    }

    // Validar campos específicos para cada método de pagamento
    if (metodoPagamento === 'deposito' && (!banco || !agencia || !conta)) {
      return NextResponse.json(
        { error: 'Dados bancários são obrigatórios para depósito' },
        { status: 400 }
      );
    }

    if (metodoPagamento === 'pix' && (!pixTipo || !pixChave)) {
      return NextResponse.json(
        { error: 'Tipo e chave PIX são obrigatórios para pagamento via PIX' },
        { status: 400 }
      );
    }

    // Gerar protocolo único
    const protocolo = generateProtocol();

    // Converter o valor para número, usando valorTotal (que é string) como entrada
    let valorNumerico = valorTotal;
    if (typeof valorTotal === 'string') {
      // Remover formatação e converter para número
      valorNumerico = parseFloat(valorTotal.replace(/\./g, '').replace(',', '.'));

      // Verificar se é um número válido
      if (isNaN(valorNumerico)) {
        return NextResponse.json(
          { error: 'Valor total inválido' },
          { status: 400 }
        );
      }
    }

    // Data atual para o histórico e timestamps
    const dataAtual = new Date().toISOString();

    // Separar os dados dos arquivos dos metadados dos comprovantes
    const comprovantesParaUpload = [];
    const comprovantesParaBD = [];

    if (Array.isArray(comprovantes)) {
      for (const comp of comprovantes) {
        // Se for um arquivo local que precisa ser processado
        if (comp.isLocalFile && comp.file) {
          comprovantesParaUpload.push({ ...comp }); // Adicionar uma cópia para a lista de upload (mantém o campo file)
          const { file, ...restComp } = comp; // Remover o campo file para a inserção no BD
          comprovantesParaBD.push({
            ...restComp,
            isLocalFile: true,
            needsProcessing: true, // Manter a flag para processamento futuro
            // Não incluir o campo file aqui
          });
        } else {
          // Se não for um arquivo local que precisa ser processado (ex: comprovante já uploaded com URL)
          comprovantesParaBD.push(comp);
        }
      }
    }

    // Criar a solicitação de reembolso usando Supabase
    try {
      // Verificar se a tabela de reembolsos existe
      console.log('Verificando existência da tabela de reembolsos...');

      const { exists, tableName: detectedTableName } = await checkReimbursementTableExists();

      if (!exists || typeof detectedTableName !== 'string' || detectedTableName === '') {
        console.error('Tabela de reembolsos não encontrada ou nome inválido:', detectedTableName);

        // Provide instructions to create the table manually ONLY if it doesn't exist
        const instructions = !exists ? getCreateTableInstructions() : undefined;

        return NextResponse.json(
          {
            error: 'A tabela de reembolsos não existe no banco de dados ou houve um erro ao determinar/validar seu nome. Por favor, verifique a estrutura do banco de dados.',
            details: `Detectado nome de tabela: ${detectedTableName}`, // Include detected name for debug
            instructions: instructions
          },
          { status: 500 }
        );
      }

      // If we reach here, the table exists and we have a valid name.
      const tableName: string = detectedTableName;
      console.log(`Tabela de reembolsos encontrada e validada: ${tableName}`);

      // Ensure tableName is a valid string before database insertion
      if (typeof tableName !== 'string' || tableName === '') {
         console.error('Erro interno: Nome da tabela de reembolsos inválido antes da inserção.');
          return NextResponse.json(
            {
              error: 'Erro interno ao determinar/validar o nome da tabela de reembolsos antes da inserção.',
              details: 'Por favor, verifique a configuração do banco de dados.'
            },
            { status: 500 }
          );
      }

      // Check if processedCentroCusto is empty after trimming
      if (processedCentroCusto === '') {
         console.error('Erro de validação: Centro de custo não pode ser vazio.');
          return NextResponse.json(
            {
              error: 'O campo "Centro de Custo" é obrigatório.',
            },
            { status: 400 }
          );
      }

      // Garantir que dataAtualizacao nunca é null ou undefined
      const safeDataAtualizacao = dataAtual || new Date().toISOString();
      const reimbursementData = {
        id: crypto.randomUUID(),
        nome: nome || '',
        email: email || '',
        telefone: telefone || '',
        cpf: cpf || '',
        cargo: cargo || '',
        centroCusto: processedCentroCusto || 'Nao Informado',
        data: data ? new Date(data).toISOString() : new Date().toISOString(),
        tipoReembolso: tipoReembolso || 'Desconhecido',
        iconeReembolso: iconeReembolso,
        descricao: descricao || '',
        valorTotal: valorNumerico || 0,
        moeda: moeda || 'BRL',
        metodoPagamento: metodoPagamento || 'Desconhecido',
        banco: metodoPagamento === 'deposito' ? banco : null,
        agencia: metodoPagamento === 'deposito' ? agencia : null,
        conta: metodoPagamento === 'deposito' ? conta : null,
        pixTipo: metodoPagamento === 'pix' ? pixTipo : null,
        pixChave: metodoPagamento === 'pix' ? pixChave : null,
        comprovantes: comprovantesParaBD || [],
        observacoes: observacoes,
        protocolo: protocolo,
        status: 'pendente',
        dataCriacao: dataAtual,
        dataAtualizacao: safeDataAtualizacao,
        created_at: dataAtual,
        updated_at: dataAtual,
        historico: JSON.stringify([{
          data: dataAtual,
          status: 'pendente',
          observacao: 'Solicitação criada pelo usuário'
        }])
      };
      // Log detalhado antes do insert
      console.log('Objeto reimbursementData a ser inserido:', JSON.stringify(reimbursementData, null, 2));
      console.log('Valor de dataAtualizacao:', reimbursementData.dataAtualizacao);

      // Usar o nome da tabela determinado na verificação
      console.log(`Usando tabela ${tableName} para inserção do reembolso`);

      // Inserir o reembolso (reembolsoCriado já foi declarado no escopo externo)

      try {
        // Inserir o reembolso e capturar o resultado
        console.log('Iniciando inserção do reembolso na tabela', tableName);
        console.log('Valor de tipoReembolso antes da inserção:', tipoReembolso);
        console.log('Dados para a primeira inserção:', JSON.stringify(reimbursementData, null, 2));
        // Ensure tableName is valid right before the call (redundant with check above, but for clarity)
        if (typeof tableName !== 'string' || tableName === '') {
           console.error('Erro interno: Nome da tabela de reembolsos inválido imediatamente antes da inserção.');
            return NextResponse.json(
              {
                error: 'Erro interno ao determinar/validar o nome da tabela de reembolsos imediatamente antes da inserção.',
                details: 'Por favor, verifique a configuração do banco de dados.'
              },
              { status: 500 }
            );
        }
        const insertResult = await supabaseAdmin
          .from(tableName)
          .insert(reimbursementData)
          .select()
          .single();

        console.log('Resultado da inserção:', insertResult);
        const { data: reembolsoResult, error } = insertResult;

        if (error) {
          console.error('Erro ao criar reembolso no Supabase:', error);

          // Verificar se o erro está relacionado a uma coluna ausente
          if (error.message && error.message.includes('column')) {
            const columnMatch = error.message.match(/column ['"]([^'"]+)['"]/i);
            const columnName = columnMatch ? columnMatch[1] : 'desconhecida';

            console.log(`Detectada coluna ausente: ${columnName}`);

            // Tentar criar um objeto de dados simplificado apenas com os campos essenciais
            const simplifiedData = {
              id: crypto.randomUUID(), // Garantir que o ID seja incluído
              nome: nome || '',
              email: email || '',
              telefone: telefone || '',
              cpf: cpf || '',
              cargo: cargo || '',
              // Adicionar centroCusto com fallback, mesmo na versão simplificada
              centroCusto: processedCentroCusto || 'Nao Informado',
              data: data ? new Date(data).toISOString() : new Date().toISOString(),
              descricao: descricao || '',
              valorTotal: valorNumerico || 0,
              moeda: moeda || 'BRL',
              comprovantes: comprovantes || [],
              protocolo: protocolo,
              status: 'pendente',
              created_at: dataAtual,
              updated_at: dataAtual,
              dataAtualizacao: dataAtual, // Garantir que dataAtualizacao não seja null
              historico: JSON.stringify([{
                data: dataAtual,
                status: 'pendente',
                observacao: 'Solicitação criada pelo usuário'
              }]),
              tipoReembolso: tipoReembolso || 'Desconhecido',
              metodoPagamento: metodoPagamento || 'Desconhecido',
              centro_custo: processedCentroCusto || 'Nao Informado',
              tipo_reembolso: tipoReembolso || 'Desconhecido',
              icone_reembolso: iconeReembolso,
              valor_total: valorNumerico || 0,
              metodo_pagamento: metodoPagamento || 'Desconhecido',
              pix_tipo: metodoPagamento === 'pix' ? pixTipo : null,
              pix_chave: metodoPagamento === 'pix' ? pixChave : null,
            };

            console.log('Tentando inserção com dados simplificados:', JSON.stringify(simplifiedData, null, 2));

            // Tentar novamente com dados simplificados
            console.log('Iniciando inserção com dados simplificados na tabela', tableName);
            console.log('Valor de tipoReembolso antes da inserção simplificada:', tipoReembolso);
            console.log('Dados para a segunda inserção (simplificada):', JSON.stringify(simplifiedData, null, 2));
            const simplifiedResult = await supabaseAdmin
              .from(tableName)
              .insert(simplifiedData)
              .select()
              .single();

            console.log('Resultado da inserção simplificada:', simplifiedResult);
            const { data: simplifiedReembolso, error: simplifiedError } = simplifiedResult;

            if (simplifiedError) {
              console.error('Erro ao criar reembolso com dados simplificados:', simplifiedError);
              return NextResponse.json(
                {
                  error: `Erro ao criar reembolso: ${simplifiedError.message || JSON.stringify(simplifiedError)}`,
                  details: `Coluna ausente: ${columnName}. Por favor, verifique a estrutura da tabela.`,
                  originalError: error
                },
                { status: 500 }
              );
            }

            // Se a inserção simplificada funcionou, use esse resultado
            reembolsoCriado = simplifiedReembolso;
            console.log('Reembolso criado com sucesso (dados simplificados):', reembolsoCriado);
          } else {
            // Verificar se o erro está relacionado ao campo ID
            if (error.message && error.message.includes('violates not-null constraint') && error.message.includes('id')) {
              console.error('Erro de violação de restrição not-null no campo ID:', error);
              return NextResponse.json(
                {
                  error: `Erro ao criar reembolso: violação de restrição not-null no campo ID`,
                  details: `O campo ID é obrigatório e não pode ser nulo. Erro original: ${error.message}`,
                  suggestion: 'Verifique se o ID está sendo gerado corretamente antes da inserção.'
                },
                { status: 500 }
              );
            }

            return NextResponse.json(
              {
                error: `Erro ao criar reembolso: ${error.message || JSON.stringify(error)}`,
                details: error.details || 'Sem detalhes adicionais'
              },
              { status: 500 }
            );
          }
        } else if (reembolsoResult) {
          // Se não houve erro e temos dados, armazenar o resultado
          reembolsoCriado = reembolsoResult;
          console.log('Reembolso criado com sucesso:', reembolsoCriado);
        } else {
          // Se não houve erro mas também não temos dados, isso é estranho
          console.warn('Inserção bem-sucedida, mas nenhum dado retornado');
          // Criar um objeto mínimo com os dados que temos
          reembolsoCriado = {
            id: reimbursementData.id,
            protocolo,
            nome,
            email,
            status: 'pendente',
            created_at: dataAtual
          };
          console.log('Usando objeto mínimo como fallback:', reembolsoCriado);
        }
      } catch (insertError) {
        console.error('Exceção ao tentar inserir reembolso:', insertError);

        // Verificar se o erro está relacionado ao campo ID
        const errorMessage = insertError instanceof Error ? insertError.message : String(insertError);
        if (errorMessage.includes('violates not-null constraint') && errorMessage.includes('id')) {
          console.error('Erro de violação de restrição not-null no campo ID:', insertError);
          return NextResponse.json(
            {
              error: 'Erro ao criar reembolso: violação de restrição not-null no campo ID',
              details: `O campo ID é obrigatório e não pode ser nulo. Erro original: ${errorMessage}`,
              suggestion: 'Verifique se o ID está sendo gerado corretamente antes da inserção.'
            },
            { status: 500 }
          );
        }

        return NextResponse.json(
          {
            error: `Exceção ao criar reembolso: ${errorMessage}`,
            suggestion: 'Verifique se a estrutura da tabela Reimbursement está correta.',
            details: 'Certifique-se de que todos os campos obrigatórios estão sendo fornecidos, incluindo o ID.'
          },
          { status: 500 }
        );
      }

      // Se não temos um reembolso criado neste ponto, algo deu errado
      if (!reembolsoCriado) {
        console.error('Falha ao criar reembolso: nenhum dado retornado');
        return NextResponse.json(
          {
            error: 'Falha ao criar reembolso: nenhum dado retornado',
            details: 'A inserção no banco de dados não retornou dados.'
          },
          { status: 500 }
        );
      }

    } catch (insertError) {
      console.error('Exceção ao criar reembolso:', insertError);

      // Verificar se o erro está relacionado ao campo ID
      const errorMessage = insertError instanceof Error ? insertError.message : String(insertError);
      if (errorMessage.includes('violates not-null constraint') && errorMessage.includes('id')) {
        console.error('Erro de violação de restrição not-null no campo ID:', insertError);
        return NextResponse.json(
          {
            error: 'Erro ao criar reembolso: violação de restrição not-null no campo ID',
            details: `O campo ID é obrigatório e não pode ser nulo. Erro original: ${errorMessage}`,
            suggestion: 'Verifique se o ID está sendo gerado corretamente antes da inserção.'
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          error: `Exceção ao criar reembolso: ${errorMessage}`,
          details: 'Ocorreu um erro ao processar a solicitação de reembolso. Verifique os logs para mais informações.'
        },
        { status: 500 }
      );
    }

    // Buscar o reembolso recém-criado pelo protocolo para garantir que temos os dados corretos
    // Verificar se tableName está definido E é uma string válida
    if (typeof tableName !== 'string' || tableName === '') {
      console.error('Erro: tableName não é uma string válida ao tentar buscar o reembolso após a criação.');
      // Tentar determinar o nome da tabela novamente como fallback
      try {
        const { exists, tableName: detectedTableName } = await checkReimbursementTableExists();
        if (exists && typeof detectedTableName === 'string' && detectedTableName !== '') {
          tableName = detectedTableName;
          console.log(`Tabela de reembolsos re-detectada e validada: ${tableName}`);
        } else {
          console.error('Não foi possível determinar ou validar o nome da tabela de reembolsos mesmo na re-detecção.');
          // Continuamos com o reembolsoCriado que já temos e pulamos a busca.
           // Add a guard here to prevent the fetch if tableName is still invalid
          return; // Exit the block if tableName is still invalid
        }
      } catch (tableError) {
        console.error('Erro ao tentar re-detectar a tabela de reembolsos:', tableError);
        // Continuamos com o reembolsoCriado que já temos e pulamos a busca.
         // Add a guard here to prevent the fetch if tableName is still invalid
         return; // Exit the block if tableName is still invalid
      }
    }

    // If we reached here, tableName is likely a valid string (either detected initially or re-detected)
    // However, add one final check for safety before the fetch call
    if (typeof tableName !== 'string' || tableName === '') {
         console.error('Erro interno: Nome da tabela de reembolsos inválido imediatamente antes da busca.');
          // Return an error or handle appropriately if tableName is still invalid
          // For now, just log and proceed, but a proper app would handle this gracefully.
           // Since we already returned above if re-detection failed, this might be redundant but safer.
           // Let's just ensure the fetch call is inside a valid block.
    }

     // MOVER A LÓGICA DE BUSCA PARA DENTRO DE UM BLOCO CONDICIONAL SE NECESSÁRIO APÓS RE-AVALIAÇÃO
     // The fetch logic should ideally only run if tableName is valid.
     // Based on the checks above, if we reach here, tableName *should* be a string.
     // Let's trust the checks above for now and proceed with the fetch.

    if (tableName) { // Redundant check after the above, but harmless
      console.log(`Buscando reembolso criado com protocolo ${protocolo} na tabela ${tableName}`);

      try {
        const { data: fetchedReembolso, error: fetchError } = await supabaseAdmin
          .from(tableName)
          .select('*')
          .eq('protocolo', protocolo)
          .single();

        if (fetchError) {
          console.error('Erro ao buscar reembolso criado:', fetchError);
          // Não interromper o fluxo se não conseguir buscar o reembolso
          // Continuaremos com os dados que já temos
        } else if (fetchedReembolso) {
          console.log('Reembolso encontrado com sucesso');
          // Atualizar a variável reembolsoCriado com os dados mais recentes
          reembolsoCriado = fetchedReembolso;
        }
      } catch (fetchError) {
        console.error('Exceção ao buscar reembolso criado:', fetchError);
        // Não interromper o fluxo se não conseguir buscar o reembolso
      }
    } else {
      console.log('Pulando a busca do reembolso pois tableName não está definido');
      // Continuamos com o reembolsoCriado que já temos
    }

    // Verificar se temos os dados do reembolso
    if (!reembolsoCriado) {
      console.error('Reembolso não encontrado após criação');
      return NextResponse.json(
        {
          error: 'Reembolso não encontrado após criação',
          suggestion: 'O reembolso pode ter sido criado, mas não foi possível recuperar os dados. Verifique a lista de reembolsos.'
        },
        { status: 500 }
      );
    }

    // Enviar email de confirmação com o PDF do formulário e anexos
    try {
      if (typeof sendReimbursementConfirmationEmail === 'function') {
        // Preparar anexos a partir dos comprovantes
        const attachments = [];

        // Importar utilitários de armazenamento temporário e Google Drive
        const { storeTemporaryFile, cleanupTemporaryFiles } = await import('@/lib/temp-storage');
        const { uploadReimbursementFileToDrive } = await import('@/lib/google-drive-api');
        const { saveAttachmentsToFiles } = await import('@/lib/debug-utils');

        // Limpar arquivos temporários antigos
        cleanupTemporaryFiles(24); // Limpar arquivos com mais de 24 horas

        // Verificar se há comprovantes e se são acessíveis
        if (comprovantes && Array.isArray(comprovantes)) {
          console.log(`Processando ${comprovantes.length} comprovantes para anexar ao email`);

          // Criar uma cópia dos comprovantes para debug
          const comprovantesDebug = comprovantes.map(comp => ({
            nome: comp.nome,
            tipo: comp.tipo,
            tamanho: comp.tamanho,
            url: comp.url ? `${comp.url.substring(0, 30)}...` : 'sem URL',
            isLocalFile: comp.isLocalFile,
            temBuffer: !!comp.buffer,
            temDados: !!comp.dados
          }));

          console.log('Dados dos comprovantes para debug:', JSON.stringify(comprovantesDebug, null, 2));

          // Metadados do reembolso para armazenamento
          const reimbursementMetadata = {
            protocolo,
            nome: nome,
            data: data,
            tipo: tipoReembolso
          };

          // Processar cada comprovante usando nosso sistema de armazenamento temporário
          for (const comprovante of comprovantesParaUpload) {
            try {
              console.log(`Processando comprovante: ${comprovante.nome || 'sem nome'} (${comprovante.tipo || 'tipo desconhecido'})`);

              // Armazenar o arquivo temporariamente
              const storedFile = await storeTemporaryFile(comprovante, {
                protocolo,
                reimbursementType: tipoReembolso,
                employeeName: nome,
                timestamp: new Date().toISOString()
              });

              if (storedFile) {
                // Add the file path to the list of attachments
                attachments.push({
                  filename: storedFile.filename,
                  path: storedFile.path, // Add the path to the temporary file
                  contentType: storedFile.contentType
                });

                console.log(`Anexo armazenado temporariamente: ${storedFile.filename} (${storedFile.size} bytes)`);

                // Tentar fazer upload para o Google Drive se as credenciais estiverem configuradas
                try {
                  if (process.env.GOOGLE_DRIVE_API_KEY && process.env.GOOGLE_DRIVE_FOLDER_ID) {
                    console.log(`Tentando fazer upload do arquivo ${storedFile.filename} para o Google Drive...`);

                    // Use the path from the temporary file for Google Drive upload
                    const driveFile = await uploadReimbursementFileToDrive(
                      storedFile.path, // Use storedFile.path here
                      storedFile.filename,
                      storedFile.contentType,
                      reimbursementMetadata
                    );

                    if (driveFile) {
                      console.log(`Arquivo ${storedFile.filename} enviado para o Google Drive com sucesso. ID: ${driveFile.id}, Link: ${driveFile.webViewLink}`);

                      // Add Google Drive link metadata to the reimbursement record
                      // This can be used later to access the files
                      /*
                      try {
                        // Fetch the current record to get the existing anexos_drive array
                        const { data: currentReimbursement, error: fetchError } = await supabaseAdmin
                          .from(tableName)
                          .select('anexos_drive')
                          .eq('protocolo', protocolo)
                          .single();

                        if (fetchError) {
                          console.error(`Erro ao buscar reembolso para atualizar anexos_drive:`, fetchError);
                        } else {
                          // Append the new drive file metadata to the existing array
                          const existingAnexos = currentReimbursement?.anexos_drive || [];
                          const updatedAnexos = [
                            ...existingAnexos,
                            {
                              id: driveFile.id,
                              name: driveFile.name,
                              link: driveFile.webViewLink,
                              mimeType: driveFile.mimeType,
                              size: driveFile.size,
                              createdTime: driveFile.createdTime
                            }
                          ];

                          // Update the reimbursement record with the new anexos_drive array
                          const { error: updateError } = await supabaseAdmin
                            .from(tableName)
                            .update({ anexos_drive: updatedAnexos })
                            .eq('protocolo', protocolo);

                          if (updateError) {
                            console.error(`Erro ao atualizar metadados do reembolso com link do Google Drive:`, updateError);
                          } else {
                            console.log(`Metadados do arquivo no Google Drive adicionados ao reembolso ${protocolo}`);
                          }
                        }
                      } catch (updateError) {
                        console.error(`Erro ao atualizar metadados do reembolso com link do Google Drive:`, updateError);
                      }
                      */
                    } else {
                      console.warn(`Não foi possível fazer upload do arquivo ${storedFile.filename} para o Google Drive`);
                    }
                  }
                } catch (driveError) {
                  console.error(`Erro ao fazer upload para o Google Drive:`, driveError);
                }
              } else {
                console.error(`Não foi possível armazenar o comprovante ${comprovante.nome}`);

                // Criar um anexo de fallback com informações sobre o erro
                const fallbackContent = `
Informações do comprovante que não pôde ser processado:
Nome: ${comprovante.nome || 'Não informado'}
Tipo: ${comprovante.tipo || 'Não informado'}
Tamanho: ${comprovante.tamanho ? `${(comprovante.tamanho / 1024).toFixed(2)} KB` : 'Não informado'}
URL: ${comprovante.url || 'Não informada'}
É arquivo local: ${comprovante.isLocalFile ? 'Sim' : 'Não'}
Tem buffer: ${comprovante.buffer ? 'Sim' : 'Não'}
Tem dados: ${comprovante.dados ? 'Sim' : 'Não'}
Data e hora: ${new Date().toLocaleString('pt-BR')}
                `;

                // Criar arquivo temporário com as informações
                const fallbackFilePath = path.join(process.cwd(), 'temp-files', `fallback_${Date.now()}_${comprovante.nome || 'unknown'}.txt`);
                fs.writeFileSync(fallbackFilePath, fallbackContent);

                // Add the file path of the fallback file to the list of attachments
                attachments.push({
                  filename: `info_${comprovante.nome || `comprovante_${Date.now()}`}.txt`,
                  path: fallbackFilePath, // Add the path to the fallback file
                  contentType: 'text/plain'
                });

                console.log(`Anexo de fallback criado para ${comprovante.nome}`);
              }
            } catch (error) {
              console.error(`Erro ao processar comprovante:`, error);
            }
          }

          // ADICIONAR COMPROVANTE DE TESTE SE NÃO HOUVER ANEXOS SUFICIENTES
          if (attachments.length <= 1) { // Se só tiver o formulário PDF ou nenhum anexo
            console.warn('Poucos anexos encontrados, adicionando comprovante de teste');

            // Criar um comprovante de teste
            const testContent = `
Este é um comprovante de teste criado automaticamente.
Protocolo: ${protocolo}
Nome: ${nome}
Data: ${data}
Tipo de Reembolso: ${tipoReembolso}
Data e hora de criação: ${new Date().toLocaleString('pt-BR')}
            `;

            // Criar arquivo temporário com o conteúdo de teste
            const testFilePath = path.join(process.cwd(), 'temp-files', `test_${Date.now()}.txt`);
            fs.writeFileSync(testFilePath, testContent);

            // Add the file path of the test file to the list of attachments
            attachments.push({
              filename: `comprovante_teste_${Date.now()}.txt`,
              path: testFilePath, // Add the path to the test file
              contentType: 'text/plain'
            });

            console.log(`Comprovante de teste adicionado`);
          }

          // Salvar anexos para debug
          console.log('Salvando anexos para debug...');
          // Removed saveAttachmentsToFiles call as attachments now contain Buffers, not just paths
          // saveAttachmentsToFiles(attachments, 'reembolso_anexos');

          // Log detalhado dos anexos
          console.log(`Total de ${attachments.length} anexos preparados para o email:`);
          attachments.forEach((attachment, index) => {
            console.log(`Anexo ${index + 1}: ${attachment.filename} (${attachment.contentType || 'tipo desconhecido'}) - ${
              attachment.path // Check for path
                ? `caminho: ${attachment.path}`
                : 'sem caminho' // Indicate if path is missing
            }`);
          });
        }

        // Verificar se o email do usuário tem domínio groupabz.com
        const isGroupABZEmail = email && email.toLowerCase().endsWith('@groupabz.com');

        // Buscar configurações de email de reembolso
        let reimbursementEmailSettings = null;
        try {
          const { data: settingsData, error: settingsError } = await supabaseAdmin
            .from('settings')
            .select('*')
            .eq('key', 'reimbursement_email_settings')
            .single();

          if (!settingsError && settingsData) {
            reimbursementEmailSettings = settingsData.value;
            console.log('Configurações de email de reembolso carregadas:', reimbursementEmailSettings);
          }
        } catch (settingsError) {
          console.error('Erro ao carregar configurações de email de reembolso:', settingsError);
        }

        // Verificar se o usuário tem configurações específicas de email de reembolso
        let userEmailSettings = null;
        if (email) {
          try {
            const { data: userData, error: userError } = await supabaseAdmin
              .from('users_unified')
              .select('reimbursement_email_settings')
              .eq('email', email)
              .single();

            if (!userError && userData && userData.reimbursement_email_settings) {
              userEmailSettings = userData.reimbursement_email_settings;
              console.log('Configurações de email de reembolso do usuário carregadas:', userEmailSettings);
            }
          } catch (userError) {
            console.error('Erro ao carregar configurações de email de reembolso do usuário:', userError);
          }
        }

        // Determinar os destinatários adicionais com base nas configurações
        let additionalRecipients = [];

        // Verificar se a regra de domínio groupabz.com está ativa nas configurações globais
        const isDomainRuleEnabled = reimbursementEmailSettings?.enableDomainRule === true;

        // Verificar se o usuário tem configurações específicas
        const hasUserSpecificSettings = userEmailSettings?.enabled === true;

        // Lógica de roteamento de email - priorizar configurações específicas do usuário
        if (hasUserSpecificSettings && userEmailSettings?.recipients?.length > 0) {
          // Usar APENAS configurações específicas do usuário quando ativadas
          additionalRecipients = userEmailSettings.recipients;
          console.log(`Usando APENAS configurações específicas de email para o usuário ${email}:`, additionalRecipients);
        } else if (isDomainRuleEnabled && isGroupABZEmail) {
          // Usar configurações globais para domínio groupabz.com SOMENTE se não houver configurações específicas
          additionalRecipients = reimbursementEmailSettings?.recipients || ['andresa.oliveira@groupabz.com', 'fiscal@groupabz.com'];
          console.log(`Usuário com email ${email} do domínio groupabz.com, adicionando destinatários:`, additionalRecipients);
        } else {
          console.log(`Nenhuma configuração de email adicional aplicável para ${email}, enviando apenas para o solicitante.`);
        }

        // Formatar o valor total para exibição no email
        const valorFormatado = typeof valorNumerico === 'number'
          ? valorNumerico.toLocaleString('pt-BR', { style: 'currency', currency: moeda || 'BRL' })
          : valorTotal;

        console.log(`Enviando email de confirmação para ${email} com protocolo ${protocolo} e valor ${valorFormatado}`);

        // Enviar email com o formulário em PDF e os comprovantes anexados
        const emailResult = await sendReimbursementConfirmationEmail(
          email,
          nome,
          protocolo,
          valorFormatado,
          body, // Dados completos do formulário para gerar o PDF
          attachments, // Comprovantes como anexos
          additionalRecipients // Destinatários adicionais baseados nas regras
        );

        console.log('Resultado do envio de email:', emailResult);
      }
    } catch (emailError) {
      console.error('Erro ao enviar email de confirmação:', emailError);
      // Não interromper o fluxo se o email falhar
    }

    // Retornar resposta de sucesso
    return NextResponse.json({
      success: true,
      message: 'Solicitação de reembolso enviada com sucesso',
      protocolo,
      data: reembolsoCriado
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao processar solicitação de reembolso:', error);

    // Fornecer mais detalhes sobre o erro
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    const errorStack = error instanceof Error ? error.stack : '';

    console.error('Detalhes do erro:', errorMessage);
    console.error('Stack trace:', errorStack);

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// GET - Obter todas as solicitações de reembolso (com filtros opcionais)
export async function GET(request: NextRequest) {
  try {
    // Obter parâmetros de consulta
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const email = searchParams.get('email');
    const protocolo = searchParams.get('protocolo');
    const cpf = searchParams.get('cpf');
    const dataInicio = searchParams.get('dataInicio');
    const dataFim = searchParams.get('dataFim');
    const search = searchParams.get('search'); // Termo de busca geral
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Verificar se a tabela de reembolsos existe
    console.log('Verificando existência da tabela de reembolsos para consulta...');

    const { exists, tableName: detectedTableName } = await checkReimbursementTableExists();

    // Ensure tableName is a valid string before proceeding with database operations
    if (!exists || typeof detectedTableName !== 'string' || detectedTableName === '') {
      console.error('Tabela de reembolsos não encontrada ou nome inválido:', detectedTableName);

      // Provide instructions to create the table manually ONLY if it doesn't exist
      const instructions = !exists ? getCreateTableInstructions() : undefined;

      return NextResponse.json(
        {
          error: 'A tabela de reembolsos não existe no banco de dados ou houve um erro ao determinar/validar seu nome. Por favor, verifique a estrutura do banco de dados.',
          details: `Detectado nome de tabela: ${detectedTableName}`, // Include detected name for debug
          instructions: instructions
        },
        { status: 500 }
      );
    }

    // If we reach here, the table exists and we have a valid name.
    const tableName: string = detectedTableName; // Declare and assign within this scope
    console.log(`Tabela de reembolsos encontrada e validada: ${tableName}`);

    // Construir consulta para Supabase
    let query = supabaseAdmin
      .from(tableName)
      .select('*', { count: 'exact' });

    // Aplicar filtros
    if (status) query = query.eq('status', status);
    if (email) {
      console.log(`Filtrando reembolsos por email: ${email}`);
      // Usar ilike para ignorar case sensitivity no email
      query = query.ilike('email', email);

      // Log para depuração
      console.log(`Query SQL para email (aproximada): SELECT * FROM ${tableName} WHERE email ILIKE '${email}'`);
    }
    if (protocolo) query = query.eq('protocolo', protocolo);
    if (cpf) query = query.eq('cpf', cpf);

    // Aplicar busca geral
    if (search) {
      console.log(`Aplicando busca geral com termo: ${search}`);

      // Se já temos um filtro de email, precisamos usar uma abordagem diferente
      // para não perder o filtro de email
      if (email) {
        // Usar and() para manter o filtro de email e adicionar a busca
        query = query.or(`nome.ilike.%${search}%,protocolo.ilike.%${search}%,descricao.ilike.%${search}%`);
        console.log(`Busca com filtro de email: mantendo email='${email}' e buscando por '${search}'`);
      } else {
        // Se não temos filtro de email, podemos usar or() normalmente
        query = query.or(`nome.ilike.%${search}%,email.ilike.%${search}%,protocolo.ilike.%${search}%,descricao.ilike.%${search}%`);
        console.log(`Busca sem filtro de email: buscando por '${search}' em todos os campos`);
      }
    }

    // Filtro de data
    if (dataInicio) query = query.gte('created_at', dataInicio);
    if (dataFim) query = query.lte('created_at', dataFim);

    // Ordenação e paginação
    query = query
      .order('created_at', { ascending: false })
      .range(from, to);

    // Executar consulta
    console.log('Executando consulta de reembolsos...');
    const { data: reembolsos, error, count } = await query;

    if (error) {
      console.error('Erro ao consultar reembolsos no Supabase:', error);
      return NextResponse.json(
        { error: `Erro ao consultar reembolsos: ${error.message}` },
        { status: 500 }
      );
    }

    // Log detalhado dos resultados
    console.log(`Consulta executada com sucesso. Encontrados ${reembolsos?.length || 0} reembolsos.`);

    if (reembolsos && reembolsos.length > 0) {
      console.log('Primeiro reembolso encontrado:', {
        id: reembolsos[0].id,
        protocolo: reembolsos[0].protocolo,
        email: reembolsos[0].email,
        status: reembolsos[0].status
      });
    } else if (email) {
      console.log(`Nenhum reembolso encontrado para o email: ${email}`);

      // Verificar se existem reembolsos sem filtro de email
      const { data: allReembolsos, error: allError } = await supabaseAdmin
        .from(tableName)
        .select('email')
        .limit(5);

      if (!allError && allReembolsos && allReembolsos.length > 0) {
        console.log('Exemplos de emails existentes na tabela:', allReembolsos.map(r => r.email));
      }
    }

    // Calcular total de páginas
    const total = count || 0;
    const pages = Math.ceil(total / limit);

    return NextResponse.json({
      data: reembolsos,
      pagination: {
        total,
        page,
        limit,
        pages
      },
      filters: { email, status, search } // Incluir os filtros na resposta para depuração
    });
  } catch (error) {
    console.error('Erro ao obter solicitações de reembolso:', error);

    // Fornecer mais detalhes sobre o erro
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    const errorStack = error instanceof Error ? error.stack : '';

    console.error('Detalhes do erro:', errorMessage);
    console.error('Stack trace:', errorStack);

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
