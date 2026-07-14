"""
ABZ Voice Agent — livekit-agents v1.0 API (AgentSession + Agent)
===============================================================
Portugues:
  Agente de voz migrado para livekit-agents v1.0 API.
  AgentSession + Agent substituindo VoicePipelineAgent (deprecated).
  
  Pipeline: VAD (Silero) -> STT (OpenAI plugin -> local Whisper)
            -> LLM (Qwen via openai.LLM) -> TTS (OpenAI plugin -> local Piper)
  
  A IA completa vem do Gateway /api/ia/voice/process (mesmo motor do texto).
  O agente tem UMA tool: processar_texto() que chama o gateway.
  
  Zero duplicacao de ferramentas. Zero duplicacao de logica.

English:
  Voice agent migrated to livekit-agents v1.0 API.
  AgentSession + Agent replacing VoicePipelineAgent (deprecated).
  
  Pipeline: VAD (Silero) -> STT (OpenAI plugin -> local Whisper)
            -> LLM (Qwen via openai.LLM) -> TTS (OpenAI plugin -> local Piper)
  
  Full AI comes from Gateway /api/ia/voice/process (same engine as text chat).
  The agent has ONE tool: processar_texto() that calls the gateway.
  
  Zero tool duplication. Zero logic duplication.

Changes from v0.x:
  - VoicePipelineAgent -> AgentSession + Agent
  - cli.run_app(WorkerOptions) -> agents.cli.run_app(server) + @server.rtc_session
  - allow_interruptions/min_interruption_seconds -> TurnHandlingOptions
  - System prompt via Agent.instructions (not llm.ChatContext)
  - Greeting via session.generate_reply() (not agent.say())
  - Tools via @function_tool decorator + tools= in Agent (not FunctionContext class)
"""

import asyncio
import logging
import os
import sys
import traceback

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("abz-voice")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "http://127.0.0.1:8080/v1")
LLM_API_KEY = os.getenv("LLM_API_KEY", "Caio@2122@")
AUDIO_BASE_URL = os.getenv("AUDIO_BASE_URL", "http://127.0.0.1:8001/v1")

# Gateway to Portal ABZ AI engine (same engine as text chat)
PORTAL_API_URL = os.getenv("PORTAL_API_URL", "http://localhost:3000")
VOICE_AGENT_TOKEN = os.getenv("VOICE_AGENT_TOKEN", "")

# System prompt — diz ao LLM para SEMPRE usar a tool processar_texto
SYSTEM_INSTRUCTIONS = (
    "Voce e a ABZ, assistente de IA por voz do Portal ABZ.\n"
    "REGRAS IMPORTANTES:\n"
    "1. SEMPRE use a ferramenta 'processar_texto' para responder qualquer pergunta.\n"
    "2. NUNCA responda sem usar a ferramenta — mesmo para 'oi', 'obrigado', etc.\n"
    "3. A ferramenta processar_texto retorna a resposta completa da IA.\n"
    "4. Responda SEMPRE em portugues brasileiro.\n"
    "5. Seja agil, direto e amigavel, como um atendente ao telefone.\n"
    "6. Mantenha respostas curtas (maximo 2-3 frases) para voz.\n"
    "7. NUNCA diga ao usuario que houve erro, falha ou problema tecnico do sistema. Se a resposta nao vier como esperado, mantenha-se no personagem e diga algo natural como 'Desculpe, nao entendi bem, pode repetir?'.\n"
)

# ---------------------------------------------------------------------------
# Detect SDK version
# ---------------------------------------------------------------------------
SDK_VERSION = "unknown"

try:
    import livekit.agents as _la
    SDK_VERSION = getattr(_la, "__version__", "1.x")
    logger.info(f"LiveKit Agents SDK version: {SDK_VERSION}")
except ImportError:
    logger.error("livekit-agents NOT installed!")
    sys.exit(1)

# v1.x imports — tools usam @function_tool (nao FunctionContext class)
from livekit import agents
from livekit.agents import AgentServer, AgentSession, Agent, TurnHandlingOptions, function_tool, RunContext
from livekit.plugins import silero, openai

# Try to import turn detector (optional — falls back to VAD-only)
_TURN_DETECTOR_AVAILABLE = False
try:
    from livekit.plugins.turn_detector.multilingual import MultilingualModel
    _TURN_DETECTOR_AVAILABLE = True
    logger.info("Turn detector (MultilingualModel) available")
except ImportError:
    logger.warning(
        "Turn detector not available (livekit-plugins-turn-detector not installed). "
        "Falling back to VAD-only turn detection."
    )

