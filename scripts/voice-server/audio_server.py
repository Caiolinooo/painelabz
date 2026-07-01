"""
ABZ Audio Server — STT (Whisper/CPU) + TTS (Supertonic 3/CPU)
Implementa endpoints compatíveis com a OpenAI API para que o
livekit-plugins-openai consiga se conectar transparentemente.

Endpoints:
  GET  /health                  → health check
  GET  /v1/models               → model list (plugin check)
  POST /v1/audio/transcriptions → STT (Whisper small, int8, CPU)
  POST /v1/audio/speech         → TTS (Supertonic 3, CPU)
"""

import io
import os
import uuid
import subprocess
import tempfile
import logging
import hashlib
import time
import wave
import struct
from functools import lru_cache
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query, Depends
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel
from faster_whisper import WhisperModel
import numpy as np
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
logger.info("Carregando Whisper base (CPU int8) — velocidade otimizada...")
stt_model = WhisperModel("base", device="cpu", compute_type="int8")
logger.info("Whisper carregado com sucesso.")

logger.info("Carregando Supertonic 3 TTS...")
from supertonic import TTS
tts_engine = TTS(auto_download=True)
logger.info("Supertonic 3 carregado com sucesso.")

# Vozes disponíveis do Supertonic 3
AVAILABLE_VOICES = {
    "M1": "M1", "M2": "M2", "M3": "M3",
    "F1": "F1", "F2": "F2", "F3": "F3",
}
DEFAULT_VOICE = "F1"

# Cache TTS: dict nativo com timestamp, expira em 30s
_tts_cache = {}
_TTL = 30


def _prune_cache():
    now = time.time()
    expired = [k for k, (ts, _) in _tts_cache.items() if now - ts > _TTL]
    for k in expired:
        del _tts_cache[k]


def _make_cache_key(text: str, voice: str, lang: str) -> str:
    raw = f"{text}|{voice}|{lang}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


def _wav_to_pcm16_24k(wav_bytes: bytes) -> bytes:
    """Converte WAV bytes para PCM16 24kHz mono via ffmpeg."""
    pcm_path = os.path.join(tempfile.gettempdir(), f"tts_pcm_{uuid.uuid4().hex}.pcm")
    try:
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
            raise RuntimeError("Conversão PCM falhou")

        with open(pcm_path, "rb") as f:
            pcm_bytes = f.read()
        return pcm_bytes
    finally:
        if os.path.exists(pcm_path):
            os.remove(pcm_path)


def _synthesize_cached(text: str, voice: str = DEFAULT_VOICE, lang: str = "pt") -> bytes:
    """Sintetiza texto usando Supertonic 3 e retorna PCM16 24kHz mono."""
    cache_key = _make_cache_key(text, voice, lang)
    _prune_cache()
    if cache_key in _tts_cache:
        logger.info(f"TTS cache HIT ({len(_tts_cache[cache_key][1])} bytes)")
        return _tts_cache[cache_key][1]

    # Obter estilo de voz
    voice_style = tts_engine.get_voice_style(voice_name=voice)

    # Sintetizar
    wav, duration = tts_engine.synthesize(text, voice_style=voice_style, lang=lang)
    logger.info(f"TTS sintetizado: {duration}s, voz={voice}, lang={lang}")

    # Converter numpy array para WAV bytes
    if isinstance(wav, np.ndarray):
        wav_path = os.path.join(tempfile.gettempdir(), f"tts_wav_{uuid.uuid4().hex}.wav")
        try:
            # Garantir que duration é um float (e não um array 1D)
            try:
                dur_val = float(duration[0] if isinstance(duration, (list, np.ndarray)) else duration)
            except Exception:
                dur_val = 0.0

            # Remover dimensões vazias (ex: (1, N) vira (N,))
            wav = np.squeeze(wav)
            
            # Garantir que é 1D mono
            if wav.ndim > 1:
                # Se for (2, N) ou (N, 2)
                if wav.shape[0] == 2:
                    wav = wav[0, :]
                else:
                    wav = wav[:, 0]
            elif wav.ndim == 0:
                wav = np.array([wav])

            num_samples = len(wav)
            inferred_sr = int(num_samples / dur_val) if dur_val > 0 else 24000
            
            # Normalizar para int16
            if wav.dtype != np.int16:
                if wav.max() > 1.0 or wav.min() < -1.0:
                    wav = wav / max(abs(wav.max()), abs(wav.min()))
                wav = (wav * 32767).astype(np.int16)

            # Usar o sample rate inferido (arredondado para valores comuns se necessário)
            # Ex: 24000, 22050, 44100, 48000. Vamos apenas usar o calculado (ou o mais próximo).
            # Para evitar erros de float, vamos usar o inferred_sr diretamente.
            sample_rate = inferred_sr

            with wave.open(wav_path, "wb") as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(sample_rate)
                wf.writeframes(wav.tobytes())

            with open(wav_path, "rb") as f:
                wav_bytes = f.read()
        finally:
            if os.path.exists(wav_path):
                os.remove(wav_path)
    elif isinstance(wav, bytes):
        wav_bytes = wav
    else:
        raise RuntimeError(f"Tipo de saída TTS inesperado: {type(wav)}")

    # Converter para PCM16 24kHz mono
    pcm_bytes = _wav_to_pcm16_24k(wav_bytes)

    _tts_cache[cache_key] = (time.time(), pcm_bytes)
    logger.info(f"TTS cache MISS ({len(pcm_bytes)} bytes pcm)")
    return pcm_bytes


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class TTSRequest(BaseModel):
    input: str
    model: Optional[str] = "supertonic-3"
    voice: Optional[str] = DEFAULT_VOICE
    response_format: Optional[str] = "mp3"
    speed: Optional[float] = 1.0
    stream_format: Optional[str] = None
    instructions: Optional[str] = None


