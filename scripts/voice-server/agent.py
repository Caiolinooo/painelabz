"""
ABZ Voice Agent — Compatible with LiveKit Agents v0.x AND v1.0+
Auto-detects the installed SDK version and uses the correct API.
"""

import asyncio
import logging
import os
import sys
import traceback

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("abz-voice")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "http://127.0.0.1:8080/v1")
LLM_API_KEY = os.getenv("LLM_API_KEY", "Caio@2122@")
AUDIO_BASE_URL = os.getenv("AUDIO_BASE_URL", "http://127.0.0.1:8001/v1")

SYSTEM_PROMPT = (
    "Você é a ABZ, assistente virtual de voz do Portal ABZ. "
    "Responda SEMPRE em português brasileiro. "
    "Seja ágil e direto, como um atendente ao telefone. "
    "Mantenha respostas curtas (máximo 2-3 frases). "
    "Use linguagem profissional mas acessível."
)

# ---------------------------------------------------------------------------
# Detect SDK version
# ---------------------------------------------------------------------------
SDK_VERSION = "unknown"
try:
    import livekit.agents as _la
    SDK_VERSION = getattr(_la, "__version__", "0.x")
    logger.info(f"LiveKit Agents SDK version: {SDK_VERSION}")
except ImportError:
    logger.error("livekit-agents NÃO está instalado!")
    sys.exit(1)

try:
    import livekit.plugins.openai as _po
    logger.info(f"livekit-plugins-openai version: {getattr(_po, '__version__', 'unknown')}")
except Exception:
    pass
try:
    import livekit.plugins.silero as _ps
    logger.info(f"livekit-plugins-silero version: {getattr(_ps, '__version__', 'unknown')}")
except Exception:
    pass

IS_V1 = False
try:
    from livekit.agents import Agent, AgentSession, function_tool, RunContext
    IS_V1 = True
    logger.info("✓ API v1.0+ detectada (AgentSession + Agent + @function_tool)")
except ImportError:
    logger.info("✗ API v1.0 não disponível, usando v0.x (VoicePipelineAgent)")

from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli
from livekit.plugins import openai, silero

# ---------------------------------------------------------------------------
# v0.x: FunctionContext + VoicePipelineAgent
# ---------------------------------------------------------------------------
if not IS_V1:
    from livekit.agents.pipeline import VoicePipelineAgent
    from livekit.agents import llm

    class PortalABZTools(llm.FunctionContext):
        @llm.ai_callable(description="Busca o status de um chamado no Portal ABZ")
        async def verificar_status_chamado(self, numero_chamado: str):
            logger.info(f"[TOOL] Consultando chamado #{numero_chamado}")
            await asyncio.sleep(0.3)
            return f"O chamado {numero_chamado} está em andamento com a equipe técnica."

    async def entrypoint(ctx: JobContext):
        try:
            logger.info(">>> [v0.x] Job recebido. Conectando à sala...")
            await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
            logger.info(f">>> Conectado à sala: {ctx.room.name}")

            _vad = silero.VAD.load()
            logger.info(">>> VAD carregado")

            _stt = openai.STT(base_url=AUDIO_BASE_URL, api_key="local")
            logger.info(">>> STT criado")

            _llm = openai.LLM(
                base_url=LLM_BASE_URL,
                api_key=LLM_API_KEY,
                model="qwen-coder",
            )
            logger.info(">>> LLM criado")

            # CRÍTICO: model="tts-1" força AudioChunkedStream (streaming bytes)
            # O default "gpt-4o-mini-tts" usa SSE que nosso server não suporta.
            # response_format="pcm" entrega PCM16 24kHz direto, sem decodificação.
            _tts = openai.TTS(
                base_url=AUDIO_BASE_URL,
                api_key="local",
                model="tts-1",
                response_format="pcm",
            )
            logger.info(">>> TTS criado (model=tts-1, format=pcm)")

            agent = VoicePipelineAgent(
                vad=_vad,
                stt=_stt,
                llm=_llm,
                tts=_tts,
                fnc_ctx=PortalABZTools(),
                chat_ctx=llm.ChatContext().append(role="system", text=SYSTEM_PROMPT),
            )

            agent.start(ctx.room)
            logger.info(">>> Pipeline de voz v0.x ativo!")
            await agent.say("Olá! Em que posso ajudar?", allow_interruptions=True)

        except Exception as e:
            logger.error(f"!!! ERRO no entrypoint v0.x: {e}")
            traceback.print_exc()


# ---------------------------------------------------------------------------
# v1.0+: Agent + AgentSession + @function_tool
# ---------------------------------------------------------------------------
else:
    class PortalABZAgent(Agent):
        def __init__(self):
            super().__init__(instructions=SYSTEM_PROMPT)

        @function_tool()
        async def verificar_status_chamado(self, context: RunContext, numero_chamado: str) -> str:
            """Busca o status de um chamado no Portal ABZ.
            Args:
                numero_chamado: Número do chamado.
            """
            logger.info(f"[TOOL] Consultando chamado #{numero_chamado}")
            await asyncio.sleep(0.3)
            return f"O chamado {numero_chamado} está em andamento com a equipe técnica."

    async def entrypoint(ctx: JobContext):
        try:
            logger.info(">>> [v1.0] Job recebido. Conectando à sala...")
            await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
            logger.info(f">>> Conectado à sala: {ctx.room.name}")

            _vad = silero.VAD.load()
            logger.info(">>> VAD carregado")

            _stt = openai.STT(base_url=AUDIO_BASE_URL, api_key="local")
            logger.info(">>> STT criado")

            _llm = openai.LLM(
                base_url=LLM_BASE_URL,
                api_key=LLM_API_KEY,
                model="qwen-coder",
            )
            logger.info(">>> LLM criado")

            # CRÍTICO: model="tts-1" força AudioChunkedStream (streaming bytes)
            # O default "gpt-4o-mini-tts" usa SSEChunkedStream que nosso server
            # NÃO suporta (espera Server-Sent Events com base64 audio).
            _tts = openai.TTS(
                base_url=AUDIO_BASE_URL,
                api_key="local",
                model="tts-1",
                response_format="pcm",
            )
            logger.info(">>> TTS criado (model=tts-1, format=pcm)")

            session = AgentSession(
                vad=_vad, stt=_stt, llm=_llm, tts=_tts,
            )

            agent = PortalABZAgent()
            await session.start(room=ctx.room, agent=agent)
            logger.info(">>> Pipeline de voz v1.0 ativo!")

        except Exception as e:
            logger.error(f"!!! ERRO no entrypoint v1.0: {e}")
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
        logger.error("ERRO: Variáveis de ambiente do LiveKit NÃO configuradas!")
        logger.error(f"  LIVEKIT_URL:        {'OK' if lk_url else 'FALTANDO'}")
        logger.error(f"  LIVEKIT_API_KEY:    {'OK' if lk_key else 'FALTANDO'}")
        logger.error(f"  LIVEKIT_API_SECRET: {'OK' if lk_secret else 'FALTANDO'}")
        logger.error("Certifique-se de executar: source .env")
        logger.error("=" * 60)
        sys.exit(1)

    logger.info("=" * 60)
    logger.info(f"ABZ Voice Agent")
    logger.info(f"SDK:   {SDK_VERSION} ({'v1.0 API' if IS_V1 else 'v0.x API'})")
    logger.info(f"LK:    {lk_url}")
    logger.info(f"LLM:   {LLM_BASE_URL}")
    logger.info(f"Audio: {AUDIO_BASE_URL}")
    logger.info("=" * 60)

    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