# ---------------------------------------------------------------------------
# Tools — A ferramenta processar_texto chama o gateway do portal
# ---------------------------------------------------------------------------
@function_tool
async def processar_texto(
    context: RunContext,
    texto: str,
) -> str:
    """
    SEMPRE use esta ferramenta para responder qualquer pergunta do usuario.
    Tenta primeiro o gateway do portal (dados reais: ferias, reembolsos, etc).
    Se o portal nao estiver disponivel, usa o LLM local (llama.cpp) como fallback,
    para que a voz funcione mesmo offline.
    NUNCA responda sem usar esta ferramenta.

    Args:
        texto: A pergunta ou comando do usuario

    Returns:
        A resposta da IA (texto formatado)
    """
    if not texto or not texto.strip():
        return "Nao entendi. Pode repetir, por favor?"

    logger.info(f">>> [Gateway] processar_texto: {texto[:100]}...")

    # ---------- 1. Tentar o gateway do portal (dados reais) ----------
    try:
        import aiohttp

        headers = {"Content-Type": "application/json"}
        if VOICE_AGENT_TOKEN:
            headers["Authorization"] = f"Bearer {VOICE_AGENT_TOKEN}"

        url = f"{PORTAL_API_URL}/api/ia/voice/process"
        logger.info(f">>> Gateway URL: {url}")

        async with aiohttp.ClientSession() as session:
            async with session.post(
                url,
                json={"text": texto.strip()},
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=120),
            ) as resp:
                if resp.status != 200:
                    logger.error(f">>> Gateway erro HTTP {resp.status}")
                    raise RuntimeError(f"gateway http {resp.status}")
                data = await resp.json()
                response = data.get("response", "")
                if not response or not response.strip():
                    raise RuntimeError("gateway resposta vazia")
                metadata = data.get("metadata", {})
                if metadata.get("dashboard"):
                    logger.info(">>> Gateway: dashboard detectado — sera renderizado pelo frontend")
                logger.info(f">>> Gateway response: {response[:100]}...")
                return response

    except Exception as e:
        logger.warning(f">>> Gateway indisponivel ({e}); usando LLM local como fallback.")

    # ---------- 2. Fallback: LLM local (llama.cpp) ----------
    try:
        import aiohttp

        system_prompt = (
            "Voce e a ABZ, assistente virtual do Portal ABZ Group. "
            "Responda SEMPRE em portugues brasileiro, de forma agil, direta e amigavel, "
            "como um atendente ao telefone. Mantenha respostas curtas (2 a 3 frases). "
            "Nunca diga que houve erro, falha ou problema tecnico."
        )
        payload = {
            "model": "qwen-coder",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": texto.strip()},
            ],
            "max_tokens": 400,
            "temperature": 0.6,
            "stream": False,
            "chat_template_kwargs": {"enable_thinking": False},
        }
        headers = {"Content-Type": "application/json", "Authorization": f"Bearer {LLM_API_KEY}"}
        logger.info(f">>> LLM local fallback: {LLM_BASE_URL}")
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{LLM_BASE_URL}/chat/completions",
                json=payload,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=120),
            ) as resp:
                if resp.status != 200:
                    logger.error(f">>> LLM local erro HTTP {resp.status}")
                    return "Desculpe, nao consegui processar agora. Pode repetir, por favor?"
                data = await resp.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                if not content or not content.strip():
                    return "Desculpe, nao entendi bem. Pode repetir?"
                content = content.strip()
                logger.info(f">>> LLM local response: {content[:100]}...")
                return content
    except Exception as e:
        logger.error(f">>> LLM local ERRO: {e}")
        traceback.print_exc()
        return "Desculpe, pode repetir com outras palavras?"


# ---------------------------------------------------------------------------
# Agent class — v1.x style
# ---------------------------------------------------------------------------
class ABZAgent(Agent):
    """
    Agente ABZ para voce.
    
    Agent em v1.x usa 'instructions' (nao system prompt em ChatContext).
    As ferramentas sao passadas via tools=[...] no construtor do Agent.
    """
    def __init__(self):
        super().__init__(
            instructions=SYSTEM_INSTRUCTIONS,
            tools=[processar_texto],
        )


# ---------------------------------------------------------------------------
# Entry point — v1.x: @server.rtc_session + AgentSession
# ---------------------------------------------------------------------------
server = AgentServer()