# ---------------------------------------------------------------------------
# Health + OpenAI compat stubs
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    return {"status": "ok", "stt": "whisper-small-cpu", "tts": "supertonic-3", "voices": list(AVAILABLE_VOICES.keys())}

@app.get("/v1/")
@app.get("/v1")
async def api_root():
    return {"status": "ok"}

@app.get("/v1/models")
async def list_models():
    return {"data": [{"id": "supertonic-3", "object": "model"}, {"id": "whisper-small", "object": "model"}]}


# ---------------------------------------------------------------------------
# STT — POST /v1/audio/transcriptions
# ---------------------------------------------------------------------------
@app.post("/v1/audio/transcriptions")
async def transcribe(
    file: UploadFile = File(...),
    model: Optional[str] = Form(None),
    language: Optional[str] = Form(None),
    lang: Optional[str] = Query(None),
):
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
            language=lang,
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
# ---------------------------------------------------------------------------
@app.post("/v1/audio/speech")
async def synthesize(req: TTSRequest):
    """
    TTS endpoint compatível com OpenAI API.
    IMPORTANTE: livekit-plugins-openai espera raw audio bytes no body.
    - response_format="pcm" → PCM16 24kHz mono raw bytes
    - response_format="mp3" → MP3 bytes via ffmpeg
    - Qualquer outro → PCM16 24kHz mono raw bytes (fallback seguro)
    """
    if not req.input or not req.input.strip():
        raise HTTPException(status_code=400, detail="Input text is required")

    # Resolver voz
    voice = req.voice if req.voice and req.voice in AVAILABLE_VOICES else DEFAULT_VOICE
    
    # Detectar idioma heurísticamente
    text_lower = req.input.lower()
    en_words = {"the", "is", "you", "and", "to", "a", "it", "that", "of", "in", "what", "how", "hello"}
    words = set(text_lower.split())
    if len(words.intersection(en_words)) >= 1:
        lang = "en"
    else:
        lang = "pt"

    try:
        pcm_bytes = _synthesize_cached(req.input, voice=voice, lang=lang)

        if req.response_format == "mp3":
            # Converter PCM16 24kHz → MP3 via ffmpeg para compatibilidade
            mp3_path = os.path.join(tempfile.gettempdir(), f"tts_mp3_{uuid.uuid4().hex}.mp3")
            try:
                conv = subprocess.run(
                    ["ffmpeg", "-y",
                     "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", "-",
                     "-codec:a", "libmp3lame", "-b:a", "64k", mp3_path],
                    input=pcm_bytes,
                    capture_output=True,
                    timeout=30,
                )
                if conv.returncode != 0:
                    err = conv.stderr.decode(errors="replace")[:300]
                    logger.error(f"ffmpeg MP3 falhou: {err}")
                    # Fallback: retorna PCM raw
                    return Response(content=pcm_bytes, media_type="audio/pcm")

                with open(mp3_path, "rb") as f:
                    mp3_bytes = f.read()
                logger.info(f"TTS OK: {len(mp3_bytes)} bytes mp3")
                return Response(content=mp3_bytes, media_type="audio/mpeg")
            finally:
                if os.path.exists(mp3_path):
                    os.remove(mp3_path)
        else:
            # PCM raw (default — o que o livekit-plugins-openai realmente espera)
            logger.info(f"TTS OK: {len(pcm_bytes)} bytes pcm16 raw")
            return Response(content=pcm_bytes, media_type="audio/pcm")

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
    print("  TTS: Supertonic 3 (CPU, 31 languages)")
    print("=" * 50)
    uvicorn.run(app, host="127.0.0.1", port=8001)
