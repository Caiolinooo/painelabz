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
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
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

logger.info("Carregando Whisper small (CPU int8) — preservando VRAM para o LLM...")
stt_model = WhisperModel("small", device="cpu", compute_type="int8")
logger.info("Whisper carregado com sucesso.")


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
):
    uid = uuid.uuid4().hex[:8]
    suffix = os.path.splitext(file.filename or ".wav")[1]
    tmp_path = os.path.join(tempfile.gettempdir(), f"stt_{uid}{suffix}")

    try:
        raw = await file.read()
        with open(tmp_path, "wb") as f:
            f.write(raw)

        segments, info = stt_model.transcribe(
            tmp_path,
            language=language,
            beam_size=5,
            best_of=3,
            vad_filter=True,
        )

        text = " ".join(seg.text.strip() for seg in segments)
        duration = f"{info.duration:05.3f}"
        logger.info(f"STT ({info.language}, {duration}s): {text[:80]}...")

        return {"text": text}

    except Exception as e:
        logger.error(f"STT error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


# ---------------------------------------------------------------------------
# TTS — POST /v1/audio/speech
# Retorna streaming response (chunked) igual à OpenAI API real
# ---------------------------------------------------------------------------
@app.post("/v1/audio/speech")
async def synthesize(req: TTSRequest):
    if not req.input or not req.input.strip():
        raise HTTPException(status_code=400, detail="Input text is required")

    if not os.path.exists(PIPER_MODEL):
        raise HTTPException(status_code=500, detail=f"TTS model not found at {PIPER_MODEL}")

    uid = uuid.uuid4().hex[:8]
    tmp_dir = tempfile.gettempdir()
    wav_path = os.path.join(tmp_dir, f"tts_{uid}.wav")
    pcm_path = os.path.join(tmp_dir, f"tts_{uid}.pcm")
    mp3_path = os.path.join(tmp_dir, f"tts_{uid}.mp3")
    cleanup = [wav_path, pcm_path, mp3_path]

    try:
        # 1. Gera WAV com Piper
        proc = subprocess.run(
            ["piper", "--model", PIPER_MODEL, "--output_file", wav_path],
            input=req.input.encode("utf-8"),
            capture_output=True,
            timeout=30,
        )
        if proc.returncode != 0:
            detail = proc.stderr.decode(errors="replace")[:300]
            logger.error(f"Piper falhou (rc={proc.returncode}): {detail}")
            raise HTTPException(status_code=500, detail=f"Piper TTS falhou: {detail}")

        if not os.path.exists(wav_path):
            raise HTTPException(status_code=500, detail="Piper não gerou o arquivo WAV")

        fmt = (req.response_format or "mp3").lower()
        logger.info(f"TTS request: {len(req.input)} chars, format={fmt}")

        # 2. PCM16 raw 24kHz mono (formato nativo do WebRTC)
        if fmt in ("pcm", "pcm16"):
            conv = subprocess.run(
                ["ffmpeg", "-y", "-i", wav_path,
                 "-f", "s16le", "-acodec", "pcm_s16le",
                 "-ar", "24000", "-ac", "1", pcm_path],
                capture_output=True, timeout=30,
            )
            if conv.returncode != 0:
                err = conv.stderr.decode(errors="replace")[:300]
                logger.error(f"ffmpeg PCM falhou: {err}")
                raise HTTPException(status_code=500, detail="Conversão PCM falhou")
            with open(pcm_path, "rb") as f:
                audio_bytes = f.read()
            logger.info(f"TTS OK: {len(audio_bytes)} bytes pcm16")
            # Streaming response para compatibilidade com OpenAI SDK
            return StreamingResponse(
                io.BytesIO(audio_bytes),
                media_type="audio/pcm",
                headers={"Content-Length": str(len(audio_bytes))},
            )

        # 3. WAV direto
        if fmt == "wav":
            with open(wav_path, "rb") as f:
                audio_bytes = f.read()
            logger.info(f"TTS OK: {len(audio_bytes)} bytes wav")
            return StreamingResponse(
                io.BytesIO(audio_bytes),
                media_type="audio/wav",
                headers={"Content-Length": str(len(audio_bytes))},
            )

        # 4. MP3 (padrão) — streaming response como a OpenAI API real faz
        conv = subprocess.run(
            ["ffmpeg", "-y", "-i", wav_path,
             "-acodec", "libmp3lame", "-ar", "24000", "-ac", "1",
             "-q:a", "2", mp3_path],
            capture_output=True, timeout=30,
        )
        if conv.returncode != 0:
            err = conv.stderr.decode(errors="replace")[:300]
            logger.error(f"ffmpeg MP3 falhou: {err}")
            raise HTTPException(status_code=500, detail="Conversão MP3 falhou")
        with open(mp3_path, "rb") as f:
            audio_bytes = f.read()
        logger.info(f"TTS OK: {len(audio_bytes)} bytes mp3")
        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type="audio/mpeg",
            headers={"Content-Length": str(len(audio_bytes))},
        )

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="TTS generation timed out (30s)")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"TTS error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        for p in cleanup:
            if os.path.exists(p):
                os.remove(p)


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
