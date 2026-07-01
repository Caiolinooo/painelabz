import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { supabaseAdmin } from '../src/lib/supabase';

const EXAMES = [
  { codigo: '0296', descricao: 'ACUIDADE VISUAL' },
  { codigo: '0700', descricao: 'anti-HVA IgM' },
  { codigo: '0281', descricao: 'AUDIOMETRIA TONAL' },
  { codigo: '0300', descricao: 'AVALIAÇÃO PSICOSSOCIAL' },
  { codigo: '0441', descricao: 'COPROCULTURA' },
  { codigo: '0530', descricao: 'ELETROCARDIOGRAMA' },
  { codigo: '0295', descricao: 'EXAME CLÍNICO (ASO)' },
  { codigo: '0658', descricao: 'GLICOSE' },
  { codigo: '0693', descricao: 'HEMOGRAMA COMP. C/ PLAQ.' },
  { codigo: '0997', descricao: 'LIPIDOGRAMA' },
  { codigo: '9999', descricao: 'ODONTOLÓGICO' },
  { codigo: '0974', descricao: 'PARASITOLÓGICO DE FEZES' },
  { codigo: '1075', descricao: 'RX DE COL. LOMBAR AP/PERFIL' },
  { codigo: '1430', descricao: 'RAIO X DE TÓRAX PA' },
  { codigo: '0673', descricao: 'TIPO E FATOR RH' },
  { codigo: '0113', descricao: 'ÁCIDO MANDÉLICO (URINA)' },
  { codigo: '0116', descricao: 'ÁCIDO METIL-HIPÚRICO (URINA)' },
  { codigo: '0130', descricao: 'ÁCIDO TRANS TRANS MUCÔNICO' },
  { codigo: '0455', descricao: 'CREATININA' },
  { codigo: '1086', descricao: 'RETICULÓCITOS' },
  { codigo: '1205', descricao: 'TGP' },
  { codigo: '1242', descricao: 'URÉIA' },
  { codigo: '0652', descricao: 'GGT' },
  { codigo: '1204', descricao: 'TGO' },
  { codigo: '0385', descricao: 'CHUMBO (SANGUE)' },
  { codigo: '0418', descricao: 'COBRE (SANGUE)' },
  { codigo: '1057', descricao: 'ESPIROMETRIA PPR' },
  { codigo: '0613', descricao: 'FERRO (SANGUE)' },
  { codigo: '0234', descricao: 'HBsAg' },
  { codigo: '0836', descricao: 'MANGANÊS (SANGUE)' },
  { codigo: '0290', descricao: 'AV. FUNC. VESTIB. /TESTE EQUIL.' },
  { codigo: '0536', descricao: 'ELETROENCEFALOGRAMA' },
  { codigo: '0951', descricao: 'ORTO-CRESOL – URINA' },
  { codigo: '1166', descricao: 'TESTE DE APTIDÃO FÍSICA' }
];

async function run() {
  console.log('Iniciando atualização da tabela 27...');

  console.log('Deletando registros antigos...');
  const { error: deleteError } = await supabaseAdmin
    .from('esocial_tabela_27')
    .delete()
    .neq('codigo', 'X_NENHUM');

  if (deleteError) {
    console.error('Erro ao deletar:', deleteError);
    return;
  }

  console.log('Inserindo novos registros...');
  const records = EXAMES.map(ex => ({
    codigo: ex.codigo,
    descricao: ex.descricao,
    updated_at: new Date().toISOString()
  }));

  const { error: insertError } = await supabaseAdmin
    .from('esocial_tabela_27')
    .insert(records);

  if (insertError) {
    console.error('Erro ao inserir:', insertError);
  } else {
    console.log('Registros inseridos com sucesso!');
  }
}

run();
