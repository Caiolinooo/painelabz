# Agente de Voz — Guia do Desenvolvedor

Documentação operacional do pipeline de voz do Portal ABZ (LiveKit + STT/TTS local + gateway IA).

## Visão Geral

O agente de voz permite conversa bidirecional em tempo real no portal. A arquitetura separa três camadas:

```
Browser (VoiceAssistantModal)
    │  GET /api/ia/voice/token  → token LiveKit + dispatch 'abz-voice'
    ▼
LiveKit Cloud (WebRTC)
    │  sala privada por usuário: abz_voice_{userId}
    ▼
Agente Python (scripts/voice-server/agent.py)
    │  VAD (Silero) → STT → LLM → TTS
    │  tool processar_texto() → POST /api/ia/voice/process
    ▼
Portal ABZ (mesmo motor da IA de texto)
```

Quando o portal está indisponível, o agente usa **fallback local** via llama.cpp (`LLM_BASE_URL`), mantendo a voz funcional offline (v5.27.4+).

## Componentes

| Componente | Arquivo | Função |
|------------|---------|--------|
| Frontend | `src/components/IA/VoiceAssistantModal.tsx` | UI WebRTC, conexão LiveKit |
| Token API | `src/app/api/ia/voice/token/route.ts` | JWT LiveKit + dispatch explícito `abz-voice` |
| Gateway IA | `src/app/api/ia/voice/process/route.ts` | Processa texto com o motor completo da IA |
| Agente | `scripts/voice-server/agent.py` | LiveKit Agents v1.0 (`AgentSession` + `Agent`) |
| Áudio local | `scripts/voice-server/audio_server.py` | STT (Whisper) + TTS (Supertonic 3) |
| Manager | `scripts/voice-server/abz_voice_manager.sh` | Instalação, start/stop, health checks |
| Auto-restart | `scripts/voice-server/run_agent_loop.sh` | Reinício do agente após crash |

## Pipeline de Áudio (v5.26+)

```
Microfone → VAD (Silero) → STT (Whisper, language=pt)
         → LLM (Qwen via openai.LLM plugin)
         → tool processar_texto → gateway ou fallback local
         → TTS (Supertonic 3, voz F1 default, PCM 24kHz mono)
         → Alto-falante
```

### STT/TTS local (`audio_server.py`)

- **STT**: `faster-whisper` modelo `base`, CPU int8
- **TTS**: biblioteca `supertonic` (modelo Supertonic 3, ONNX em CPU)
- **Vozes**: `M1`, `M2`, `M3`, `F1`, `F2`, `F3` — padrão `F1` (melhor PT-BR)
- **Endpoints OpenAI-compatíveis**:
  - `GET /health`
  - `POST /v1/audio/transcriptions` (STT)
  - `POST /v1/audio/speech` (TTS, `response_format=pcm`)

> **Nota PyPI**: o modelo chama-se Supertonic 3, mas o pacote Python é `supertonic>=1.3.0` (não `>=3.0.0`).

## Variáveis de Ambiente

### Portal (Next.js)

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `LIVEKIT_API_KEY` | Sim | Chave API LiveKit |
| `LIVEKIT_API_SECRET` | Sim | Secret LiveKit |
| `NEXT_PUBLIC_LIVEKIT_URL` | Sim | URL WebSocket (`wss://...`) |
| `VOICE_AGENT_TOKEN` | Opcional | Bearer token para o gateway `/api/ia/voice/process` |

### Agente Python (`scripts/voice-server/.env`)

| Variável | Default | Descrição |
|----------|---------|-----------|
| `LIVEKIT_URL` | — | URL WebSocket LiveKit |
| `LIVEKIT_API_KEY` | — | Chave API |
| `LIVEKIT_API_SECRET` | — | Secret |
| `LLM_BASE_URL` | `http://127.0.0.1:8080/v1` | llama.cpp OpenAI-compat |
| `LLM_API_KEY` | — | API key do llama-server |
| `AUDIO_BASE_URL` | `http://127.0.0.1:8001/v1` | audio_server STT/TTS |
| `PORTAL_API_URL` | `http://localhost:3000` | Base URL do portal |
| `VOICE_AGENT_TOKEN` | — | Token para autenticar no gateway |

