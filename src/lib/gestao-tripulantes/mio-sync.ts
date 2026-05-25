import { supabaseAdmin } from '@/lib/supabase';
import type { GTColaborador } from '@/types/gestao-tripulantes';
import type { MIOIntegrante, MIOTreinamento, MIOEmbarque } from '@/types/mio';
import { mioClient } from '@/lib/mio/client';
import { mioSyncService } from '@/lib/mio/sync';

interface MIOConfig {
  baseUrl: string;
  token: string;
  escritaHabilitada: boolean;
}

interface MIOApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function getMIOConfig(): Promise<MIOConfig | null> {
  try {
    const supabase = supabaseAdmin;
    const { data: configRow } = await supabase
      .from('gt_configuracoes')
      .select('valor')
      .eq('chave', 'mio_integracao')
      .maybeSingle();

    if (!configRow?.valor) return null;

    const config = configRow.valor as Record<string, any>;

    return {
      baseUrl: (config.base_url as string) || '',
      token: (config.token as string) || '',
      escritaHabilitada:
        config.escrita_habilitada === true ||
        config.escrita_habilitada === 'true',
    };
  } catch (error) {
    console.error('Erro ao buscar configurações MIO:', error);
    return null;
  }
}



function mapMIOToColaborador(mio: MIOIntegrante): Partial<GTColaborador> {
  return {
    nome_completo: mio.nome,
    cpf: mio.cpf?.replace(/\D/g, ''),
    email: mio.email || undefined,
    telefone: mio.celular || mio.telefone || undefined,
    data_nascimento: cleanDate(mio.data_nascimento) || undefined,
    nome_mae: mio.nome_mae || undefined,
    nome_pai: mio.nome_pai || undefined,
    matricula: mio.matricula || undefined,
    data_admissao: cleanDate(mio.data_admissao) || undefined,
    data_demissao: cleanDate(mio.data_demissao) || undefined,
    dados_bancarios: mio.dados_bancarios || undefined,
    origem: 'mio',
    mio_id: mio.id ? String(mio.id) : undefined,
  };
}

function cleanDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const d = dateStr.trim();
  if (d === '0000-00-00' || d === '0000-00-00 00:00:00' || d === '') return null;
  return d;
}

