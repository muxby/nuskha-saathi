"""Vision extraction (Gemini, OpenRouter, and FreeAPI ImgChat). Perception only."""

from __future__ import annotations

import asyncio
import base64
import json
import os
import re

import httpx

from schemas.vision import VisionExtraction
from services.config import env_flag
from services.monitoring import error_category, event

DEFAULT_MODEL = "gemini-2.5-flash"
# Tried in order when the configured model id is retired or unknown (HTTP 404).
FALLBACK_MODELS: tuple[str, ...] = ("gemini-flash-latest", "gemini-2.5-flash-lite")
DEFAULT_OPENROUTER_MODEL = "nvidia/nemotron-3.5-super-vl:free"
DEFAULT_OPENROUTER_FALLBACKS = (
    "google/gemma-4-31b-it:free",
    "google/gemma-4-26b-a4b-it:free",
    "inclusionai/ling-3.2-flash:free",
    "openrouter/free",
)

_PARCHI_PROMPT = (
    "You are a high-precision medical prescription OCR extractor. "
    "Extract ONLY prescribed medication/drug items from this prescription photo. "
    "Return ONLY valid JSON matching this schema: "
    '{"extracted_lines": [{"raw_text": string, "brand_or_salt_guess": string, '
    '"strength_mg": number|null, "dosage_form": string|null, '
    '"morning_qty": number|null, "afternoon_qty": number|null, "night_qty": number|null, '
    '"meal_timing": "before_food"|"after_food"|"any", "duration_days": integer|null, '
    '"ocr_confidence": number, "bbox_1000": [ymin,xmin,ymax,xmax]}], '
    '"image_quality_warning": boolean}. '
    "STRICTLY EXCLUDE everything that is not a prescribed medicine: ignore clinic headers, dates, reg/slip IDs, "
    "patient name/age/sex/weight, vitals (BP, B.P., SpO2, Temp, Pulse, RBS, Hb), symptoms/complaints/diagnosis "
    "(e.g. Anxiety, Gastritis, Fever, C/O, Dx), lifestyle/general advice (Diet, Walk, Exercise, Rest, Water), "
    "standalone headers ('Rx', 'R/', 'Advice'), and follow-up/review lines ('Follow up', 'Review after...'). "
    "For each medicine line: copy the written medicine line into raw_text, and put ONLY the clean drug brand "
    "or generic salt name (without 'Tab.', 'Cap.', 'T.', 'C.', 'Syp.', 'Inj.', strength, or 'OD'/'BD'/'HS') "
    "into brand_or_salt_guess. "
    "Do NOT confuse frequency codes ('1OD', '1 OD', '1BD', '1HS', '1OD HS', 'OD', 'BD', 'TDS', '1-0-1') with strength_mg "
    "(never misread '1OD' or '1HS' as 100mg). Set strength_mg to the written numeric milligram amount ONLY if an "
    "explicit dose strength is written, otherwise null. "
    "Map frequency slots carefully: OD / 1OD / 1-0-0 -> morning=1, afternoon=0, night=0 "
    "(unless bedtime/HS/night/PM is written -> morning=0, afternoon=0, night=1); BD / 1BD / 1-0-1 -> 1, 0, 1; "
    "TDS / 1-1-1 -> 1, 1, 1; QID -> 2, 1, 1; HS / 1HS -> 0, 0, 1; SOS / PRN -> 0, 0, 0; fractions like 1/2 -> 0.5; or null if unclear. "
    "If a shared bracket '{' marks 'after meals' or 'before meals' across multiple lines, apply that meal_timing to all lines inside the bracket. "
    "meal_timing is before_food (ac), after_food (pc), or any. "
    "duration_days is positive integer days (convert '1 week' -> 7, '2 weeks' -> 14), or null if not written. "
    "Do not decide whether a medicine is safe. "
    "Calibrate ocr_confidence in [0, 1]: set 0.90 to 0.98 whenever the medicine name letters are clearly readable "
    "(including clear handwriting for tablets, capsules, syrups, dental/topical gels, and gum paints), "
    "0.70 to 0.82 only when key letters are smudged or ambiguous, and below 0.60 when illegible. "
    "Use bbox_1000 on a 0 to 1000 grid."
)

