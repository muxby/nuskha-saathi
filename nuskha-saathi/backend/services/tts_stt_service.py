"""Server-side Urdu speech synthesis and transcription with ordered provider fallbacks."""

from __future__ import annotations

import base64
import os
import shutil
import subprocess
from pathlib import Path

import httpx

from services.config import env_flag
from services.monitoring import error_category, event

MAX_TTS_CHARS = 2500
MAX_STT_BYTES = 25 * 1024 * 1024

_AUDIO_MIME_BY_SUFFIX = {
    ".ogg": "audio/ogg",
    ".oga": "audio/ogg",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".mp4": "audio/mp4",
    ".webm": "audio/webm",
    ".aac": "audio/aac",
    ".flac": "audio/flac",
}

_OPENROUTER_AUDIO_FORMAT = {
    "audio/wav": "wav",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/ogg": "ogg",
    "audio/flac": "flac",
    "audio/aac": "aac",
}


def freeapi_transcribe_enabled() -> bool:
    if "FREEAPI_TRANSCRIBE_ENABLED" in os.environ:
        return env_flag("FREEAPI_TRANSCRIBE_ENABLED", True)
    return not bool(os.getenv("PYTEST_CURRENT_TEST"))


def configured_tts_provider() -> str | None:
    """Return active primary TTS provider name configured via .env, or None."""
    if os.getenv("UPLIFT_API_KEY") and os.getenv("UPLIFT_VOICE_ID"):
        return "uplift"
    if os.getenv("AZURE_SPEECH_KEY") and os.getenv("AZURE_SPEECH_REGION"):
        return "azure"
    if os.getenv("GOOGLE_TTS_API_KEY"):
        return "google"
    return None


def tts_configured() -> bool:
    """Return True when at least one external TTS provider has credentials."""
    return configured_tts_provider() is not None


def configured_stt_provider() -> str | None:
    if os.getenv("UPLIFT_API_KEY"):
        return "uplift"
    if freeapi_transcribe_enabled():
        return "freeapi_transcribe"
    if os.getenv("GEMINI_API_KEY"):
        return "gemini"
    if os.getenv("OPENROUTER_API_KEY"):
        return "openrouter"
    return None


def stt_configured() -> bool:
    """Return True when any STT backend (Uplift, FreeAPI Transcribe, Gemini, or OpenRouter) is active."""
    return configured_stt_provider() is not None


def _audio_mime(filename: str, mime_type: str | None = None) -> str:
    if mime_type:
        clean = mime_type.split(";")[0].strip().lower()
        if clean.startswith("audio/"):
            return clean
    suffix = Path(filename or "speech.ogg").suffix.lower()
    return _AUDIO_MIME_BY_SUFFIX.get(suffix, "audio/ogg")


async def synthesize_urdu(text: str) -> bytes | None:
    """Return MP3 bytes, or None so the client can use browser speech."""
    text = text[:MAX_TTS_CHARS].strip()
    if not text or not tts_configured():
        return None
    async with httpx.AsyncClient(timeout=35) as client:
        for provider in (_uplift, _azure, _google):
            try:
                audio = await provider(client, text)
                if audio:
                    return audio
            except (httpx.HTTPError, ValueError, KeyError) as exc:
                event("tts" + provider.__name__, "failed", error=error_category(exc))
                continue
    return None


async def _uplift(client: httpx.AsyncClient, text: str) -> bytes | None:
    token = os.getenv("UPLIFT_API_KEY")
    voice = os.getenv("UPLIFT_VOICE_ID")
    if not token or not voice:
        return None
    response = await client.post(
        "https://api.upliftai.org/v1/synthesis/text-to-speech",
        headers={"Authorization": f"Bearer {token}"},
        json={"text": text, "voiceId": voice, "outputFormat": "MP3_22050_128"},
    )
    response.raise_for_status()
    if response.headers.get("content-type", "").startswith("audio/"):
        return response.content
    data = response.json()
    encoded = data.get("audioContent") or data.get("audio")
    if encoded:
        return base64.b64decode(encoded)
    url = data.get("audioUrl") or data.get("url")
    if url:
        download = await client.get(url)
        download.raise_for_status()
        return download.content
    return None


async def _azure(client: httpx.AsyncClient, text: str) -> bytes | None:
    key = os.getenv("AZURE_SPEECH_KEY")
    region = os.getenv("AZURE_SPEECH_REGION")
    if not key or not region:
        return None
    from xml.sax.saxutils import escape

    ssml = (
        '<speak version="1.0" xml:lang="ur-PK">'
        '<voice name="ur-PK-UzmaNeural">'
        f"{escape(text)}</voice></speak>"
    )
    response = await client.post(
        f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1",
        headers={
            "Ocp-Apim-Subscription-Key": key,
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        },
        content=ssml.encode("utf-8"),
    )
    response.raise_for_status()
    return response.content


