"""Honest WhatsApp reminder scheduling and Day-3 antibiotic adherence webhook."""

from __future__ import annotations

import os
import re
import uuid
from pathlib import Path
from typing import Literal

import httpx
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field

from services.tts_stt_service import synthesize_urdu, to_opus_ogg, transcribe_urdu

router = APIRouter()

_E164_RE = re.compile(r"^\+[1-9]\d{7,14}$")
_PK_LOCAL_RE = re.compile(r"^0(3\d{9})$")


def configured_whatsapp_provider() -> str | None:
    if os.getenv("TWILIO_ACCOUNT_SID") and os.getenv("TWILIO_AUTH_TOKEN") and os.getenv("TWILIO_WHATSAPP_FROM"):
        return "twilio"
    if os.getenv("WHATSAPP_TOKEN") and os.getenv("WHATSAPP_PHONE_NUMBER_ID"):
        return "meta"
    return None


def whatsapp_configured() -> bool:
    return configured_whatsapp_provider() is not None


def _normalize_phone(raw: str) -> str:
    cleaned = re.sub(r"[\s\-()]+", "", raw.strip())
    if cleaned.lower().startswith("whatsapp:"):
        cleaned = cleaned.split(":", 1)[1]
    pk_match = _PK_LOCAL_RE.fullmatch(cleaned)
    if pk_match:
        cleaned = f"+92{pk_match.group(1)}"
    if not _E164_RE.fullmatch(cleaned):
        raise HTTPException(
            status_code=400,
            detail="phone_e164 must be a valid E.164 number (e.g. +923001234567 or 03001234567).",
        )
    return cleaned


class WhatsAppReminderIn(BaseModel):
    patient_id: str = "anonymous"
    scan_id: str | None = None
    brand_name: str = Field(..., min_length=1)
    phone_e164: str
    reminder_type: Literal["day3_checkin", "daily_dose"] = "day3_checkin"
    send_voice_note: bool = False
    preferred_time: str = "08:00"
    language: str = "en"


def _reminder_text(brand_name: str, reminder_type: str) -> str:
    if reminder_type == "day3_checkin":
        return (
            f"Assalam-o-Alaikum! Nuskha Saathi Day-3 check-in: Kya aap ki antibiotic "
            f"'{brand_name}' sahi chal rahi hai? Jawab dein: 1 = Jari hai / theek hai, "
            f"2 = Dawa rok di ya koi masla hua."
        )
    return f"Nuskha Saathi yaad-dehani: Apni dawa '{brand_name}' doctor ki hidayat ke mutabiq waqt par lein."


def _classify_adherence_reply(body: str) -> tuple[str, str]:
    normalized = " ".join(body.strip().casefold().split())
    stopped_markers = ("2", "nahi", "nhi", "no", "chhor", "chor", "stop", "stopped", "rash", "ultee", "vomit", "dard", "masla")
    positive_markers = ("1", "han", "haan", "yes", "ji", "theek", "thik", "le li", "jari", "complete", "done", "ok")

    if any(token == normalized or token in normalized.split() for token in stopped_markers):
        return (
            "STOPPED_OR_SIDE_EFFECT",
            "Ahem: Antibiotic adhi chorne se marz wapas aa sakta hai. Agar reaction ya side effect hua hai to foran apne doctor se rabta karein.",
        )
    if any(token == normalized or token in normalized.split() for token in positive_markers):
        return (
            "ADHERENT",
            "Shukriya! Tabiyat behtar lage tab bhi doctor ke mutaiyan kiye hue poore din ki antibiotic mukammal karein.",
        )
    return (
        "NEEDS_CLARIFICATION",
        "Meherbani karke sirf 1 (Dawa jari hai / theek hai) ya 2 (Dawa rok di ya masla hua) likh kar bhejein.",
    )


async def _prepare_opus_voice_note(audio_dir: Path, text: str) -> Path | None:
    mp3_bytes = await synthesize_urdu(text)
    if not mp3_bytes:
        return None
    audio_dir.mkdir(parents=True, exist_ok=True)
    stem = f"wa_{uuid.uuid4().hex[:12]}"
    mp3_path = audio_dir / f"{stem}.mp3"
    ogg_path = audio_dir / f"{stem}.ogg"
    mp3_path.write_bytes(mp3_bytes)
    try:
        to_opus_ogg(mp3_path, ogg_path)
    except Exception:
        return None
    return ogg_path