_STRIP_PROMPT = (
    "You read one physical medicine strip or box. Return only valid JSON: "
    '{"extracted_lines": [{"raw_text": string, "brand_or_salt_guess": string, '
    '"strength_mg": number|null, "ocr_confidence": number, "bbox_1000": [ymin,xmin,ymax,xmax]}], '
    '"image_quality_warning": boolean}. '
    "Extract the printed brand, strength in milligrams, and an honest ocr_confidence between 0 and 1. "
    "Do not decide whether it matches a prescription."
)

_RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "extracted_lines": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "raw_text": {"type": "STRING"},
                    "brand_or_salt_guess": {"type": "STRING"},
                    "strength_mg": {"type": "NUMBER", "nullable": True},
                    "dosage_form": {"type": "STRING", "nullable": True},
                    "morning_qty": {"type": "NUMBER", "nullable": True},
                    "afternoon_qty": {"type": "NUMBER", "nullable": True},
                    "night_qty": {"type": "NUMBER", "nullable": True},
                    "meal_timing": {"type": "STRING", "nullable": True},
                    "duration_days": {"type": "INTEGER", "nullable": True},
                    "ocr_confidence": {"type": "NUMBER"},
                    "bbox_1000": {"type": "ARRAY", "items": {"type": "NUMBER"}, "nullable": True},
                },
                "required": ["raw_text", "brand_or_salt_guess", "ocr_confidence"],
            },
        },
        "image_quality_warning": {"type": "BOOLEAN"},
    },
    "required": ["extracted_lines", "image_quality_warning"],
}


class VisionExtractError(Exception):
    """The photo could not be turned into the extraction schema.

    ``code`` separates a photo problem from a service problem so the patient
    is never told their handwriting is unclear when the reader is simply down:

    - ``BAD_OUTPUT``: the model answered but not in the schema (photo-level).
    - ``NOT_CONFIGURED``: no API key on the server.
    - ``UPSTREAM_REJECTED``: the provider refused the request (key, model, quota).
    - ``UPSTREAM_UNAVAILABLE``: timeout, network failure or provider 5xx.
    """

    def __init__(self, message: str = "", code: str = "BAD_OUTPUT"):
        super().__init__(message)
        self.code = code


SERVICE_ERROR_CODES = frozenset({"NOT_CONFIGURED", "UPSTREAM_REJECTED", "UPSTREAM_UNAVAILABLE"})


def _as_extract_error(exc: Exception) -> VisionExtractError:
    """Classify any provider failure into the service/photo error codes."""
    if isinstance(exc, VisionExtractError):
        return exc
    if isinstance(exc, httpx.HTTPStatusError):
        status = exc.response.status_code if exc.response is not None else 0
        code = "UPSTREAM_UNAVAILABLE" if status >= 500 else "UPSTREAM_REJECTED"
        return VisionExtractError(f"Vision provider answered HTTP {status}", code=code)
    if isinstance(exc, (httpx.TimeoutException, httpx.TransportError)):
        return VisionExtractError("Vision provider unreachable", code="UPSTREAM_UNAVAILABLE")
    return VisionExtractError(str(exc) or "vision extraction failed")


def freeapi_imgchat_enabled() -> bool:
    if "FREEAPI_IMGCHAT_ENABLED" in os.environ:
        return env_flag("FREEAPI_IMGCHAT_ENABLED", True)
    return not bool(os.getenv("PYTEST_CURRENT_TEST"))


def configured_vision_provider() -> str | None:
    order = _provider_order()
    return order[0] if order else None


def vision_configured() -> bool:
    return bool(_provider_order())


def _provider_order() -> list[str]:
    has_gemini = bool(os.getenv("GEMINI_API_KEY"))
    has_openrouter = bool(os.getenv("OPENROUTER_API_KEY"))
    has_imgchat = freeapi_imgchat_enabled()
    primary = os.getenv("VISION_PRIMARY", "auto").strip().lower()

    available = []
    if has_gemini:
        available.append("gemini")
    if has_openrouter:
        available.append("openrouter")
    if has_imgchat:
        available.append("imgchat")

    if primary in {"gemini", "openrouter", "imgchat"} and primary in available:
        return [primary, *[p for p in available if p != primary]]
    return available


def _strip_fence(text: str) -> str:
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?", "", cleaned, flags=re.IGNORECASE).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()
    return cleaned


