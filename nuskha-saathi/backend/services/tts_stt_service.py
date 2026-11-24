"""Server-side Urdu speech synthesis with ordered provider fallbacks."""

from __future__ import annotations

import base64
import os
import subprocess
from pathlib import Path

import httpx

MAX_TTS_CHARS = 2500
MAX_STT_BYTES = 25 * 1024 * 1024


async def synthesize_urdu(text: str) -> bytes | None:
    """Return MP3 bytes, or None so the client can use browser speech."""
    text = text[:MAX_TTS_CHARS].strip()
    if not text:
        return None
    async with httpx.AsyncClient(timeout=35) as client:
        for provider in (_uplift, _azure, _google):
            try:
                audio = await provider(client, text)
                if audio:
                    return audio
            except (httpx.HTTPError, ValueError, KeyError):
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
    """Conversion hook for a later WhatsApp voice note pipeline."""
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
