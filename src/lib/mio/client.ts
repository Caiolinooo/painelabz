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

    // --- Endpoints de Integração ---

    // 1. Integrantes
    async getIntegrantes(): Promise<MIOIntegrante[]> {
        const result = await this.request<any>({
            method: 'POST',
            url: '/int-integrante-get',
            data: {}
        });
        return this.normalizeResponse<MIOIntegrante>(result, 'integrantes');
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
                end: e.data_desembarque_prevista,
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
        // A doc diz /sms-treinamento-registro-get/<cpf ou all>
        // Assumindo GET
        const result = await this.request<any>({
            method: 'GET',
            url: `/sms-treinamento-registro-get/${cpfOrAll}`
        });
        return this.normalizeResponse<MIOTreinamento>(result);
    }

    // 4. ASO (SMS) - O endpoint documentado é POST /sms-aso (Criação).
    // Se não houver GET para ASO, não conseguiremos listar. 
    // Vou deixar o método mas retornar vazio se falhar, ou tentar um padrão.
    async getASOs(cpf?: string): Promise<MIOASO[]> {
        // Placeholder até descobrir o endpoint GET de ASO (não estava claro na lista)
        return [];
    }

    // 5. Embarques (LGP)
    async getEmbarques(cpf?: string): Promise<MIOEmbarque[]> {
        const result = await this.request<any>({
            method: 'POST',
            url: '/lgp-reports',
            data: {
                // Payload provável para relatórios
                tipo: 'embarques',
                cpf: cpf
            }
        });
        return this.normalizeResponse<MIOEmbarque>(result);
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