def _extract_json_payload(text: str) -> dict:
    cleaned = _strip_fence(text)
    parsed = None
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        for opener, closer in (("{", "}"), ("[", "]")):
            start = cleaned.find(opener)
            end = cleaned.rfind(closer)
            if start != -1 and end > start:
                try:
                    parsed = json.loads(cleaned[start : end + 1])
                    break
                except json.JSONDecodeError:
                    continue
    if parsed is None:
        raise VisionExtractError("Vision response was not valid JSON")
    if isinstance(parsed, list):
        parsed = {"extracted_lines": parsed, "image_quality_warning": False}
    elif isinstance(parsed, dict) and "extracted_lines" not in parsed and (
        "brand_or_salt_guess" in parsed or "raw_text" in parsed
    ):
        parsed = {"extracted_lines": [parsed], "image_quality_warning": False}
    if not isinstance(parsed, dict):
        raise VisionExtractError("Vision JSON root must be an object")
    return parsed


def _text_from_gemini(payload: dict) -> str:
    candidates = payload.get("candidates") or []
    if not candidates:
        raise VisionExtractError("Gemini returned no candidates")
    parts = ((candidates[0].get("content") or {}).get("parts")) or []
    text = "\n".join(
        part.get("text", "")
        for part in parts
        if isinstance(part, dict) and not part.get("thought")
    ).strip()
    if not text:
        raise VisionExtractError("Gemini returned no text")
    return _strip_fence(text)


_NON_RETRYABLE_STATUSES = frozenset({400, 401, 403, 404})


def _normalize_mime(mime: str | None) -> str:
    clean = (mime or "image/jpeg").split(";")[0].strip().lower()
    if clean == "image/jpg":
        return "image/jpeg"
    return clean or "image/jpeg"


def _openrouter_models() -> list[str]:
    primary = os.environ.get("OPENROUTER_MODEL", "").strip() or DEFAULT_OPENROUTER_MODEL
    raw_fallbacks = os.environ.get("OPENROUTER_FALLBACK_MODELS", "")
    fallbacks = (
        [item.strip() for item in raw_fallbacks.split(",") if item.strip()]
        if raw_fallbacks.strip()
        else list(DEFAULT_OPENROUTER_FALLBACKS)
    )
    ordered: list[str] = []
    for item in [primary, *fallbacks]:
        if item and item not in ordered:
            ordered.append(item)
    return ordered


def _openrouter_message_text(payload: dict) -> str:
    """Extract text from OpenRouter chat completion, handling reasoning fallback."""
    choices = payload.get("choices") or []
    message = (choices[0].get("message") or {}) if choices else {}
    content = message.get("content")
    if isinstance(content, list):
        content = "\n".join(
            item.get("text", "") for item in content if isinstance(item, dict)
        )
    if isinstance(content, str) and content.strip():
        return content.strip()
    for field in ("reasoning", "reasoning_content"):
        extra = message.get(field)
        if isinstance(extra, str) and extra.strip():
            return extra.strip()
    return ""