## Setup Local

### 1. Dependências do voice server

```bash
cd scripts/voice-server
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

Ou use o manager interativo:

```bash
bash scripts/voice-server/abz_voice_manager.sh
# Opção 1: Instalar / Atualizar
# Opção 2: Ligar Serviços
```

### 2. Iniciar serviços manualmente

```bash
# Terminal 1 — LLM (llama.cpp)
./llama-server --host 127.0.0.1 --port 8080 ...

# Terminal 2 — Audio Server
python3 scripts/voice-server/audio_server.py
# Health: http://127.0.0.1:8001/health

# Terminal 3 — Agente LiveKit
source scripts/voice-server/.env
python3 scripts/voice-server/agent.py start
```

### 3. Testar no portal

1. Configure as variáveis LiveKit no `.env.local`
2. Inicie `npm run dev`
3. Abra o assistente de voz no portal
4. Verifique no log do agente: `Agente 'abz-voice' despachado`

## Fluxo da Tool `processar_texto`

1. Recebe texto do STT
2. Tenta `POST {PORTAL_API_URL}/api/ia/voice/process` com `{ text }`
3. Se HTTP ≠ 200 ou resposta vazia → fallback llama.cpp local
4. Fallback envia `enable_thinking: false` para evitar resposta vazia do Qwen
5. **Nunca** expõe erros técnicos ao usuário — mensagens naturais como "Desculpe, não entendi bem, pode repetir?"

## Regras de Comportamento (v5.27.3+)

- System prompt regra #7: proíbe confessar erros ao usuário
- Saudação inicial desativada (evita erro 500 do template Jinja do Qwen)
- STT força `language="pt"` para reduzir alucinações do Whisper
- TTS usa `response_format="pcm"` (PCM16 24kHz mono, formato nativo LiveKit)

## Troubleshooting

| Sintoma | Causa provável | Ação |
|---------|----------------|------|
| "Configuração do servidor de voz ausente" | Env LiveKit faltando no portal | Configure `LIVEKIT_*` e `NEXT_PUBLIC_LIVEKIT_URL` |
| Agente não entra na sala | Dispatch falhou | Verifique `dispatchStatus` na resposta de `/api/ia/voice/token`; confirme `agent_name="abz-voice"` |
| Voz muda, sem resposta | Gateway offline + fallback falhou | Verifique llama.cpp em `:8080` e logs do agente |
| Resposta vazia do Qwen | Thinking mode ativo | Confirmar `enable_thinking: false` no fallback |
| TTS com ruído/erro | Sample rate incorreto | audio_server calcula sample rate dinamicamente; verifique logs Supertonic |
| STT em inglês | Idioma não forçado | Confirmar `language="pt"` no `openai.STT` do agent.py |
| `supertonic` install falha | Versão errada | Usar `supertonic>=1.3.0`, não `>=3.0.0` |

### Health checks rápidos

```bash
curl http://127.0.0.1:8001/health          # Audio Server
curl http://127.0.0.1:8080/health            # LLM (se expuser /health)
curl -X POST http://127.0.0.1:8001/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{"input":"Teste","model":"supertonic-3","voice":"F1"}'
```

## Arquivos Relacionados

- `scripts/voice-server/requirements.txt` — dependências Python
- `src/app/api/ia/voice/process/stream/route.ts` — streaming (se habilitado)
- `src/lib/ia/context-builder.ts` — system prompt da IA (sem expor erros)
- `CHANGELOG.md` — v5.26.x a v5.28.0 para histórico detalhado
