"""Honest WhatsApp reminder scheduling and Day-3 antibiotic adherence webhook."""

from __future__ import annotations

import os
import re
from typing import Literal

import httpx
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field

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


async def _send_via_provider(provider: str, phone_e164: str, message: str) -> tuple[bool, str | None]:
    async with httpx.AsyncClient(timeout=15.0) as client:
        if provider == "twilio":
            sid = os.environ["TWILIO_ACCOUNT_SID"]
            token = os.environ["TWILIO_AUTH_TOKEN"]
            sender = os.environ["TWILIO_WHATSAPP_FROM"]
            from_addr = sender if sender.startswith("whatsapp:") else f"whatsapp:{sender}"
            resp = await client.post(
                f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",
                auth=(sid, token),
                data={"From": from_addr, "To": f"whatsapp:{phone_e164}", "Body": message},
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
        return True, None


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
        )
        return {
            "whatsapp_scheduled": False,
            "status": "UNCONFIGURED",
            "provider": None,
            "reminder_id": saved["id"],
            "day3_checkin_due_at": saved["day3_checkin_due_at"],
            "urdu_message": message,
            "detail": "WhatsApp provider credentials (TWILIO_* or WHATSAPP_*) are not configured.",
        }

    try:
        ok, err_detail = await _send_via_provider(provider, phone, message)
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
    )
    return {
        "whatsapp_scheduled": ok,
        "status": status,
        "provider": provider,
        "reminder_id": saved["id"],
        "day3_checkin_due_at": saved["day3_checkin_due_at"],
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


@router.post("/api/v1/whatsapp/webhook")
async def whatsapp_webhook(request: Request):
    content_type = (request.headers.get("content-type") or "").lower()
    raw_from = ""
    raw_body = ""
    if "application/json" in content_type:
        payload = await request.json()
        if isinstance(payload, dict):
            raw_from = str(payload.get("from") or payload.get("From") or "")
            raw_body = str(payload.get("body") or payload.get("Body") or "")
    else:
        form = await request.form()
        raw_from = str(form.get("From") or form.get("from") or "")
        raw_body = str(form.get("Body") or form.get("body") or "")

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
        "urdu_reply": urdu_reply,
        "matched_reminder": matched,
    }
