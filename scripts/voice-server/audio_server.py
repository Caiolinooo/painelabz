"""
ABZ Audio Server — STT (Whisper/CPU) + TTS (Piper/CPU)
Implementa endpoints compatíveis com a OpenAI API para que o
livekit-plugins-openai consiga se conectar transparentemente.

Endpoints:
  GET  /health                  → health check
  GET  /v1/models               → model list (plugin check)
  POST /v1/audio/transcriptions → STT (Whisper small, int8, CPU)
  POST /v1/audio/speech         → TTS (Piper faber PT-BR, CPU)
"""

import io
import os
import uuid
import subprocess
import tempfile
import logging
import hashlib
import time
from functools import lru_cache
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query, Depends
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel
from faster_whisper import WhisperModel
import uvicorn

# ---------------------------------------------------------------------------
# App + Logger
# ---------------------------------------------------------------------------
app = FastAPI(title="ABZ Audio Server")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("audio-server")

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
PIPER_MODEL = os.path.join(MODELS_DIR, "pt_BR-faber-medium.onnx")

logger.info("Carregando Whisper base (CPU int8) — velocidade otimizada...")
stt_model = WhisperModel("base", device="cpu", compute_type="int8")
logger.info("Whisper carregado com sucesso.")

# Cache TTS: dict nativo com timestamp, expira em 30s
_tts_cache = {}
_TTL = 30


def _prune_cache():
    now = time.time()
    expired = [k for k, (ts, _) in _tts_cache.items() if now - ts > _TTL]
    for k in expired:
        del _tts_cache[k]


@lru_cache(maxsize=256)
def _text_to_hash(text: str) -> str:
    return hashlib.md5(text.encode("utf-8")).hexdigest()


def _synthesize_cached(text: str) -> bytes:
    key = _text_to_hash(text)
    _prune_cache()
    if key in _tts_cache:
        return _tts_cache[key][1]
    wav_path = os.path.join(tempfile.gettempdir(), f"tts_cache_{uuid.uuid4().hex}.wav")
    proc = subprocess.run(
        ["piper", "--model", PIPER_MODEL, "--output_file", wav_path],
        input=text.encode("utf-8"),
        capture_output=True,
        timeout=30,
    )
    if proc.returncode != 0:
        os.remove(wav_path) if os.path.exists(wav_path) else None
        raise RuntimeError(f"Piper falhou (rc={proc.returncode}): {proc.stderr.decode()[:200]}")
    with open(wav_path, "rb") as f:
        data = f.read()
    os.remove(wav_path) if os.path.exists(wav_path) else None
    _tts_cache[key] = (time.time(), data)
    logger.info(f"TTS cache MISS ({len(data)} bytes)")
    return data


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class TTSRequest(BaseModel):
    input: str
    model: Optional[str] = "piper"
    voice: Optional[str] = "faber"
    response_format: Optional[str] = "mp3"
    speed: Optional[float] = 1.0
    stream_format: Optional[str] = None
    instructions: Optional[str] = None


# ---------------------------------------------------------------------------
# Health + OpenAI compat stubs
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    piper_ok = os.path.exists(PIPER_MODEL)
    return {"status": "ok", "stt": "whisper-small-cpu", "tts": "piper-faber", "piper_model_found": piper_ok}

@app.get("/v1/")
@app.get("/v1")
async def api_root():
    return {"status": "ok"}

@app.get("/v1/models")
async def list_models():
    return {"data": [{"id": "piper", "object": "model"}, {"id": "whisper-small", "object": "model"}]}


# ---------------------------------------------------------------------------
# STT — POST /v1/audio/transcriptions
# ---------------------------------------------------------------------------
@app.post("/v1/audio/transcriptions")
async def transcribe(
    file: UploadFile = File(...),
    model: Optional[str] = Form(None),
    language: Optional[str] = Form(None),
    lang: Optional[str] = Query(None),  # openai.STT envia language como query param
):
    # Aceitar language como Form field (padrao) OU query param (do openai.STT plugin)
    # Forcar PT-BR como idioma default
    lang = lang or language or "pt"
    logger.info(f">>> STT chamado com language={lang}")

    uid = uuid.uuid4().hex[:8]
    suffix = os.path.splitext(file.filename or ".wav")[1]
    tmp_path = os.path.join(tempfile.gettempdir(), f"stt_{uid}{suffix}")

    try:
        raw = await file.read()
        with open(tmp_path, "wb") as f:
            f.write(raw)

        segments, info = stt_model.transcribe(
            tmp_path,
            language=lang,  # Forcar PT-BR
            beam_size=5,
            best_of=3,
            vad_filter=True,
        )

        text = " ".join(seg.text.strip() for seg in segments)
        duration = f"{info.duration:05.3f}"
        logger.info(f"STT ({lang}, {duration}s): {text[:80]}...")

        return {"text": text}

    except Exception as e:
        logger.error(f"STT error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


# ---------------------------------------------------------------------------
# TTS — POST /v1/audio/speech
# Retorna JSON no formato OpenAI API para compatibilidade com o
# livekit-plugins-openai openai.TTS.
# O plugin openai.TTS espera: {"audio": "<base64_encoded_pcm_audio>"}
# ---------------------------------------------------------------------------
@app.post("/v1/audio/speech")
async def synthesize(req: TTSRequest):
    """
    TTS endpoint compatível com OpenAI API.
    Retorna JSON com campo 'audio' em base64 (PCM16 24kHz mono).
    Compatível com livekit-plugins-openai openai.TTS.
    """
    if not req.input or not req.input.strip():
        raise HTTPException(status_code=400, detail="Input text is required")

    if not os.path.exists(PIPER_MODEL):
        raise HTTPException(status_code=500, detail=f"TTS model not found at {PIPER_MODEL}")

    try:
        wav_bytes = _synthesize_cached(req.input)

        # Converter WAV → PCM16 24kHz mono (formato que o openai.TTS espera)
        pcm_path = os.path.join(tempfile.gettempdir(), f"tts_pcm_{uuid.uuid4().hex}.pcm")
        conv = subprocess.run(
            ["ffmpeg", "-y", "-i", "-",
             "-f", "s16le", "-acodec", "pcm_s16le",
             "-ar", "24000", "-ac", "1", pcm_path],
            input=wav_bytes,
            capture_output=True,
            timeout=30,
        )
        if conv.returncode != 0:
            err = conv.stderr.decode(errors="replace")[:300]
            logger.error(f"ffmpeg PCM falhou: {err}")
            raise HTTPException(status_code=500, detail="Conversão PCM falhou")

        with open(pcm_path, "rb") as f:
            pcm_bytes = f.read()
        os.remove(pcm_path) if os.path.exists(pcm_path) else None

        # openai.TTS com response_format="mp3" espera JSON {"audio": "base64"}
        # openai.TTS com response_format="pcm" espera PCM cru no body
        if req.response_format == "pcm":
            logger.info(f"TTS OK: {len(pcm_bytes)} bytes pcm16 (raw, cache)")
            return Response(content=pcm_bytes, media_type="audio/pcm")
        
        import base64
        logger.info(f"TTS OK: {len(pcm_bytes)} bytes pcm16 (cache)")
        return {
            "audio": base64.b64encode(pcm_bytes).decode("utf-8"),
        }

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="TTS generation timed out (30s)")
    except Exception as e:
        logger.error(f"TTS error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("=" * 50)
    print("  ABZ Audio Server")
    print("  STT: Whisper small (CPU int8)")
    print("  TTS: Piper faber PT-BR (CPU)")
    print("=" * 50)
    uvicorn.run(app, host="127.0.0.1", port=8001)
