export interface MIOConfig {
    baseUrl: string;
    auth: {
        username?: string;
        email?: string;
        password?: string;
        token?: string;
    };
}

// Resposta padrão da API
export interface MIOResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// --------------------------------------------------------
// Módulo Integrantes (INT)
// --------------------------------------------------------

export interface MIOIntegrante {
    id: string | number;
    cpf: string;
    nome: string;
    email?: string;
    telefone?: string;
    celular?: string;
    data_nascimento?: string;
    sexo?: string;
    estado_civil?: string;
    nome_pai?: string;
    nome_mae?: string;

    // Dados Profissionais
    matricula?: string;
    cargo?: string;
    funcao?: string;
    setor?: string;
    departamento?: string;
    data_admissao?: string;
    data_demissao?: string;
    situacao?: string; // Ativo, Afastado, etc.
    regime_trabalho?: string; // Offshore, Onshore
    base?: string;

    // Endereço
    endereco?: {
        logradouro?: string;
        numero?: string;
        complemento?: string;
        bairro?: string;
        cidade?: string;
        uf?: string;
        cep?: string;
    };

    // Dados Bancários
    dados_bancarios?: {
        banco?: string;
        agencia?: string;
        conta?: string;
        tipo_conta?: string;
    };

    // Metadados
    created_at?: string;
    updated_at?: string;
}

// --------------------------------------------------------
// Módulo SMS (Saúde, Meio Ambiente e Segurança)
// --------------------------------------------------------

export interface MIOTreinamento {
    id: string | number;
    cpf: string; // Chave de vínculo
    nome_curso: string;
    instituicao?: string;
    data_realizacao: string;
    data_validade?: string;
    status: 'valido' | 'vencido' | 'a_vencer' | 'n_a';
    carga_horaria?: number;
    anexo_url?: string; // URL do certificado
}

export interface MIOASO {
    id: string | number;
    cpf: string;
    tipo_exame: 'admissional' | 'periodico' | 'demissional' | 'retorno_trabalho' | 'mudanca_funcao';
    data_realizacao: string;
    data_validade: string;
    resultado: 'apto' | 'inapto';
    medico?: string;
    crm?: string;
    observacoes?: string;
    status: 'valido' | 'vencido' | 'a_vencer';
}

// --------------------------------------------------------
// Módulo LGP (Logística de Pessoas)
// --------------------------------------------------------

export interface MIOEmbarque {
    id: string | number;
    cpf: string;
    data_embarque: string; // Previsão ou Real
    data_desembarque_prevista?: string;
    data_desembarque_real?: string;
    local_embarque?: string;
    plataforma_unidade?: string;
    status: 'programado' | 'embarcado' | 'desembarcado' | 'cancelado';
    voo_ida?: string;
    voo_volta?: string;
}

// --------------------------------------------------------
// Calendário Unificado MIO
// --------------------------------------------------------

export interface MIOCalendarEvent {
    id: string; // ID único gerado (ex: `mio_emb_${id}`)
    mio_id: string | number;
    type: 'embarque' | 'curso' | 'aso' | 'ferias' | 'folga';
    title: string;
    start: string; // ISO Date
    end?: string;
    allDay?: boolean;
    status?: string;
    description?: string;
    color?: string; // Para UI
    cpf: string;
}