async def _google(client: httpx.AsyncClient, text: str) -> bytes | None:
    key = os.getenv("GOOGLE_TTS_API_KEY")
    if not key:
        return None
    response = await client.post(
        "https://texttospeech.googleapis.com/v1/text:synthesize",
        params={"key": key},
        json={
            "input": {"text": text},
            "voice": {"languageCode": "ur-PK", "name": "ur-PK-Standard-A"},
            "audioConfig": {"audioEncoding": "MP3"},
        },
    )
    response.raise_for_status()
    return base64.b64decode(response.json()["audioContent"])


def to_opus_ogg(source_mp3: Path, target_ogg: Path) -> None:
    """Conversion hook for WhatsApp voice notes (Opus OGG)."""
    if not shutil.which("ffmpeg"):
        raise RuntimeError("ffmpeg binary is not available on PATH")
    target_ogg.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(source_mp3), "-c:a", "libopus", "-b:a", "32k", str(target_ogg)],
        check=True,
        capture_output=True,
    )


async def _transcribe_freeapi(audio: bytes, filename: str, mime_type: str, language: str) -> str | None:
    base_url = os.getenv("FREEAPI_BASE_URL", "https://freeapi.pro").rstrip("/")
    data_url = f"data:{mime_type};base64,{base64.b64encode(audio).decode('ascii')}"
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            f"{base_url}/api/transcribe",
            json={
                "audio": data_url,
                "filename": filename,
                "mime": mime_type,
                "language": language or "auto",
                "model": "turbo",
            },
        )
        response.raise_for_status()
        text = (response.json().get("text") or "").strip()
        return text or None


async def _transcribe_gemini(audio: bytes, mime_type: str) -> str | None:
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        return None
    model = os.getenv("GEMINI_MODEL") or "gemini-2.5-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    body = {
        "contents": [
            {
                "parts": [
                    {
                        "text": (
                            "Transcribe this patient voice message faithfully in Urdu or Roman Urdu/English "
                            "exactly as spoken. Return only the plain transcript text, nothing else."
                        )
                    },
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": base64.b64encode(audio).decode("ascii"),
                        }
                    },
                ]
            }
        ],
        "generationConfig": {"temperature": 0.0},
    }
    async with httpx.AsyncClient(timeout=60) as client:
        # The key travels in a header so it can never appear in a logged URL.
        response = await client.post(url, json=body, headers={"x-goog-api-key": key})
        response.raise_for_status()
        payload = response.json()
    candidates = payload.get("candidates") or []
    if not candidates:
        return None
    parts = ((candidates[0].get("content") or {}).get("parts")) or []
    text = " ".join(
        part.get("text", "")
        for part in parts
        if isinstance(part, dict) and not part.get("thought")
    ).strip()
    return text or None


async def _transcribe_openrouter(audio: bytes, mime_type: str) -> str | None:
    key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if not key:
        return None
    model = os.getenv("OPENROUTER_AUDIO_MODEL", "").strip() or "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"
    audio_fmt = _OPENROUTER_AUDIO_FORMAT.get(mime_type, "ogg")
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={
                "model": model,
                "max_tokens": 512,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Transcribe the spoken Urdu or English audio faithfully. Return only the transcript."},
                            {"type": "input_audio", "input_audio": {"data": base64.b64encode(audio).decode("ascii"), "format": audio_fmt}},
                        ],
                    }
                ],
            },
        )
        response.raise_for_status()
        choices = response.json().get("choices") or []
        content = ((choices[0].get("message") or {}).get("content")) if choices else ""
        return content.strip() if isinstance(content, str) and content.strip() else None


async def transcribe_urdu(
    audio: bytes,
    filename: str = "speech.ogg",
    mime_type: str | None = None,
    language: str = "ur",
) -> str | None:
    """Transcribe speech via Uplift Scribe -> FreeAPI Transcribe -> Gemini -> OpenRouter."""
    if not audio or len(audio) > MAX_STT_BYTES:
        return None

    mime = _audio_mime(filename, mime_type)

    token = os.getenv("UPLIFT_API_KEY")
    if token:
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                response = await client.post(
                    "https://api.upliftai.org/v1/transcribe/speech-to-text",
                    headers={"Authorization": f"Bearer {token}"},
                    data={"model": "scribe", "language": language},
                    files={"file": (filename, audio)},
                )
                response.raise_for_status()
                text = (response.json().get("text") or "").strip()
                if text:
                    return text
        except (httpx.HTTPError, ValueError) as exc:
            event("stt_uplift", "failed", error=error_category(exc))

    if freeapi_transcribe_enabled():
        try:
            text = await _transcribe_freeapi(audio, filename, mime, language)
            if text:
                return text
        except (httpx.HTTPError, ValueError) as exc:
            event("stt_freeapi_transcribe", "failed", error=error_category(exc))

    if os.getenv("GEMINI_API_KEY"):
        try:
            text = await _transcribe_gemini(audio, mime)
            if text:
                return text
        except (httpx.HTTPError, ValueError) as exc:
            event("stt_gemini", "failed", error=error_category(exc))

    if os.getenv("OPENROUTER_API_KEY"):
        try:
            text = await _transcribe_openrouter(audio, mime)
            if text:
                return text
        except (httpx.HTTPError, ValueError) as exc:
            event("stt_openrouter", "failed", error=error_category(exc))

    return None
