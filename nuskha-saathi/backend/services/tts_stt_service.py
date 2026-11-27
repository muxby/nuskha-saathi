"""Server-side Urdu speech: four fixed neural voices, Urdu script in, plus STT.

Speech comes from the keyless freeapi.pro text-to-speech endpoint, which
serves Microsoft's Urdu neural voices. Azure Speech, when its key is set, is a
fallback that speaks with the same selected voice. The voice is chosen in the
backend panel and is always one of ``VOICES``.

The engine's Roman Urdu is rewritten to Urdu script first (``urdu_speech``);
text that cannot be rewritten exactly is not spoken at all.

Speech-to-text tries Uplift Scribe -> FreeAPI Transcribe -> Gemini -> OpenRouter.
"""

from __future__ import annotations

import asyncio
import base64
import os
import re
import shutil
import subprocess
from collections import OrderedDict
from dataclasses import asdict, dataclass
from pathlib import Path
from xml.sax.saxutils import escape

import httpx

from services.config import env_flag
from services.monitoring import error_category, event
from services.urdu_speech import speech_text

MAX_TTS_CHARS = 6000
MAX_STT_BYTES = 25 * 1024 * 1024

FREEAPI_TTS_URL = "https://freeapi.pro/api/tts"
# The endpoint slows sharply on long text, so the script goes up in short
# sentence-aligned pieces that are synthesised side by side and joined.
CHUNK_CHARS = 280
CHUNK_TIMEOUT_SECONDS = 25.0
TOTAL_TIMEOUT_SECONDS = 40.0
CACHE_ENTRIES = 48

SAMPLE_TEXT = "السلام علیکم۔ میں نسخہ ساتھی کی آواز ہوں۔ یہ دوائی صبح اور رات کھانے کے بعد لینی ہے۔"

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


@dataclass(frozen=True)
class Voice:
    key: str
    name: str
    gender: str
    country: str
    edge_voice: str


# The only voices this app may speak with.
VOICES: dict[str, Voice] = {
    voice.key: voice
    for voice in (
        Voice("uzma", "Uzma", "Female", "Pakistan", "ur-PK-UzmaNeural"),
        Voice("asad", "Asad", "Male", "Pakistan", "ur-PK-AsadNeural"),
        Voice("gul", "Gul", "Female", "India", "ur-IN-GulNeural"),
        Voice("salman", "Salman", "Male", "India", "ur-IN-SalmanNeural"),
    )
}
DEFAULT_VOICE = "uzma"
VOICE_SETTING = "urdu_voice"

_selected: str | None = None
_cache: OrderedDict[tuple[str, str], bytes] = OrderedDict()


def default_voice() -> Voice:
    """Voice used until the panel picks one: ``URDU_TTS_VOICE`` or Uzma."""
    return VOICES.get(os.getenv("URDU_TTS_VOICE", "").strip().lower(), VOICES[DEFAULT_VOICE])


def selected_voice() -> Voice:
    return VOICES.get(_selected or "", default_voice())


def select_voice(key: str | None) -> Voice:
    """Make ``key`` the active voice. Unknown or empty keys restore the default."""
    global _selected
    clean = (key or "").strip().lower()
    _selected = clean if clean in VOICES else None
    return selected_voice()


def voice_options() -> list[dict]:
    return [asdict(voice) for voice in VOICES.values()]


def freeapi_enabled() -> bool:
    return os.getenv("FREEAPI_TTS_ENABLED", "1").strip().lower() not in {"0", "false", "off", "no"}


def azure_configured() -> bool:
    return bool(os.getenv("AZURE_SPEECH_KEY") and os.getenv("AZURE_SPEECH_REGION"))


def configured_tts_provider() -> str | None:
    """Return active primary TTS provider name, or None."""
    if freeapi_enabled():
        return "freeapi_tts"
    if azure_configured():
        return "azure"
    return None


def tts_configured() -> bool:
    """Return True when a server-side Urdu voice provider is available."""
    return freeapi_enabled() or azure_configured()


def freeapi_transcribe_enabled() -> bool:
    if "FREEAPI_TRANSCRIBE_ENABLED" in os.environ:
        return env_flag("FREEAPI_TRANSCRIBE_ENABLED", True)
    return not bool(os.getenv("PYTEST_CURRENT_TEST"))


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


def split_for_speech(text: str, limit: int = CHUNK_CHARS) -> list[str]:
    """Split at sentence ends so no piece exceeds ``limit`` where a break exists."""
    sentences = [part for part in re.split(r"(?<=[۔!؟.])\s+", text.strip()) if part]
    chunks: list[str] = []
    current = ""
    for sentence in sentences:
        if current and len(current) + 1 + len(sentence) > limit:
            chunks.append(current)
            current = sentence
        else:
            current = f"{current} {sentence}".strip()
    if current:
        chunks.append(current)
    return chunks


async def synthesize_urdu(text: str, voice: str | None = None) -> bytes | None:
    """Return MP3 bytes in the selected voice, or None so the client falls back."""
    if not tts_configured():
        return None
    spoken = speech_text((text or "")[:MAX_TTS_CHARS])
    if not spoken:
        event("urdu_speech_text", "unavailable")
        return None
    chosen = VOICES.get((voice or "").strip().lower()) or selected_voice()
    cached = _cache.get((chosen.key, spoken))
    if cached:
        _cache.move_to_end((chosen.key, spoken))
        return cached

    chunks = split_for_speech(spoken)
    providers = [fn for fn, on in ((_freeapi, freeapi_enabled()), (_azure, azure_configured())) if on]
    async with httpx.AsyncClient(timeout=CHUNK_TIMEOUT_SECONDS) as client:
        for provider in providers:
            try:
                parts = await asyncio.wait_for(
                    asyncio.gather(*(provider(client, chunk, chosen) for chunk in chunks)),
                    timeout=TOTAL_TIMEOUT_SECONDS,
                )
            except (httpx.HTTPError, ValueError, asyncio.TimeoutError) as exc:
                event("tts" + provider.__name__, "failed", error=error_category(exc))
                continue
            audio = b"".join(parts)
            _cache[(chosen.key, spoken)] = audio
            while len(_cache) > CACHE_ENTRIES:
                _cache.popitem(last=False)
            return audio
    return None


async def _freeapi(client: httpx.AsyncClient, text: str, voice: Voice) -> bytes:
    last: Exception = ValueError("no attempt")
    for _attempt in range(2):
        try:
            response = await client.post(FREEAPI_TTS_URL, json={"voice": voice.name, "text": text})
            response.raise_for_status()
        except httpx.HTTPError as exc:
            last = exc
            continue
        # The provider reports which neural voice actually spoke. Anything
        # other than the voice asked for is treated as a failure, not played.
        if response.headers.get("x-edge-voice") != voice.edge_voice:
            raise ValueError("unexpected voice")
        if not response.headers.get("content-type", "").startswith("audio/") or not response.content:
            raise ValueError("no audio")
        return response.content
    raise last


async def _azure(client: httpx.AsyncClient, text: str, voice: Voice) -> bytes:
    region = os.getenv("AZURE_SPEECH_REGION")
    ssml = (
        f'<speak version="1.0" xml:lang="{voice.edge_voice[:5]}">'
        f'<voice name="{voice.edge_voice}">'
        f"{escape(text)}</voice></speak>"
    )
    response = await client.post(
        f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1",
        headers={
            "Ocp-Apim-Subscription-Key": os.getenv("AZURE_SPEECH_KEY", ""),
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        },
        content=ssml.encode("utf-8"),
    )
    response.raise_for_status()
    if not response.content:
        raise ValueError("no audio")
    return response.content


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