class GeminiVisionExtractor:
    """Multi-provider vision extractor supporting Gemini, OpenRouter, and FreeAPI ImgChat."""

    counts_as_live = True

    def __init__(self, api_key: str | None = None, model: str | None = None, http_post=None, backoff_seconds: float = 0.4):
        self._explicit_api_key = api_key
        self._explicit_model = model
        self.http_post = http_post
        self.backoff_seconds = backoff_seconds
        self.active_model = self.model
        # Set once a live provider has answered; None until the first real scan.
        self.last_provider: str | None = None

    @property
    def api_key(self) -> str | None:
        if self._explicit_api_key is not None:
            return self._explicit_api_key
        return os.environ.get("GEMINI_API_KEY") or None

    @api_key.setter
    def api_key(self, value: str | None) -> None:
        self._explicit_api_key = value

    @property
    def model(self) -> str:
        if self._explicit_model:
            return self._explicit_model
        return os.environ.get("GEMINI_MODEL") or DEFAULT_MODEL

    @model.setter
    def model(self, value: str | None) -> None:
        self._explicit_model = value

    async def extract(self, image_bytes: bytes, mime: str, mode: str = "parchi") -> VisionExtraction:
        if not image_bytes:
            raise VisionExtractError("empty image")
        prompt = _STRIP_PROMPT if mode == "strip" else _PARCHI_PROMPT
        norm_mime = _normalize_mime(mime)

        if self.http_post is not None:
            return await self._extract_gemini(image_bytes, norm_mime, prompt)

        # Gemini is available when this extractor holds a key, whatever the env says.
        providers = [p for p in _provider_order() if p != "gemini"]
        if self.api_key:
            primary = os.getenv("VISION_PRIMARY", "auto").strip().lower()
            providers.insert(1 if primary in providers[:1] else 0, "gemini")
        if not providers:
            raise VisionExtractError(
                "No vision provider configured (set GEMINI_API_KEY, OPENROUTER_API_KEY, or FREEAPI_IMGCHAT_ENABLED)",
                code="NOT_CONFIGURED",
            )

        errors: list[VisionExtractError] = []
        for provider in providers:
            try:
                if provider == "gemini":
                    extraction = await self._extract_gemini(image_bytes, norm_mime, prompt)
                elif provider == "openrouter":
                    extraction = await self._extract_openrouter(image_bytes, norm_mime, prompt)
                else:
                    extraction = await self._extract_imgchat(image_bytes, norm_mime, prompt)
                self.last_provider = provider
                return extraction
            except Exception as exc:  # noqa: BLE001 — fall through to next configured provider
                errors.append(_as_extract_error(exc))
                event(f"vision_{provider}", "failed", error=error_category(exc))

        # A photo problem is reported only when every reader answered and none
        # could parse it. One reader being down must not blame the photo.
        service = [e for e in errors if e.code in SERVICE_ERROR_CODES]
        final = service[0] if service else errors[-1]
        raise final

    async def _extract_gemini(self, image_bytes: bytes, mime: str, prompt: str) -> VisionExtraction:
        if not self.api_key and self.http_post is None:
            raise VisionExtractError("GEMINI_API_KEY is not set", code="NOT_CONFIGURED")
        body = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": mime,
                                "data": base64.b64encode(image_bytes).decode("ascii"),
                            }
                        },
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.0,
                "responseMimeType": "application/json",
                "responseSchema": _RESPONSE_SCHEMA,
            },
        }
        models = [self.model, *[m for m in FALLBACK_MODELS if m != self.model]]
        for index, model in enumerate(models):
            try:
                extraction = await self._extract_with_model(model, body)
            except VisionExtractError as exc:
                retired = getattr(exc, "http_status", None) == 404
                if retired and index < len(models) - 1:
                    continue
                raise
            self.active_model = model
            return extraction
        raise VisionExtractError("vision extraction failed", code="UPSTREAM_REJECTED")

    async def _extract_with_model(self, model: str, body: dict) -> VisionExtraction:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        last_error: Exception | None = None
        last_code = "BAD_OUTPUT"
        for attempt in range(2):
            try:
                payload = await self._post(url, body)
                parsed = _extract_json_payload(_text_from_gemini(payload))
                return VisionExtraction.model_validate(parsed)
            except httpx.HTTPStatusError as exc:
                status = exc.response.status_code if exc.response is not None else 0
                if status in _NON_RETRYABLE_STATUSES:
                    error = VisionExtractError(
                        f"Gemini API rejected request with HTTP {status}", code="UPSTREAM_REJECTED"
                    )
                    error.http_status = status
                    raise error from exc
                last_error = exc
                last_code = "UPSTREAM_REJECTED" if status == 429 else "UPSTREAM_UNAVAILABLE"
                if attempt == 0:
                    await asyncio.sleep(self.backoff_seconds)
            except (httpx.TimeoutException, httpx.TransportError) as exc:
                last_error = exc
                last_code = "UPSTREAM_UNAVAILABLE"
                if attempt == 0:
                    await asyncio.sleep(self.backoff_seconds)
            except Exception as exc:  # noqa: BLE001 — fail closed after single retry
                last_error = exc
                last_code = "BAD_OUTPUT"
                if attempt == 0:
                    await asyncio.sleep(self.backoff_seconds)
        raise VisionExtractError(str(last_error or "vision extraction failed"), code=last_code) from last_error

    async def _extract_openrouter(self, image_bytes: bytes, mime: str, prompt: str) -> VisionExtraction:
        key = os.environ.get("OPENROUTER_API_KEY", "").strip()
        if not key:
            raise VisionExtractError("OPENROUTER_API_KEY is not set", code="NOT_CONFIGURED")
        data_url = f"data:{mime};base64,{base64.b64encode(image_bytes).decode('ascii')}"
        last_error: Exception | None = None

        async with httpx.AsyncClient(timeout=45.0) as client:
            for model in _openrouter_models():
                try:
                    resp = await client.post(
                        "https://openrouter.ai/api/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {key}",
                            "Content-Type": "application/json",
                            "X-Title": "Nuskha Saathi",
                        },
                        json={
                            "model": model,
                            "temperature": 0.0,
                            "max_tokens": 2048,
                            "reasoning": {"enabled": False},
                            "messages": [
                                {
                                    "role": "user",
                                    "content": [
                                        {"type": "text", "text": prompt},
                                        {"type": "image_url", "image_url": {"url": data_url}},
                                    ],
                                }
                            ],
                        },
                    )
                    resp.raise_for_status()
                    content = _openrouter_message_text(resp.json())
                    if not content:
                        raise VisionExtractError(f"OpenRouter {model} returned empty content")
                    parsed = _extract_json_payload(content)
                    extraction = VisionExtraction.model_validate(parsed)
                    self.active_model = model
                    return extraction
                except Exception as exc:  # noqa: BLE001 — rotate to next fallback model
                    last_error = exc
                    continue
        raise _as_extract_error(last_error or VisionExtractError("OpenRouter vision extraction failed"))

    async def _extract_imgchat(self, image_bytes: bytes, mime: str, prompt: str) -> VisionExtraction:
        base_url = os.getenv("FREEAPI_BASE_URL", "https://freeapi.pro").rstrip("/")
        data_url = f"data:{mime};base64,{base64.b64encode(image_bytes).decode('ascii')}"
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{base_url}/api/imgchat",
                json={"image": data_url, "userPrompt": prompt},
            )
            resp.raise_for_status()
            payload = resp.json()
        if not isinstance(payload, dict) or not payload.get("success") or not payload.get("response"):
            raise VisionExtractError("FreeAPI ImgChat returned no response")
        parsed = _extract_json_payload(str(payload["response"]))
        extraction = VisionExtraction.model_validate(parsed)
        self.active_model = "freeapi-imgchat"
        return extraction

    async def chat_image(
        self,
        image_bytes: bytes,
        mime: str,
        user_prompt: str,
        messages: list[dict] | None = None,
    ) -> dict[str, str]:
        """General vision Q&A / OCR chat using OpenRouter or FreeAPI ImgChat."""
        norm_mime = _normalize_mime(mime)
        data_url = f"data:{norm_mime};base64,{base64.b64encode(image_bytes).decode('ascii')}"
        or_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
        if or_key:
            history_msgs: list[dict] = []
            for item in messages or []:
                role = "assistant" if item.get("type") in {"ai", "assistant"} else "user"
                text = str(item.get("content") or "").strip()
                if text:
                    history_msgs.append({"role": role, "content": text})
            history_msgs.append(
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": user_prompt},
                        {"type": "image_url", "image_url": {"url": data_url}},
                    ],
                }
            )
            async with httpx.AsyncClient(timeout=45.0) as client:
                for model in _openrouter_models():
                    try:
                        resp = await client.post(
                            "https://openrouter.ai/api/v1/chat/completions",
                            headers={
                                "Authorization": f"Bearer {or_key}",
                                "Content-Type": "application/json",
                                "X-Title": "Nuskha Saathi",
                            },
                            json={
                                "model": model,
                                "temperature": 0.2,
                                "max_tokens": 1200,
                                "reasoning": {"enabled": False},
                                "messages": history_msgs,
                            },
                        )
                        resp.raise_for_status()
                        content = _openrouter_message_text(resp.json())
                        if content:
                            return {"provider": "openrouter", "model": model, "response": content}
                    except Exception:
                        continue

        if freeapi_imgchat_enabled():
            base_url = os.getenv("FREEAPI_BASE_URL", "https://freeapi.pro").rstrip("/")
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    f"{base_url}/api/imgchat",
                    json={"image": data_url, "userPrompt": user_prompt, "messages": messages or []},
                )
                resp.raise_for_status()
                payload = resp.json()
                if isinstance(payload, dict) and payload.get("response"):
                    return {"provider": "freeapi_imgchat", "model": "imgchat", "response": str(payload["response"])}

        raise VisionExtractError("No vision chat provider succeeded")

    async def _post(self, url: str, body: dict) -> dict:
        if self.http_post is not None:
            return await self.http_post(url, body)
        # The key travels in a header so it can never appear in a logged URL.
        headers = {"x-goog-api-key": self.api_key or ""}
        async with httpx.AsyncClient(timeout=httpx.Timeout(45.0, connect=10.0)) as client:
            response = await client.post(url, json=body, headers=headers)
            response.raise_for_status()
            return response.json()