async def _send_via_provider(
    provider: str,
    phone_e164: str,
    message: str,
    ogg_path: Path | None = None,
) -> tuple[bool, str | None]:
    async with httpx.AsyncClient(timeout=20.0) as client:
        if provider == "twilio":
            sid = os.environ["TWILIO_ACCOUNT_SID"]
            token = os.environ["TWILIO_AUTH_TOKEN"]
            sender = os.environ["TWILIO_WHATSAPP_FROM"]
            from_addr = sender if sender.startswith("whatsapp:") else f"whatsapp:{sender}"
            form_data = {"From": from_addr, "To": f"whatsapp:{phone_e164}", "Body": message}
            public_backend = os.getenv("PUBLIC_BACKEND_URL", "").strip().rstrip("/")
            if ogg_path is not None and public_backend:
                form_data["MediaUrl"] = f"{public_backend}/static/audio/{ogg_path.name}"
            resp = await client.post(
                f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",
                auth=(sid, token),
                data=form_data,
            )
            if resp.status_code >= 400:
                return False, f"Twilio returned HTTP {resp.status_code}"
            return True, None

        token = os.environ["WHATSAPP_TOKEN"]
        phone_id = os.environ["WHATSAPP_PHONE_NUMBER_ID"]
        resp = await client.post(
            f"https://graph.facebook.com/v20.0/{phone_id}/messages",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "messaging_product": "whatsapp",
                "to": phone_e164.lstrip("+"),
                "type": "text",
                "text": {"body": message},
            },
        )
        if resp.status_code >= 400:
            return False, f"WhatsApp Cloud API returned HTTP {resp.status_code}"

        if ogg_path is not None and ogg_path.is_file():
            try:
                upload = await client.post(
                    f"https://graph.facebook.com/v20.0/{phone_id}/media",
                    headers={"Authorization": f"Bearer {token}"},
                    data={"messaging_product": "whatsapp", "type": "audio/ogg"},
                    files={"file": (ogg_path.name, ogg_path.read_bytes(), "audio/ogg")},
                )
                if upload.status_code < 400:
                    media_id = upload.json().get("id")
                    if media_id:
                        await client.post(
                            f"https://graph.facebook.com/v20.0/{phone_id}/messages",
                            headers={"Authorization": f"Bearer {token}"},
                            json={
                                "messaging_product": "whatsapp",
                                "to": phone_e164.lstrip("+"),
                                "type": "audio",
                                "audio": {"id": media_id},
                            },
                        )
            except httpx.HTTPError:
                pass
        return True, None


@router.get("/api/v1/whatsapp/reminders")
async def list_whatsapp_reminders(request: Request, patient_id: str | None = None):
    reminders = request.app.state.store.list_reminders(patient_id=patient_id)
    return {
        "configured": whatsapp_configured(),
        "provider": configured_whatsapp_provider(),
        "reminders": reminders,
    }


class ReminderStatusIn(BaseModel):
    status: str = Field(..., min_length=1, max_length=40)
    adherence_reply: str | None = Field(None, max_length=500)


