import { supabaseAdmin } from '@/lib/supabase';

// Helper to remove accents and uppercase for synonym matching
function normalizarTexto(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

// Synonyms map to match common medical exam acronyms and colloquial terms
const EXAME_SYNONYMS: Record<string, string> = {
  'ECG': 'ELETROCARDIOGRAMA',
  'EEG': 'ELETROENCEFALOGRAMA',
  'HEMOGRAMA': 'HEMOGRAMA COMPLETO',
  'EXAME CLINICO': 'AVALIAÇÃO CLÍNICA',
  'AVALIACAO CLINICA': 'AVALIAÇÃO CLÍNICA',
  'ANAMNESE': 'AVALIAÇÃO CLÍNICA',
  'ASO': 'AVALIAÇÃO CLÍNICA',
  'AUDIOMETRIA': 'AUDIOMETRIA TONAL LIMIAR',
  'AUDIOMETRIA OCUPACIONAL': 'AUDIOMETRIA TONAL LIMIAR',
  'RAIO X DO TORAX': 'RADIOGRAFIA DE TÓRAX',
  'RX DE TORAX': 'RADIOGRAFIA DE TÓRAX',
  'RX TORAX': 'RADIOGRAFIA DE TÓRAX',
  'ESPIROMETRIA': 'ESPIROMETRIA',
  'GLICEMIA': 'GLICEMIA DE JEJUM',
  'GLICEMIA DE JEJUM': 'GLICEMIA DE JEJUM',
  'ACUIDADE VISUAL': 'TESTE DE ACUIDADE VISUAL',
  'PSICOTECNICO': 'AVALIAÇÃO PSICOLÓGICA',
  'AVALIACAO PSICOLOGICA': 'AVALIAÇÃO PSICOLÓGICA'
};

const CBO_SYNONYMS: Record<string, string> = {
  'MOCO DE CONVES': 'Marinheiro de convés',
  'MOCO DE MAQUINAS': 'Marinheiro de máquinas',
  'MARINHEIRO DE CONVES': 'Marinheiro de convés',
  'MARINHEIRO DE MAQUINAS': 'Marinheiro de máquinas',
  'COZINHEIRO': 'Cozinheiro geral',
  'TAIFEIRO': 'Taifeiro',
  'SOLDADOR': 'Soldador',
  'PADEIRO': 'Padeiro'
};

/**
 * Busca o código correto da Tabela 27 (Procedimentos) do e-Social com base no nome do exame.
 */
export async function buscarCodigoExame(descricao: string): Promise<string | null> {
  if (!descricao) return null;

  const descLimpa = descricao.trim();

  // Se já for um código de 4 dígitos, retorna ele mesmo
  if (/^\d{4}$/.test(descLimpa)) {
    return descLimpa;
  }

  const normalizado = normalizarTexto(descLimpa);
  const termoBusca = EXAME_SYNONYMS[normalizado] || descLimpa;

  try {
    // 1. Tentar busca exata (case-insensitive)
    const { data: exata } = await supabaseAdmin
      .from('esocial_tabela_27')
      .select('codigo')
      .ilike('descricao', termoBusca)
      .limit(1);

    if (exata && exata.length > 0) {
      return exata[0].codigo;
    }

    // 2. Tentar busca parcial (ILIKE)
    const { data: parcial } = await supabaseAdmin
      .from('esocial_tabela_27')
      .select('codigo, descricao')
      .or(`descricao.ilike.%${termoBusca}%,descricao.ilike.${termoBusca}%`)
      .limit(10);

    if (parcial && parcial.length > 0) {
      // Ordenar por similaridade de tamanho (menor diferença de tamanho = melhor match)
      const ordenado = parcial.sort((a, b) => {
        const diffA = Math.abs(a.descricao.length - termoBusca.length);
        const diffB = Math.abs(b.descricao.length - termoBusca.length);
        return diffA - diffB;
      });
      return ordenado[0].codigo;
    }

    // 3. Tentar busca pelas palavras separadas (se for uma descrição longa)
    const palavras = termoBusca.split(/\s+/).filter(p => p.length > 3);
    if (palavras.length > 0) {
      const { data: porPalavras } = await supabaseAdmin
        .from('esocial_tabela_27')
        .select('codigo, descricao')
        .ilike('descricao', `%${palavras[0]}%`)
        .limit(10);

      if (porPalavras && porPalavras.length > 0) {
        const comPalavras = porPalavras.map(row => {
          const descRowUpper = row.descricao.toUpperCase();
          const count = palavras.filter(p => descRowUpper.includes(p.toUpperCase())).length;
          return { row, count };
        });
        
        comPalavras.sort((a, b) => b.count - a.count);
        if (comPalavras[0].count > 0) {
          return comPalavras[0].row.codigo;
        }
      }
    }
  } catch (error) {
    console.error('Erro ao buscar código de exame:', error);
  }

  // Fallback: se não achar e termo for original, retorna nulo
  return null;
}

/**
 * Busca o código correto da Tabela 50 (CBO) do e-Social com base na descrição do Cargo.
 */
export async function buscarCodigoCBO(descricao: string): Promise<string | null> {
  if (!descricao) return null;

  const descLimpa = descricao.trim();

  // Se já for um código CBO de 6 dígitos, retorna ele mesmo
  if (/^\d{6}$/.test(descLimpa)) {
    return descLimpa;
  }
  if (/^\d{4}-\d{2}$/.test(descLimpa)) {
    return descLimpa.replace('-', '');
  }

  const normalizado = normalizarTexto(descLimpa);
  const termoBusca = CBO_SYNONYMS[normalizado] || descLimpa;

  try {
    // 1. Tentar busca exata
    const { data: exata } = await supabaseAdmin
      .from('esocial_tabela_50')
      .select('codigo')
      .ilike('descricao', termoBusca)
      .limit(1);

    if (exata && exata.length > 0) {
      return exata[0].codigo;
    }

    // 2. Tentar busca parcial
    const { data: parcial } = await supabaseAdmin
      .from('esocial_tabela_50')
      .select('codigo, descricao')
      .or(`descricao.ilike.%${termoBusca}%,descricao.ilike.${termoBusca}%`)
      .limit(10);

    if (parcial && parcial.length > 0) {
      const ordenado = parcial.sort((a, b) => {
        const diffA = Math.abs(a.descricao.length - termoBusca.length);
        const diffB = Math.abs(b.descricao.length - termoBusca.length);
        return diffA - diffB;
      });
      return ordenado[0].codigo;
    }

    // 3. Tentar por palavras
    const palavras = termoBusca.split(/\s+/).filter(p => p.length > 3);
    if (palavras.length > 0) {
      const { data: porPalavras } = await supabaseAdmin
        .from('esocial_tabela_50')
        .select('codigo, descricao')
        .ilike('descricao', `%${palavras[0]}%`)
        .limit(10);

      if (porPalavras && porPalavras.length > 0) {
        const comPalavras = porPalavras.map(row => {
          const descRowUpper = row.descricao.toUpperCase();
          const count = palavras.filter(p => descRowUpper.includes(p.toUpperCase())).length;
          return { row, count };
        });
        
        comPalavras.sort((a, b) => b.count - a.count);
        if (comPalavras[0].count > 0) {
          return comPalavras[0].row.codigo;
        }
      }
    }
  } catch (error) {
    console.error('Erro ao buscar código CBO:', error);
  }

  return null;
}