function getStatusValidacao(dataValidade: string | null | undefined): string {
  if (!dataValidade) return 'pendente';
  const validade = new Date(dataValidade);
  const agora = new Date();
  const diffDias = Math.ceil((validade.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDias < 0) return 'vencido';
  if (diffDias <= 30) return 'vencendo';
  return 'valido';
}

export async function syncFromMIO(): Promise<{
  success: boolean;
  data?: { importados: number; atualizados: number; erros: string[] };
  error?: string;
}> {
  try {
    const supabase = supabaseAdmin;
    const integrantes = await mioClient.getIntegrantes();

    if (!integrantes || integrantes.length === 0) {
      return { success: false, error: 'Nenhum integrante retornado do MIO' };
    }

    const importados: string[] = [];
    const atualizados: string[] = [];
    const erros: string[] = [];

    for (const integrante of integrantes) {
      try {
        const cpfLimpo = integrante.cpf?.replace(/\D/g, '');
        if (!cpfLimpo) {
          console.warn(`Colaborador sem CPF ignorado: ${integrante.nome || 'sem nome'}`);
          continue;
        }

        let { data: existing } = await supabase
          .from('gt_colaboradores')
          .select('id')
          .eq('cpf', cpfLimpo)
          .is('deleted_at', null)
          .maybeSingle();

        if (!existing) {
          const { data: existingRaw } = await supabase
            .from('gt_colaboradores')
            .select('id')
            .eq('cpf', integrante.cpf)
            .is('deleted_at', null)
            .maybeSingle();
          existing = existingRaw;
        }

        const colaboradorData = mapMIOToColaborador(integrante);

        if (existing) {
          const { error: updateErr } = await supabase
            .from('gt_colaboradores')
            .update({ ...colaboradorData, updated_at: new Date().toISOString() })
            .eq('id', existing.id);

          if (updateErr) {
            erros.push(`Erro ao atualizar ${integrante.nome}: ${updateErr.message}`);
          } else {
            atualizados.push(integrante.nome);
          }
        } else {
          const { error: insertErr } = await supabase
            .from('gt_colaboradores')
            .insert(colaboradorData);

          if (insertErr) {
            erros.push(`Erro ao importar ${integrante.nome}: ${insertErr.message}`);
          } else {
            importados.push(integrante.nome);
          }
        }
      } catch (err) {
        erros.push(`Erro ao processar ${integrante.nome}: ${err}`);
      }
    }

    return {
      success: true,
      data: {
        importados: importados.length,
        atualizados: atualizados.length,
        erros,
      },
    };
  } catch (error) {
    console.error('Erro em syncFromMIO:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

export async function syncTreinamentosFromMIO(): Promise<{
  success: boolean;
  data?: { importados: number; atualizados: number; ignorados: number; erros: string[] };
  error?: string;
}> {
  try {
    const supabase = supabaseAdmin;
    const treinamentos = await mioClient.getAllTreinamentos();

    if (!treinamentos || treinamentos.length === 0) {
      return { success: false, error: 'Nenhum treinamento retornado do MIO' };
    }

    const importados: string[] = [];
    const atualizados: string[] = [];
    const ignorados: string[] = [];
    const erros: string[] = [];

    for (const tre of treinamentos) {
      try {
        const cpfLimpo = tre.cpf?.replace(/\D/g, '');
        if (!cpfLimpo) continue;

        const { data: colaborador } = await supabase
          .from('gt_colaboradores')
          .select('id')
          .eq('cpf', cpfLimpo)
          .is('deleted_at', null)
          .maybeSingle();

        if (!colaborador) {
          ignorados.push(`Colaborador não encontrado: ${tre.nome} (${cpfLimpo})`);
          continue;
        }

        const docId = `mio_treinamento_${tre.id}`;
        const dataValidade = cleanDate(tre.data_validade || tre.vencimento_em);
        const dataConclusao = cleanDate(tre.data_realizacao || tre.concluido_em);

        const { data: existingDoc } = await supabase
          .from('gt_documentos')
          .select('id')
          .eq('origem_ref', docId)
          .eq('colaborador_id', colaborador.id)
          .maybeSingle();

        const statusValidacao = getStatusValidacao(dataValidade);

        const docData = {
          colaborador_id: colaborador.id,
          tipo_documento: 'treinamento' as const,
          subtipo: tre.area || undefined,
          titulo: tre.nome_curso || tre.descricao || `Treinamento ${tre.id}`,
          descricao: tre.observacoes || undefined,
          numero_documento: tre.numero_documento || tre.codigo_treinamento || undefined,
          orgao_emissor: tre.local_realizacao || tre.instituicao || undefined,
          data_emissao: dataConclusao || undefined,
          data_validade: dataValidade || undefined,
          status_validacao: statusValidacao,
          origem: 'mio' as const,
          origem_ref: docId,
          status_revisao: 'nao_necessita' as const,
        };

        if (existingDoc) {
          const { error: updateErr } = await supabase
            .from('gt_documentos')
            .update({ ...docData, updated_at: new Date().toISOString() })
            .eq('id', existingDoc.id);

          if (updateErr) {
            erros.push(`Erro ao atualizar treinamento ${tre.nome_curso}: ${updateErr.message}`);
          } else {
            atualizados.push(tre.nome_curso);

            const { error: treUpdateErr } = await supabase
              .from('gt_documentos_treinamento')
              .update({
                nome_curso: tre.nome_curso,
                instituicao: tre.instituicao || tre.local_realizacao,
                carga_horaria: tre.carga_horaria ? Math.round(tre.carga_horaria) : null,
                tipo_curso: tre.area,
              })
              .eq('documento_id', existingDoc.id);

            if (treUpdateErr) {
              console.error(`Erro ao atualizar dados treinamento: ${treUpdateErr.message}`);
            }
          }
        } else {
          const { data: insertedDoc, error: insertErr } = await supabase
            .from('gt_documentos')
            .insert(docData)
            .select('id')
            .single();

          if (insertErr) {
            erros.push(`Erro ao importar treinamento ${tre.nome_curso}: ${insertErr.message}`);
          } else {
            importados.push(tre.nome_curso);

            const { error: treInsertErr } = await supabase
              .from('gt_documentos_treinamento')
              .insert({
                documento_id: insertedDoc.id,
                colaborador_id: colaborador.id,
                nome_curso: tre.nome_curso,
                instituicao: tre.instituicao || tre.local_realizacao,
                carga_horaria: tre.carga_horaria ? Math.round(tre.carga_horaria) : null,
                tipo_curso: tre.area,
              });

            if (treInsertErr) {
              console.error(`Erro ao inserir dados treinamento: ${treInsertErr.message}`);
            }

            // Soft-delete versão anterior do mesmo curso (mesmo título)
            const titulo = docData.titulo?.toLowerCase().trim();
            if (titulo) {
              await supabase
                .from('gt_documentos')
                .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                .eq('colaborador_id', colaborador.id)
                .eq('tipo_documento', 'treinamento')
                .is('deleted_at', null)
                .neq('id', insertedDoc.id)
                .ilike('titulo', titulo);
            }
          }
        }
      } catch (err) {
        erros.push(`Erro ao processar treinamento ${tre.nome_curso}: ${err}`);
      }
    }

    return {
      success: true,
      data: {
        importados: importados.length,
        atualizados: atualizados.length,
        ignorados: ignorados.length,
        erros,
      },
    };
  } catch (error) {
    console.error('Erro em syncTreinamentosFromMIO:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

export async function syncEmbarquesFromMIO(): Promise<{
  success: boolean;
  data?: { importados: number; atualizados: number; ignorados: number; erros: string[] };
  error?: string;
}> {
  try {
    const supabase = supabaseAdmin;
    const embarques = await mioClient.getAllEmbarques();

    if (!embarques || embarques.length === 0) {
      return { success: false, error: 'Nenhum embarque retornado do MIO' };
    }

    const importados: string[] = [];
    const atualizados: string[] = [];
    const ignorados: string[] = [];
    const erros: string[] = [];

    for (const emb of embarques) {
      try {
        const cpfLimpo = emb.cpf?.replace(/\D/g, '');
        if (!cpfLimpo) continue;

        const { data: colaborador } = await supabase
          .from('gt_colaboradores')
          .select('id')
          .eq('cpf', cpfLimpo)
          .is('deleted_at', null)
          .maybeSingle();

        if (!colaborador) {
          ignorados.push(`Colaborador não encontrado: ${emb.nome} (${cpfLimpo})`);
          continue;
        }

        const mioEmbarqueId = `mio_emb_${emb.id}_${emb.cpf}`;
        const dataEmbarque = cleanDate(emb.data_embarque);
        const dataDesembarque = cleanDate(emb.data_desembarque_real || emb.data_desembarque_prevista);
        const dataPrevistaDesembarque = cleanDate(emb.data_desembarque_prevista);

        if (!dataEmbarque) continue;

        const { data: existingEmb } = await supabase
          .from('gt_historico_embarques')
          .select('id')
          .eq('mio_embarque_id', mioEmbarqueId)
          .eq('colaborador_id', colaborador.id)
          .maybeSingle();

        const embarqueData = {
          colaborador_id: colaborador.id,
          tipo: 'normal' as const,
          data_embarque: dataEmbarque,
          data_desembarque: dataDesembarque || undefined,
          data_prevista_desembarque: dataPrevistaDesembarque || undefined,
          local_embarque: emb.origem || undefined,
          local_desembarque: emb.destino || undefined,
          observacoes: emb.rtpe_status ? `RTPE: ${emb.rtpe_status}` : undefined,
          mio_embarque_id: mioEmbarqueId,
          origem: 'mio' as const,
        };

        if (existingEmb) {
          const { error: updateErr } = await supabase
            .from('gt_historico_embarques')
            .update({ ...embarqueData })
            .eq('id', existingEmb.id);

          if (updateErr) {
            erros.push(`Erro ao atualizar embarque ${mioEmbarqueId}: ${updateErr.message}`);
          } else {
            atualizados.push(`${emb.nome} - ${dataEmbarque}`);
          }
        } else {
          const { error: insertErr } = await supabase
            .from('gt_historico_embarques')
            .insert(embarqueData);

          if (insertErr) {
            erros.push(`Erro ao importar embarque ${mioEmbarqueId}: ${insertErr.message}`);
          } else {
            importados.push(`${emb.nome} - ${dataEmbarque}`);
          }
        }

        if (emb.data_desembarque_real && !emb.data_desembarque_prevista) {
          await supabase
            .from('gt_colaboradores')
            .update({
              data_ultimo_desembarque: dataDesembarque,
              status_embarque: 'folga',
              standby: false,
              updated_at: new Date().toISOString(),
            })
            .eq('id', colaborador.id);
        } else if (emb.data_embarque && !emb.data_desembarque_real && !emb.data_desembarque_prevista) {
          await supabase
            .from('gt_colaboradores')
            .update({
              data_ultimo_embarque: dataEmbarque,
              status_embarque: 'embarcado',
              standby: false,
              updated_at: new Date().toISOString(),
            })
            .eq('id', colaborador.id);
        }
      } catch (err) {
        erros.push(`Erro ao processar embarque de ${emb.nome}: ${err}`);
      }
    }

    return {
      success: true,
      data: {
        importados: importados.length,
        atualizados: atualizados.length,
        ignorados: ignorados.length,
        erros,
      },
    };
  } catch (error) {
    console.error('Erro em syncEmbarquesFromMIO:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

export async function syncToMIO(): Promise<{
  success: boolean;
  data?: { enviados: number; erros: string[] };
  error?: string;
}> {
  try {
    const config = await getMIOConfig();
    if (!config) {
      return { success: false, error: 'MIO não configurado' };
    }

    if (!config.escritaHabilitada) {
      return { success: false, error: 'Escrita no MIO não está habilitada' };
    }

    const supabase = supabaseAdmin;

    // Fetch from the full view to get joined names (cargo_nome, empresa_nome, etc.)
    const { data: colaboradores, error } = await supabase
      .from('gt_vw_colaboradores_completo')
      .select('*')
      .is('deleted_at', null)
      .neq('origem', 'mio');

    if (error) {
      return { success: false, error: error.message };
    }

    if (!colaboradores || colaboradores.length === 0) {
      return { success: true, data: { enviados: 0, erros: [] } };
    }

    const enviados: string[] = [];
    const erros: string[] = [];

    for (const col of colaboradores) {
      try {
        // Parse banking details safely
        let bankInfo = { codigo: '', agencia: '', conta: '', tipo: '' };
        if (col.dados_bancarios) {
          try {
            const parsed = typeof col.dados_bancarios === 'string'
              ? JSON.parse(col.dados_bancarios)
              : col.dados_bancarios;
            if (parsed && typeof parsed === 'object') {
              bankInfo = {
                codigo: String(parsed.codigo || parsed.banco || parsed.codigo_banco || ''),
                agencia: String(parsed.agencia || ''),
                conta: String(parsed.conta || parsed.conta_corrente || ''),
                tipo: String(parsed.tipo || parsed.tipo_conta || '')
              };
            }
          } catch (e) {
            console.warn(`Erro ao parsear dados bancarios para colaborador ${col.nome_completo}:`, e);
          }
        }

        // Formatting dates to YYYY-MM-DD
        const formatBirthDate = col.data_nascimento ? new Date(col.data_nascimento).toISOString().split('T')[0] : '1990-01-01';
        const formatAdmissao = col.data_admissao ? new Date(col.data_admissao).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        const formatDemissao = col.data_demissao ? new Date(col.data_demissao).toISOString().split('T')[0] : '';

        // Build the nested payload required by MIO v1
        const payload = {
          id_externo: col.id,
          dados_integrante: {
            dados_pessoais: {
              cpf_tipo: 1, // 1 for CPF
              cpf: col.cpf?.replace(/\D/g, '') || '',
              nome: col.nome_completo || '',
              apelido: '',
              nacionalidade: col.nacionalidade || 'Brasil',
              naturalidade: col.naturalidade || '',
              data_nascimento: formatBirthDate,
              pis_pasep: '',
              ctps: '',
              serie_uf: 'RJ',
              identidade_rg: col.rg || '',
              orgao_emissor: '',
              cnh: '',
              nome_mae: col.nome_mae || '',
              nome_pai: col.nome_pai || '',
              peso: '',
              altura: '',
              sexo: 'Masculino', // external API required field, default to 'Masculino'
              genero: '',
              raca: '',
              estado_civil: col.estado_civil || '',
              escolaridade: '',
              deficiencia: ''
            },
            banco: bankInfo,
            endereco: {
              rua: '',
              numero: '',
              bairro: '',
              cep: '',
              complemento: '',
              ponto: '',
              cidade: 'Não Informado',
              uf: 'RJ',
              pais: 'Brasil'
            },
            contato: {
              telefone_01: col.telefone || '',
              telefone_01_tipo: col.telefone ? 'Celular' : '',
              telefone_02: '',
              telefone_02_tipo: '',
              telefone_03: '',
              telefone_03_tipo: '',
              email: col.email || ''
            }
          },
          dados_registro: {
            funcao_cargo: col.cargo_nome || 'Tripulante',
            data_admissao: formatAdmissao,
            data_demissao: formatDemissao,
            motivo_demissao: '',
            matricula: col.matricula || '',
            salario: 0,
            sindicato: '',
            hr_mes: '',
            hr_semanal: '',
            formapgto: '',
            tipo_trab: '',
            tipo_salario: '',
            categoria: '',
            regime: 'Offshore',
            escala_embarque: '',
            escala_folga: '',
            departamento: col.empresa_nome || '',
            contrato_tipo: '',
            contrato_prazo: '',
            centro_de_custo: col.centro_custo_nome || '',
            tipo_maoobra: ''
          }
        };

        let res: any = null;
        if (col.mio_id) {
          // Update existing integrante
          res = await mioClient.put('/int-integrante-upd', payload);
        } else {
          // Add new integrante
          res = await mioClient.post('/int-integrante-add', payload);
        }

        if (res) {
          enviados.push(col.nome_completo);

          const updateObj: any = { origem: 'mio', updated_at: new Date().toISOString() };
          if (!col.mio_id && res.id) {
            updateObj.mio_id = String(res.id);
          }

          // update on gt_colaboradores table
          await supabase
            .from('gt_colaboradores')
            .update(updateObj)
            .eq('id', col.id);
        } else {
          erros.push(`${col.nome_completo}: Falha no envio para o MIO (API retornou null/erro)`);
        }
      } catch (err: any) {
        erros.push(`${col.nome_completo}: ${err.message || err}`);
      }
    }

    return {
      success: true,
      data: { enviados: enviados.length, erros },
    };
  } catch (error) {
    console.error('Erro em syncToMIO:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

async function syncColaboradorUserLinks(): Promise<{ linkados: number; erros: string[] }> {
  const supabase = supabaseAdmin;
  const erros: string[] = [];
  let linkados = 0;

  try {
    const { data: semLink } = await supabase
      .from('gt_colaboradores')
      .select('id, cpf')
      .is('user_id', null)
      .not('cpf', 'is', null);

    if (!semLink || semLink.length === 0) return { linkados: 0, erros: [] };

    const cpfs = semLink.map(c => c.cpf);
    const { data: users } = await supabase
      .from('users_unified')
      .select('id, tax_id')
      .in('tax_id', cpfs);

    if (!users || users.length === 0) return { linkados: 0, erros: [] };

    const userByTaxId = new Map(users.map(u => [u.tax_id, u.id]));

    for (const col of semLink) {
      const userId = userByTaxId.get(col.cpf);
      if (userId) {
        const { error: updErr } = await supabase
          .from('gt_colaboradores')
          .update({ user_id: userId, updated_at: new Date().toISOString() })
          .eq('id', col.id);

        if (updErr) {
          erros.push(`Erro ao linkar colaborador ${col.id}: ${updErr.message}`);
        } else {
          linkados++;
        }
      }
    }
  } catch (err) {
    erros.push(`Erro ao sincronizar links: ${err}`);
  }

  return { linkados, erros };
}

export async function syncAllFromMIO(): Promise<{
  success: boolean;
  data?: {
    colaboradores: { importados: number; atualizados: number; erros: string[] };
    treinamentos: { importados: number; atualizados: number; ignorados: number; erros: string[] };
    embarques: { importados: number; atualizados: number; ignorados: number; erros: string[] };
    usuarios: { criados: number; atualizados: number; erros: string[] };
  };
  error?: string;
}> {
  console.log('[MIO Sync] Sincronizando Usuários Portal...');
  const userResult = await mioSyncService.syncEmployees().catch(e => {
    console.error('[MIO Sync] Erro ao sincronizar Usuários Portal:', e);
    return { success: false, criados: 0, atualizados: 0, erros: [e.message || String(e)] };
  });

  console.log('[MIO Sync] Iniciando sincronização de colaboradores/documentos...');

  const colResult = await syncFromMIO();
  console.log('[MIO Sync] Colaboradores:', colResult.success ? 'OK' : 'ERRO', colResult.data);

  const treResult = await syncTreinamentosFromMIO();
  console.log('[MIO Sync] Treinamentos:', treResult.success ? 'OK' : 'ERRO', treResult.data);

  const embResult = await syncEmbarquesFromMIO();
  console.log('[MIO Sync] Embarques:', embResult.success ? 'OK' : 'ERRO', embResult.data);

  console.log('[MIO Sync] Linkando colaboradores a usuários do portal...');
  const linkResult = await syncColaboradorUserLinks();
  console.log(`[MIO Sync] Colaboradores linkados: ${linkResult.linkados}`);

  const allSuccess = colResult.success && treResult.success && embResult.success && userResult.success;

  return {
    success: allSuccess,
    data: {
      colaboradores: colResult.data || { importados: 0, atualizados: 0, erros: [] },
      treinamentos: treResult.data || { importados: 0, atualizados: 0, ignorados: 0, erros: [] },
      embarques: embResult.data || { importados: 0, atualizados: 0, ignorados: 0, erros: [] },
      usuarios: {
        criados: userResult.criados || 0,
        atualizados: userResult.atualizados || 0,
        erros: userResult.erros || []
      }
    },
    error: allSuccess ? undefined : 'Alguns módulos falharam na sincronização',
  };
}
