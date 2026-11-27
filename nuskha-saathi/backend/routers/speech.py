"""POST /api/v1/speech: one Urdu line spoken in the selected voice."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from services.monitoring import stage
from services.tts_stt_service import MAX_TTS_CHARS, synthesize_urdu

router = APIRouter()


class SpeechIn(BaseModel):
    text: str = Field(min_length=1, max_length=MAX_TTS_CHARS)


@router.post("/api/v1/speech")
async def speak(body: SpeechIn):
    """MP3 for an engine line or Urdu-script text. 503 lets the client fall back."""
    with stage("urdu_audio"):
        audio = await synthesize_urdu(body.text)
    if not audio:
        raise HTTPException(status_code=503, detail="Urdu voice is not available for this text.")
    return Response(content=audio, media_type="audio/mpeg")