@router.patch("/api/v1/whatsapp/reminders/{reminder_id}")
async def update_whatsapp_reminder_status(
    request: Request,
    reminder_id: str,
    body: ReminderStatusIn,
    patient_id: str = Query("anonymous"),
):
    updated = request.app.state.store.update_reminder_status(
        patient_id, reminder_id, body.status, body.adherence_reply
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Reminder not found.")
    return {"updated": True, "reminder": updated}


@router.delete("/api/v1/whatsapp/reminders/{reminder_id}")
async def delete_whatsapp_reminder(request: Request, reminder_id: str, patient_id: str = Query("anonymous")):
    deleted = request.app.state.store.delete_reminder(patient_id, reminder_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Reminder not found.")
    return {"deleted": True, "reminder_id": reminder_id}


@router.post("/api/v1/whatsapp/send-reminder")
async def send_whatsapp_reminder(request: Request, body: WhatsAppReminderIn):
    brand = " ".join(body.brand_name.strip().split())
    if not brand:
        raise HTTPException(status_code=400, detail="brand_name is required.")
    phone = _normalize_phone(body.phone_e164)
    message = _reminder_text(brand, body.reminder_type)
    provider = configured_whatsapp_provider()

    if provider is None:
        saved = request.app.state.store.create_reminder(
            patient_id=body.patient_id,
            scan_id=body.scan_id,
            brand_name=brand,
            phone_e164=phone,
            channel="whatsapp",
            status="UNCONFIGURED",
            preferred_time=body.preferred_time,
            language=body.language,
        )
        return {
            "whatsapp_scheduled": False,
            "status": "UNCONFIGURED",
            "provider": None,
            "reminder_id": saved["id"],
            "day3_checkin_due_at": saved["day3_checkin_due_at"],
            "preferred_time": saved["preferred_time"],
            "language": saved["language"],
            "urdu_message": message,
            "detail": "Saved locally. Configure TWILIO_* or WHATSAPP_* in backend/.env to dispatch live WhatsApp messages automatically.",
        }

    ogg_path: Path | None = None
    if body.send_voice_note:
        ogg_path = await _prepare_opus_voice_note(Path(request.app.state.audio_dir), message)

    try:
        ok, err_detail = await _send_via_provider(provider, phone, message, ogg_path=ogg_path)
    except httpx.HTTPError as exc:
        ok, err_detail = False, f"WhatsApp network failure: {exc}"

    status = "SENT" if ok else "FAILED"
    saved = request.app.state.store.create_reminder(
        patient_id=body.patient_id,
        scan_id=body.scan_id,
        brand_name=brand,
        phone_e164=phone,
        channel="whatsapp",
        status=status,
        preferred_time=body.preferred_time,
        language=body.language,
    )
    return {
        "whatsapp_scheduled": ok,
        "status": status,
        "provider": provider,
        "reminder_id": saved["id"],
        "day3_checkin_due_at": saved["day3_checkin_due_at"],
        "preferred_time": saved["preferred_time"],
        "language": saved["language"],
        "urdu_message": message,
        "detail": err_detail,
    }


@router.get("/api/v1/whatsapp/webhook")
async def verify_whatsapp_webhook(
    hub_mode: str = Query("", alias="hub.mode"),
    hub_verify_token: str = Query("", alias="hub.verify_token"),
    hub_challenge: str = Query("", alias="hub.challenge"),
):
    expected = os.getenv("WHATSAPP_VERIFY_TOKEN", "")
    if hub_mode == "subscribe" and expected and hub_verify_token == expected:
        return PlainTextResponse(hub_challenge)
    raise HTTPException(status_code=403, detail="Webhook verification failed.")


async def _extract_meta_message(payload: dict) -> tuple[str, str]:
    for entry in payload.get("entry") or []:
        for change in (entry.get("changes") or []) if isinstance(entry, dict) else []:
            value = change.get("value") if isinstance(change, dict) else None
            messages = (value or {}).get("messages") or []
            for msg in messages:
                if not isinstance(msg, dict):
                    continue
                sender = str(msg.get("from") or "")
                if sender and not sender.startswith("+"):
                    sender = f"+{sender}"
                msg_type = msg.get("type")
                if msg_type == "text":
                    return sender, str((msg.get("text") or {}).get("body") or "")
                if msg_type == "audio":
                    media_id = (msg.get("audio") or {}).get("id")
                    token = os.getenv("WHATSAPP_TOKEN", "")
                    if media_id and token:
                        try:
                            async with httpx.AsyncClient(timeout=20.0) as client:
                                meta_info = await client.get(
                                    f"https://graph.facebook.com/v20.0/{media_id}",
                                    headers={"Authorization": f"Bearer {token}"},
                                )
                                meta_info.raise_for_status()
                                media_url = meta_info.json().get("url")
                                if media_url:
                                    media_resp = await client.get(
                                        media_url,
                                        headers={"Authorization": f"Bearer {token}"},
                                    )
                                    media_resp.raise_for_status()
                                    transcript = await transcribe_urdu(
                                        media_resp.content,
                                        filename="whatsapp_voice.ogg",
                                        mime_type=media_resp.headers.get("content-type"),
                                    )
                                    return sender, transcript or ""
                        except httpx.HTTPError:
                            return sender, ""
                    return sender, ""
    return "", ""


async def _transcribe_twilio_media(media_url: str, mime_type: str | None) -> str:
    sid = os.getenv("TWILIO_ACCOUNT_SID")
    token = os.getenv("TWILIO_AUTH_TOKEN")
    auth = (sid, token) if sid and token else None
    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            resp = await client.get(media_url, auth=auth)
            resp.raise_for_status()
            transcript = await transcribe_urdu(
                resp.content,
                filename="twilio_voice.ogg",
                mime_type=mime_type or resp.headers.get("content-type"),
            )
            return transcript or ""
    except httpx.HTTPError:
        return ""


@router.post("/api/v1/whatsapp/webhook")
async def whatsapp_webhook(request: Request):
    content_type = (request.headers.get("content-type") or "").lower()
    raw_from = ""
    raw_body = ""
    if "application/json" in content_type:
        payload = await request.json()
        if isinstance(payload, dict):
            if "entry" in payload:
                raw_from, raw_body = await _extract_meta_message(payload)
            else:
                raw_from = str(payload.get("from") or payload.get("From") or "")
                raw_body = str(payload.get("body") or payload.get("Body") or "")
    else:
        form = await request.form()
        raw_from = str(form.get("From") or form.get("from") or "")
        raw_body = str(form.get("Body") or form.get("body") or "")
        media_url = str(form.get("MediaUrl0") or "")
        media_type = str(form.get("MediaContentType0") or "")
        if not raw_body.strip() and media_url.startswith(("http://", "https://")) and media_type.startswith("audio/"):
            raw_body = await _transcribe_twilio_media(media_url, media_type)

    classification, urdu_reply = _classify_adherence_reply(raw_body)
    matched = None
    if raw_from.strip():
        try:
            phone = _normalize_phone(raw_from)
            matched = request.app.state.store.record_whatsapp_reply(phone, classification, raw_body)
        except HTTPException:
            matched = None

    return {
        "status": "received",
        "classification": classification,
        "transcript": raw_body,
        "urdu_reply": urdu_reply,
        "matched_reminder": matched,
    }
