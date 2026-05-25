import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { MIOIntegrante, MIOCalendarEvent, MIOTreinamento, MIOASO, MIOEmbarque } from '@/types/mio';

// URL Base descoberta via análise do insomnia.json
const DEFAULT_API_URL = 'https://mio.app.br/api/v1';

const MIO_CONFIG = {
    baseURL: (process.env.MIO_API_URL || DEFAULT_API_URL).replace(/\/api$/, '/api/v1').replace(/\/$/, ''),
    username: (process.env.MIO_AUTH_USER || '').replace(/["']/g, '').trim(),
    password: (process.env.MIO_AUTH_PASSWORD || '').replace(/["']/g, '').trim(),
    timeout: 20000 // 20s timeout
};

// Garantir que termina com /v1 se não tiver (caso user coloque url raiz)
if (!MIO_CONFIG.baseURL.includes('/v1')) {
    // Se terminar em /api, muda pra /api/v1. Se for só dominio, adiciona /api/v1
    if (MIO_CONFIG.baseURL.endsWith('/api')) {
        MIO_CONFIG.baseURL += '/v1';
    } else if (!MIO_CONFIG.baseURL.includes('/api')) {
        MIO_CONFIG.baseURL += '/api/v1';
    }
}
console.log('[MIO Config] Base URL:', MIO_CONFIG.baseURL);


class MioClient {
    private static instance: MioClient;
    private client: AxiosInstance;
    private token: string | null = null;
    public isConnected: boolean = false;
    public lastError: string | null = null;

    private constructor() {
        this.client = axios.create({
            baseURL: MIO_CONFIG.baseURL,
            timeout: MIO_CONFIG.timeout,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        // Interceptor para adicionar token se existir
        this.client.interceptors.request.use(async (config) => {
            if (this.token) {
                config.headers.Authorization = `Bearer ${this.token}`;
            }
            return config;
        });
    }

    public static getInstance(): MioClient {
        if (!MioClient.instance) {
            MioClient.instance = new MioClient();
        }
        return MioClient.instance;
    }

    // Autenticação
    private async authenticate(): Promise<boolean> {
        if (!MIO_CONFIG.username || !MIO_CONFIG.password) {
            this.lastError = 'Credenciais MIO não configuradas (.env)';
            return false;
        }

        try {
            console.log(`[MIO Auth] Tentando autenticar em ${MIO_CONFIG.baseURL}/authenticate...`);

            // Encode credentials for Basic Auth manually to ensure correctness
            const credentials = Buffer.from(`${MIO_CONFIG.username}:${MIO_CONFIG.password}`).toString('base64');

            const response = await axios.post(`${MIO_CONFIG.baseURL}/authenticate`, {}, {
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000,
                validateStatus: null // Capture all status codes
            });

            if (response.status === 200 && response.data) {
                // Token acquisition
                this.token = response.data.token || response.data.access_token || response.data.key;

                if (this.token) {
                    console.log('[MIO Auth] Token obtido com sucesso.');
                    this.isConnected = true;
                    this.lastError = null;
                    return true;
                } else {
                    console.error('[MIO Auth] Token não encontrado na resposta:', response.data);
                    this.lastError = 'Token não encontrado na resposta da API.';
                    return false;
                }
            }

            // Handle expected errors
            console.warn(`[MIO Auth] Falha login: ${response.status}`, response.data);

            if (response.status === 401) {
                const msg = response.data?.message || 'Acesso Negado';
                this.lastError = `Erro 401: ${msg}`; // Will capture "Usuário não cadastrado"
            } else {
                this.lastError = `Falha na autenticação: HTTP ${response.status}`;
            }

            this.isConnected = false;
            return false;

        } catch (error: any) {
            console.error('[MIO Auth] Erro de conexão:', error.message);
            this.lastError = `Erro de conexão: ${error.message}`;
            this.isConnected = false;
            return false;
        }
    }

    // Wrapper seguro para requisições com retry de auth
    private async request<T>(config: AxiosRequestConfig, retry = true): Promise<T | null> {
        // Se não tem token, tenta autenticar antes
        if (!this.token && retry) {
            await this.authenticate();
        }

        try {
            const response = await this.client.request<T>(config);
            this.isConnected = true;
            return response.data;
        } catch (error: any) {
            // Se der 401, tenta reautenticar uma vez
            if (error.response?.status === 401 && retry) {
                console.log('[MIO API] 401 Detectado. Renovando token...');
                this.token = null; // Limpa token inválido
                const authSuccess = await this.authenticate();
                if (authSuccess) {
                    return this.request<T>(config, false); // Tenta de novo sem loop
                }
            }

            const status = error.response ? error.response.status : 'Network Error';
            const msg = `[MIO API Error] ${config.method?.toUpperCase()} ${config.url}: ${status} - ${error.message}`;
            console.error(msg);
            this.lastError = msg;

            this.isConnected = false;
            return null;
        }
    }

    public async post<T>(url: string, data: any, config?: AxiosRequestConfig): Promise<T | null> {
        return this.request<T>({
            method: 'POST',
            url,
            data,
            ...config
        });
    }

    public async put<T>(url: string, data: any, config?: AxiosRequestConfig): Promise<T | null> {
        return this.request<T>({
            method: 'PUT',
            url,
            data,
            ...config
        });
    }

    // --- Endpoints de Integração ---

    // 1. Integrantes
    async getIntegrantes(): Promise<MIOIntegrante[]> {
        const result = await this.request<any>({
            method: 'POST',
            url: '/int-integrante-get',
            data: {}
        });
        let list = this.normalizeResponse<any>(result, 'integrante');

        // A API pode retornar em estrutura aninhada
        if (list.length === 0 && Array.isArray(result?.integrante)) {
            list = result.integrante;
        }

        return list.map(item => ({
            ...item,
            cpf: item.cpf || item.cpf_numero || '',
            nome: item.nome || item.nome_completo || '',
            cargo: item.cargo || item.cargo_funcao || item.funcao || '',
            base: item.base || item.embarcacao || '',
            departamento: item.departamento || item.centro_custo || item.empresa || ''
        }));
    }

    // 2. Calendário Unificado
    // Atualizado para usar lógica mais robusta na obtenção
    async getCalendarEvents(userCpf?: string): Promise<MIOCalendarEvent[]> {
        const events: MIOCalendarEvent[] = [];

        // Embarques
        const embarques = await this.getEmbarques(userCpf);
        embarques.forEach(e => {
            // Mapear status para cores
            let color = '#4169E1'; // Programado (Azul)
            if (e.status === 'embarcado') color = '#0000CD'; // MediumBlue
            if (e.status === 'desembarcado') color = '#808080'; // Gray

            events.push({
                id: `mio_emb_${e.id}`,
                mio_id: e.id,
                cpf: e.cpf,
                type: 'embarque',
                title: `Embarque ${e.plataforma_unidade || ''}`,
                start: e.data_embarque,
                end: e.data_desembarque_prevista || e.data_desembarque_real,
                allDay: true,
                description: `${e.local_embarque || ''} -> ${e.plataforma_unidade || ''} (${e.status})`,
                color
            });
        });

        // Cursos e ASO (se tiver CPF, pq a API cobra CPF no endpoint GET /sms-...)
        // A doc diz: /sms-treinamento-registro-get/<cpf ou all>
        // Vou tentar passar 'all' se não tiver CPF
        const cpfParam = userCpf || 'all';

        // Treinamentos
        const treinamentos = await this.getTreinamentos(cpfParam);
        treinamentos.forEach(t => {
            if (!t.data_validade) return;

            // Verificar vencimento
            const validade = new Date(t.data_validade);
            const agora = new Date();
            const diasParaVencer = Math.ceil((validade.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24));

            // Regra de negócio: Mostrar apenas se estiver vencido ou vencendo em 90 dias
            if (diasParaVencer > 90) return;

            let color = '#FFD700'; // Gold (A vencer)
            if (diasParaVencer <= 0) color = '#FF0000'; // Red (Vencido)
            else if (diasParaVencer <= 30) color = '#FF8C00'; // DarkOrange (Crítico)

            events.push({
                id: `mio_tr_${t.id}`,
                mio_id: t.id,
                cpf: t.cpf,
                type: 'curso',
                title: `Curso: ${t.nome_curso}`,
                start: t.data_validade, // Mostra na data de validade
                allDay: true,
                description: `Validade: ${t.data_validade} (Status: ${t.status})`,
                color
            });
        });

        return events;
    }

    // 3. Treinamentos (SMS)
    async getTreinamentos(cpfOrAll: string): Promise<MIOTreinamento[]> {
        const result = await this.request<any>({
            method: 'GET',
            url: `/sms-treinamento-registro-get/${cpfOrAll}`
        });
        const list = this.normalizeResponse<any>(result, 'fornecedor');
        return list.map(item => ({
            id: item.ID || item.id || '',
            cpf: item.CPF || item.cpf || '',
            nome: item.Nome || item.nome || '',
            matricula: item.Matrícula || item.matricula,
            centro_custo: item['Centro de Custo'] || item.centro_custo,
            uo_plataforma: item['UO/Plat.'] || item.uo_plataforma,
            funcao: item.Função || item.funcao,
            id_treinamento: item['ID Treinamento'] || item.id_treinamento,
            codigo_treinamento: item['Código Treinamento'] || item.codigo_treinamento,
            codigo_treinamento_externo: item['Código Treinamento Externo'] || item.codigo_treinamento_externo,
            nome_curso: item.Descrição || item.nome_curso || item.descricao || '',
            descricao: item.Descrição || item.descricao,
            area: item.Área || item.area,
            local: item.Local || item.local,
            instituicao: item['Local de Realização'] || item.instituicao,
            data_realizacao: item['Concluído Em'] || item.concluido_em || item.data_realizacao || '',
            data_validade: item['Vencimento Em'] || item.vencimento_em || item.data_validade,
            status: item.Status || item.status || 'n_a',
            carga_horaria: item['Carga Horária'] ? Math.round(Number(item['Carga Horária'])) : item.carga_horaria,
            validade_dias: item['Validade (Dias)'] ? Number(item['Validade (Dias)']) : item.validade_dias,
            bloqueio_embarque: item['Bloqueio Embarque'] || item.bloqueio_embarque,
            treinamento_ativo: item['Treinamento Ativo'] || item.treinamento_ativo,
            cadastrado_em: item['Cadastrado Em'] || item.cadastrado_em,
            cadastrado_por: item['Cadastrado Por'] || item.cadastrado_por,
            agendamento_inicio: item['Agendamento Início'] || item.agendamento_inicio,
            agendamento_fim: item['Agendamento Fim'] || item.agendamento_fim,
            concluido_em: item['Concluído Em'] || item.concluido_em,
            vencimento_em: item['Vencimento Em'] || item.vencimento_em,
            local_realizacao: item['Local de Realização'] || item.local_realizacao,
            numero_documento: item['Nº Documento'] || item.numero_documento,
            tipo_documento: item['Tipo de Documento'] || item.tipo_documento,
            observacoes: item.Observações || item.observacoes,
            contem_anexo: item['Contém Anexo?'] || item.contem_anexo,
        }));
    }

    // 4. ASO (SMS) - Endpoint é apenas para criação, não há GET para listar
    // Para listar ASOs, usar o endpoint de documentos do colaborador
    async getASOs(cpf?: string): Promise<MIOASO[]> {
        // Sem endpoint de listagem disponível na API MIO
        // ASOs devem ser sincronizados via upload manual ou PoliWeb
        return [];
    }

    // 5. Embarques (LGP)
    async getEmbarques(cpf?: string): Promise<MIOEmbarque[]> {
        const agora = new Date();
        const inicio = new Date(agora.getFullYear() - 1, 0, 1).toISOString().split('T')[0];
        const fim = new Date(agora.getFullYear() + 1, 11, 31).toISOString().split('T')[0];

        const requestData: any = {
            tipo: 'embarques',
            periodo_inicio: inicio,
            periodo_fim: fim
        };
        if (cpf) requestData.cpf = cpf;

        const result = await this.request<any>({
            method: 'POST',
            url: '/lgp-reports',
            data: requestData
        });

        const historyData = result?.history || [];
        
        return historyData.map((raw: any, index: number) => {
            let status: 'programado' | 'embarcado' | 'desembarcado' | 'cancelado' = 'programado';
            if (raw['Desembarque Real']) status = 'desembarcado';
            else if (raw['Embarque Real']) status = 'embarcado';

            const embarque: MIOEmbarque = {
                id: raw['Matrícula'] || index.toString(),
                cpf: raw['CPF'] || '',
                nome: raw['Nome'] || '',
                funcao_cargo: raw['Função/Cargo'] || '',
                regime: raw['Regime'] || '',
                data_embarque: raw['Embarque Real'] || raw['Prev. de Emb.'] || '',
                data_desembarque_prevista: raw['Prev. Desemb.'] || raw['Prev. Desemb. RTPD'] || '',
                data_desembarque_real: raw['Desembarque Real'] || '',
                local_embarque: raw['Origem'] || '',
                plataforma_unidade: raw['Destino'] || '',
                destino: raw['Destino'] || '',
                origem: raw['Origem'] || '',
                status: status,
                rtpe_status: raw['RTPE Status'] || '',
                rtpd_status: raw['RTPD Status'] || '',
                qtd_dias: raw['Qtd. de Dias'] ? Number(raw['Qtd. de Dias']) : undefined,
                folga_inicio: raw['Folga Início'] || '',
                folga_fim: raw['Folga Fim'] || '',
                centro_custo_integrante: raw['Centro de Custo do Integrante'] || '',
                centro_custo_rtpe: raw['Centro de Custo da RTPE'] || '',
                nr_rtpe: raw['Nº RTPE'] || '',
                nr_rtpd: raw['Nº RTPD'] || '',
                nr_projeto: raw['Nº do Projeto'] || '',
            };
            return embarque;
        });
    }

    // 5b. LGP Reports Raw - retorna dados completos com Folga Inicio/Fim, etc
    async getLGPReportsRaw(cnpj?: string, periodoInicio?: string, periodoFim?: string): Promise<any[]> {
        const agora = new Date();
        const inicio = periodoInicio || new Date(agora.getFullYear() - 1, 0, 1).toISOString().split('T')[0];
        const fim = periodoFim || new Date(agora.getFullYear() + 1, 11, 31).toISOString().split('T')[0];

        const requestData: any = {
            tipo: 'embarques',
            periodo_inicio: inicio,
            periodo_fim: fim
        };
        if (cnpj || process.env.MIO_CNPJ) requestData.cnpj = cnpj || process.env.MIO_CNPJ;

        const result = await this.request<any>({
            method: 'POST',
            url: '/lgp-reports',
            data: requestData
        });

        return result?.history || [];
    }

    // 5c. Get all trainings (full sync)
    async getAllTreinamentos(): Promise<MIOTreinamento[]> {
        return this.getTreinamentos('all');
    }

    // 5d. Get all embarkations for current year range
    async getAllEmbarques(periodoInicio?: string, periodoFim?: string): Promise<MIOEmbarque[]> {
        const agora = new Date();
        const inicio = periodoInicio || new Date(agora.getFullYear() - 1, 0, 1).toISOString().split('T')[0];
        const fim = periodoFim || new Date(agora.getFullYear() + 1, 11, 31).toISOString().split('T')[0];

        const requestData: any = {
            tipo: 'embarques',
            periodo_inicio: inicio,
            periodo_fim: fim
        };
        if (process.env.MIO_CNPJ) requestData.cnpj = process.env.MIO_CNPJ;

        const result = await this.request<any>({
            method: 'POST',
            url: '/lgp-reports',
            data: requestData
        });

        const historyData = result?.history || [];
        
        return historyData.map((raw: any, index: number) => {
            let status: 'programado' | 'embarcado' | 'desembarcado' | 'cancelado' = 'programado';
            if (raw['Desembarque Real']) status = 'desembarcado';
            else if (raw['Embarque Real']) status = 'embarcado';

            return {
                id: raw['Matrícula'] || index.toString(),
                cpf: raw['CPF'] || '',
                nome: raw['Nome'] || '',
                funcao_cargo: raw['Função/Cargo'] || '',
                regime: raw['Regime'] || '',
                data_embarque: raw['Embarque Real'] || raw['Prev. de Emb.'] || '',
                data_desembarque_prevista: raw['Prev. Desemb.'] || raw['Prev. Desemb. RTPD'] || '',
                data_desembarque_real: raw['Desembarque Real'] || '',
                local_embarque: raw['Origem'] || '',
                plataforma_unidade: raw['Destino'] || '',
                destino: raw['Destino'] || '',
                origem: raw['Origem'] || '',
                status,
                rtpe_status: raw['RTPE Status'] || '',
                rtpd_status: raw['RTPD Status'] || '',
                qtd_dias: raw['Qtd. de Dias'] ? Number(raw['Qtd. de Dias']) : undefined,
                folga_inicio: raw['Folga Início'] || '',
                folga_fim: raw['Folga Fim'] || '',
                centro_custo_integrante: raw['Centro de Custo do Integrante'] || '',
                centro_custo_rtpe: raw['Centro de Custo da RTPE'] || '',
                nr_rtpe: raw['Nº RTPE'] || '',
                nr_rtpd: raw['Nº RTPD'] || '',
                nr_projeto: raw['Nº do Projeto'] || '',
            } as MIOEmbarque;
        });
    }

    // Testar conexão (para o Admin Panel)
    async testConnection(): Promise<{ success: boolean; message: string }> {
        const auth = await this.authenticate();
        if (auth) {
            return { success: true, message: 'Autenticado com sucesso na API MIO v1.' };
        }
        return { success: false, message: this.lastError || 'Falha desconhecida.' };
    }

    private normalizeResponse<T>(data: any, key?: string): T[] {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (key && Array.isArray(data[key])) return data[key];
        if (data.data && Array.isArray(data.data)) return data.data;
        if (data.results && Array.isArray(data.results)) return data.results;
        if (data.integrantes && Array.isArray(data.integrantes)) return data.integrantes;
        return [];
    }
}

export const mioClient = MioClient.getInstance();