@server.rtc_session(agent_name="abz-voice")
async def entrypoint(ctx: agents.JobContext):
    """
    Entry point — AgentSession (v1.x API).
    
    AgentSession e o equivalente modernizado de VoicePipelineAgent.
    Diferencas de VoicePipelineAgent:
    - VAD, STT, LLM, TTS sao passados ao construtor, nao montados internamente
    - Interrupcao via TurnHandlingOptions (com turn_detection opcional)
    - System prompt via Agent.instructions (nao llm.ChatContext)
    - Saudacao via session.generate_reply() (nao agent.say())
    - Ferramentas via tools= no Agent (nao functions= no AgentSession)
    
    English:
    AgentSession is the modernized equivalent of VoicePipelineAgent.
    - VAD, STT, LLM, TTS passed to constructor
    - Interruption via TurnHandlingOptions (with optional turn_detection)
    - System prompt via Agent.instructions (not llm.ChatContext)
    - Greeting via session.generate_reply() (not agent.say())
    - Tools via tools= in Agent (not functions= in AgentSession)
    """
    try:
        logger.info(">>> [AgentSession v1.x] Job recebido. Conectando a sala...")
        await ctx.connect()
        logger.info(f">>> Conectado a sala: {ctx.room.name}")

        # Carregar VAD
        vad = silero.VAD.load()
        logger.info(">>> VAD (Silero) carregado")

        # Carregar STT (openai.STT suporta base_url customizada = audio_server local)
        stt = openai.STT(
            base_url=AUDIO_BASE_URL,
            api_key="local",
            language="pt", # Força português para evitar hallucination/tradução para inglês
        )
        logger.info(">>> STT (openai.STT) criado (base_url=%s)", AUDIO_BASE_URL)

        # Carregar LLM (openai.LLM suporta base_url customizada = Llama.cpp local)
        llm = openai.LLM(
            base_url=LLM_BASE_URL,
            api_key=LLM_API_KEY,
            model="qwen-coder",
        )
        logger.info(">>> LLM (openai.LLM) criado (base_url=%s, model=qwen-coder)", LLM_BASE_URL)

        # Carregar TTS (openai.TTS suporta base_url customizada = audio_server local)
        # response_format="pcm" = raw PCM16 24kHz mono — formato nativo do LiveKit
        tts = openai.TTS(
            base_url=AUDIO_BASE_URL,
            api_key="local",
            model="tts-1",
            response_format="pcm",
        )
        logger.info(">>> TTS criado (base_url=%s, format=pcm)", AUDIO_BASE_URL)

        # Configurar turn handling
        turn_handling = None
        if _TURN_DETECTOR_AVAILABLE:
            turn_handling = TurnHandlingOptions(
                turn_detection=MultilingualModel(),
            )
            logger.info(">>> Turn detector (MultilingualModel) ativo")
        else:
            # Fallback: VAD-only turn detection
            turn_handling = TurnHandlingOptions(
                allow_interruption=True,
                min_silence_duration=0.0,
            )
            logger.info(">>> Turn handling: VAD-only (min_silence=0s, allow_interruption=True)")

        # Criar session de voz (v1.x API) — tools vem do Agent, nao do AgentSession
        session = AgentSession(
            vad=vad,
            stt=stt,
            llm=llm,
            tts=tts,
            turn_handling=turn_handling,
        )
        logger.info(">>> AgentSession criado (tools via Agent)")

        # Criar agente com tools
        agent = ABZAgent()
        logger.info(">>> ABZAgent criado com tools=[processar_texto]")

        # Iniciar session na sala
        await session.start(
            room=ctx.room,
            agent=agent,
        )
        logger.info(">>> Session iniciada na sala — aguardando fala!")

        # Saudacao inicial desativada para evitar erro 500 do Jinja (Qwen exige role=user)
        # O usuário iniciará a conversa.
        # await session.generate_reply(
        #     instructions="Olá! Eu sou a ABZ, assistente do Portal ABZ. Como posso ajudar?",
        # )
        # logger.info(">>> Saudacao enviada — aguardando pergunta do usuario...")

    except Exception as e:
        logger.error(f"!!! ERRO no entrypoint: {e}")
        traceback.print_exc()


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    lk_url = os.getenv("LIVEKIT_URL", "")
    lk_key = os.getenv("LIVEKIT_API_KEY", "")
    lk_secret = os.getenv("LIVEKIT_API_SECRET", "")

    if not lk_url or not lk_key or not lk_secret:
        logger.error("=" * 60)
        logger.error("ERRO: Variaveis de ambiente do LiveKit NÃO configuradas!")
        logger.error(f"  LIVEKIT_URL:        {'OK' if lk_url else 'FALTANDO'}")
        logger.error(f"  LIVEKIT_API_KEY:    {'OK' if lk_key else 'FALTANDO'}")
        logger.error(f"  LIVEKIT_API_SECRET: {'OK' if lk_secret else 'FALTANDO'}")
        logger.error("Certifique-se de executar: source .env")
        logger.error("=" * 60)
        sys.exit(1)

    logger.info("=" * 60)
    logger.info(f"ABZ Voice Agent")
    logger.info(f"SDK:   {SDK_VERSION} (AgentSession v1.x)")
    logger.info(f"LK:    {lk_url}")
    logger.info(f"LLM:   {LLM_BASE_URL}")
    logger.info(f"Audio: {AUDIO_BASE_URL}")
    logger.info(f"Portal: {PORTAL_API_URL}")
    logger.info(f"Gateway: {'ON' if PORTAL_API_URL else 'OFF'}")
    logger.info(f"STT:   PT-BR forced (default)")
    logger.info(f"TTS:   PCM format (OpenAI-compatible, 24kHz mono)")
    logger.info(f"Agent: AgentSession + Agent (v1.x)")
    logger.info(f"Turn:  {'MultilingualModel' if _TURN_DETECTOR_AVAILABLE else 'VAD-only'}")
    logger.info("=" * 60)

    agents.cli.run_app(server)
