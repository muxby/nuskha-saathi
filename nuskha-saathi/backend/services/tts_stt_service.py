"""Server-side Urdu speech: four fixed neural voices, Urdu script in.

Speech comes from the keyless freeapi.pro text-to-speech endpoint, which
serves Microsoft's Urdu neural voices. Azure Speech, when its key is set, is a
fallback that speaks with the same selected voice. The voice is chosen in the
backend panel and is always one of ``VOICES``.

The engine's Roman Urdu is rewritten to Urdu script first (``urdu_speech``);
text that cannot be rewritten exactly is not spoken at all.
"""

from __future__ import annotations

import asyncio
import os
import re
import shutil
import subprocess
from collections import OrderedDict
from dataclasses import asdict, dataclass
from pathlib import Path
from xml.sax.saxutils import escape

import httpx

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


def tts_configured() -> bool:
    """Return True when a server-side Urdu voice provider is available."""
    return freeapi_enabled() or azure_configured()


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
    """Conversion hook for a later WhatsApp voice note pipeline."""
    if not shutil.which("ffmpeg"):
        raise RuntimeError("ffmpeg binary is not available on PATH")
    target_ogg.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(source_mp3), "-c:a", "libopus", "-b:a", "32k", str(target_ogg)],
        check=True,
        capture_output=True,
    )


async def transcribe_urdu(audio: bytes, filename: str = "speech.ogg") -> str | None:
    """Phase 4 entry point; fail closed until Scribe credentials are supplied."""
    token = os.getenv("UPLIFT_API_KEY")
    if not token or not audio or len(audio) > MAX_STT_BYTES:
        return None
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                "https://api.upliftai.org/v1/transcribe/speech-to-text",
                headers={"Authorization": f"Bearer {token}"},
                data={"model": "scribe", "language": "ur"},
                files={"file": (filename, audio)},
            )
            response.raise_for_status()
            return response.json().get("text")
    except (httpx.HTTPError, ValueError):
        return None
