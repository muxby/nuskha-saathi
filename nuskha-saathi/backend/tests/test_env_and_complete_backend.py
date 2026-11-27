"""Tests for .env config loading, Render removal, OpenRouter/FreeAPI providers, and routes."""

from __future__ import annotations

import asyncio
import json
import os
from io import BytesIO
from pathlib import Path

from fastapi.testclient import TestClient
from PIL import Image

from main import create_app
from schemas.vision import ExtractedLine, VisionExtraction
from services.config import cors_origins, env_flag, env_int, load_env_files
from services.formulary_resolver import FormularyResolver
from services.local_store import LocalStore
from services.medster_client import MedSterClient
from services.openfda_client import OpenFdaClient
from services.tts_stt_service import transcribe_urdu
from services.vision_extractor import GeminiVisionExtractor
from services.web_medicine_resolver import WebMedicineResolver


def _jpeg_bytes() -> bytes:
    image = Image.new("RGB", (120, 80), (255, 255, 255))
    buf = BytesIO()
    image.save(buf, format="JPEG")
    return buf.getvalue()


class _MultiLineStripExtractor:
    counts_as_live = False

    def __init__(self, extraction: VisionExtraction):
        self._extraction = extraction

    async def extract(self, image_bytes: bytes, mime: str, mode: str = "parchi") -> VisionExtraction:
        return self._extraction


def test_env_loader_handles_empty_values_comments_quotes_and_precedence(monkeypatch, tmp_path: Path):
    for key in ("GEMINI_API_KEY", "UPLIFT_API_KEY", "PORT", "OPENFDA_LIVE", "CORS_ORIGINS"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setenv("GEMINI_API_KEY", "shell-key-wins")

    root_env = tmp_path / "root.env"
    root_env.write_text(
        "\n".join(
            [
                "# comment line",
                "GEMINI_API_KEY=from-file-ignored",
                "UPLIFT_API_KEY=",
                'export PORT="9001"',
                "OPENFDA_LIVE=false # inline comment",
                "CORS_ORIGINS=http://localhost:3000, https://app.example",
            ]
        ),
        encoding="utf-8",
    )
    backend_env = tmp_path / "backend.env"
    backend_env.write_text(
        "UPLIFT_API_KEY='uplift-from-second-file'\n",
        encoding="utf-8",
    )

    loaded = load_env_files([root_env, backend_env], force=True)
    assert loaded == [root_env, backend_env]
    assert env_int("PORT", 8000) == 9001
    assert env_flag("OPENFDA_LIVE", True) is False
    assert cors_origins() == ["http://localhost:3000", "https://app.example"]
    assert os.environ["GEMINI_API_KEY"] == "shell-key-wins"
    assert os.environ["UPLIFT_API_KEY"] == "uplift-from-second-file"


def test_root_health_and_admin_no_render_references(monkeypatch, tmp_path: Path):
    monkeypatch.setenv("NUSKHA_DB_PATH", str(tmp_path / "custom.db"))
    monkeypatch.setenv("NUSKHA_STATIC_DIR", str(tmp_path / "custom_static"))
    monkeypatch.setenv("OPENFDA_LIVE", "false")
    monkeypatch.setenv("MEDSTER_LIVE", "false")
    monkeypatch.setenv("FREEAPI_IMGCHAT_ENABLED", "false")
    monkeypatch.setenv("FREEAPI_TRANSCRIBE_ENABLED", "false")
    monkeypatch.setenv("ADMIN_MONITOR_PASSWORD", "super-secret-admin-pass-2026")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)

    app = create_app()
    client = TestClient(app)

    root = client.get("/")
    assert root.status_code == 200
    assert root.json()["status"] == "ok"
    assert root.json()["health"] == "/health"

    health = client.get("/health").json()
    caps = health["capabilities"]
    assert caps["vision_configured"] is False
    assert caps["openfda_live"] is False
    assert caps["medster_live"] is False
    assert caps["admin_monitor_configured"] is True
    assert Path(app.state.store.db_path) == tmp_path / "custom.db"
    assert Path(app.state.strip_dir) == tmp_path / "custom_static" / "strips"

    admin_page = client.get("/admin")
    assert admin_page.status_code == 200
    assert "Render" not in admin_page.text
    assert ".env" in admin_page.text

    login_res = client.post(
        "/admin/login",
        data={"password": "super-secret-admin-pass-2026"},
        headers={"Origin": "http://testserver"},
        follow_redirects=False,
    )
    assert login_res.status_code == 303
    status_res = client.get("/admin/api/status")
    assert status_res.status_code == 200
    assert "render_logs" not in status_res.json()


def test_gemini_ignores_thought_parts_and_reads_env_dynamically(monkeypatch):
    seen_urls: list[str] = []

    async def fake_post(url: str, body: dict) -> dict:
        seen_urls.append(url)
        return {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {"thought": True, "text": "internal thinking not json"},
                            {
                                "text": json.dumps(
                                    {
                                        "extracted_lines": [
                                            {
                                                "raw_text": "Tab Panadol 500mg",
                                                "brand_or_salt_guess": "Panadol",
                                                "strength_mg": 500,
                                                "ocr_confidence": 0.94,
                                            }
                                        ],
                                        "image_quality_warning": False,
                                    }
                                )
                            },
                        ]
                    }
                }
            ]
        }

    extractor = GeminiVisionExtractor(http_post=fake_post, backoff_seconds=0)
    monkeypatch.setenv("GEMINI_API_KEY", "dyn-key-123")
    monkeypatch.setenv("GEMINI_MODEL", "gemini-2.5-flash")
    parsed = asyncio.run(extractor.extract(_jpeg_bytes(), "image/jpeg", "parchi"))
    assert parsed.extracted_lines[0].brand_or_salt_guess == "Panadol"
    assert "dyn-key-123" in seen_urls[0]


def test_openrouter_and_freeapi_imgchat_fallback_and_stt(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("UPLIFT_API_KEY", raising=False)
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-or-key")
    monkeypatch.setenv("FREEAPI_IMGCHAT_ENABLED", "true")
    monkeypatch.setenv("FREEAPI_TRANSCRIBE_ENABLED", "true")

    extractor = GeminiVisionExtractor()
    calls: list[str] = []

    async def fail_openrouter(image_bytes: bytes, mime: str, prompt: str):
        calls.append("openrouter")
        raise RuntimeError("rate limited")

    async def ok_imgchat(image_bytes: bytes, mime: str, prompt: str):
        calls.append("imgchat")
        return VisionExtraction(
            extracted_lines=[
                ExtractedLine(
                    raw_text="Tab Augmentin 625mg BD",
                    brand_or_salt_guess="Augmentin",
                    strength_mg=625,
                    morning_qty=1,
                    night_qty=1,
                    ocr_confidence=0.95,
                )
            ]
        )

    monkeypatch.setattr(extractor, "_extract_openrouter", fail_openrouter)
    monkeypatch.setattr(extractor, "_extract_imgchat", ok_imgchat)
    parsed = asyncio.run(extractor.extract(_jpeg_bytes(), "image/jpeg", "parchi"))
    assert calls == ["openrouter", "imgchat"]
    assert parsed.extracted_lines[0].brand_or_salt_guess == "Augmentin"

    async def fake_transcribe_freeapi(audio: bytes, filename: str, mime_type: str, language: str):
        assert filename == "voice.ogg"
        assert language == "ur"
        return "1 haan dawa le li"

    monkeypatch.setattr("services.tts_stt_service._transcribe_freeapi", fake_transcribe_freeapi)
    transcript = asyncio.run(transcribe_urdu(b"OggS-audio", filename="voice.ogg"))
    assert transcript == "1 haan dawa le li"


def test_medster_search_details_and_scan_enrichment(tmp_path: Path):
    async def medster_fetcher(url: str, params: dict):
        if url.endswith("/api/search"):
            return {
                "success": True,
                "results": [
                    {"id": "leflox-500mg-tab", "name": "Leflox (500Mg) Tablets", "price": "Rs. 410.0"}
                ],
            }
        if url.endswith("/api/details"):
            return {
                "success": True,
                "medicine": {
                    "id": "leflox-500mg-tab",
                    "name": "Leflox (500Mg) Tablets",
                    "price": "Rs. 410.0",
                    "details": [
                        {"section": "ingredients", "title": "Ingredients", "content": "LevofloxacinPowered by Froala Editor"},
                        {"section": "dose", "title": "Dosage", "content": "500mg once daily"},
                    ],
                },
            }
        return None

    medster = MedSterClient(live=True, fetcher=medster_fetcher)
    scan_extraction = VisionExtraction(
        extracted_lines=[
            ExtractedLine(
                raw_text="Tab Leflox 500mg OD",
                brand_or_salt_guess="Leflox",
                strength_mg=500,
                morning_qty=1,
                afternoon_qty=0,
                night_qty=0,
                meal_timing="after_food",
                duration_days=5,
                ocr_confidence=0.95,
            )
        ]
    )
    resolver = FormularyResolver.load()
    fda = OpenFdaClient.from_resolver(resolver, live=False)
    app = create_app(
        extractor=_MultiLineStripExtractor(scan_extraction),
        resolver=resolver,
        fda=fda,
        strip_dir=tmp_path / "strips",
        store=LocalStore(tmp_path / "medster.db"),
        medster=medster,
    )
    app.state.audio_dir = tmp_path / "audio"
    client = TestClient(app)

    search_res = client.get("/api/v1/medicines/search", params={"q": "Leflox"})
    assert search_res.status_code == 200
    assert search_res.json()["local_matches"][0]["brand_name"] == "Leflox"
    assert search_res.json()["medster_matches"][0]["price"] == "Rs. 410.0"

    details_res = client.get("/api/v1/medicines/details", params={"brand": "Leflox"})
    assert details_res.status_code == 200
    assert details_res.json()["medster"]["ingredients"] == "Levofloxacin"
    assert details_res.json()["formulary"]["who_aware_tier"] == "WATCH"

    scan_res = client.post(
        "/api/v1/scan-parchi",
        files={"file": ("parchi.jpg", _jpeg_bytes(), "image/jpeg")},
        data={"patient_id": "p-medster-1"},
    )
    assert scan_res.status_code == 200
    med0 = scan_res.json()["medications"][0]
    assert med0["medster_id"] == "leflox-500mg-tab"
    assert med0["medster_price"] == "Rs. 410.0"


def test_strip_verification_updates_saved_scan_and_scan_lookup(tmp_path: Path):
    scan_extraction = VisionExtraction(
        extracted_lines=[
            ExtractedLine(
                raw_text="Tab Leflox 500mg OD",
                brand_or_salt_guess="Leflox",
                strength_mg=500,
                morning_qty=1,
                afternoon_qty=0,
                night_qty=0,
                meal_timing="after_food",
                duration_days=5,
                ocr_confidence=0.95,
            )
        ]
    )
    resolver = FormularyResolver.load()
    fda = OpenFdaClient.from_resolver(resolver, live=False)
    store = LocalStore(tmp_path / "strip_persist.db")
    app = create_app(
        extractor=_MultiLineStripExtractor(scan_extraction),
        resolver=resolver,
        fda=fda,
        strip_dir=tmp_path / "strips",
        store=store,
        medster=MedSterClient(live=False),
    )
    app.state.audio_dir = tmp_path / "audio"
    client = TestClient(app)

    scan_res = client.post(
        "/api/v1/scan-parchi",
        files={"file": ("parchi.jpg", _jpeg_bytes(), "image/jpeg")},
        data={"patient_id": "p-strip-1"},
    )
    assert scan_res.status_code == 200
    scan_id = scan_res.json()["scan_id"]

    app.state.extractor = _MultiLineStripExtractor(
        VisionExtraction(
            extracted_lines=[
                ExtractedLine(
                    raw_text="Pharmaceuticals Pvt Ltd",
                    brand_or_salt_guess="Pharmaceuticals",
                    strength_mg=None,
                    ocr_confidence=0.99,
                ),
                ExtractedLine(
                    raw_text="Tab Leflox 500mg",
                    brand_or_salt_guess="",
                    strength_mg=500,
                    ocr_confidence=0.94,
                ),
            ]
        )
    )
    verify_res = client.post(
        "/api/v1/verify-strip",
        files={"file": ("strip.jpg", _jpeg_bytes(), "image/jpeg")},
        data={
            "scan_id": scan_id,
            "matched_line_id": "med_1",
            "expected_brand": "Leflox",
            "expected_strength_mg": "500",
            "expected_salts": "levofloxacin",
        },
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["verification_status"] == "EXACT_MATCH"

    fetched = client.get(f"/api/v1/scans/{scan_id}")
    assert fetched.status_code == 200
    assert fetched.json()["medications"][0]["strip_verified"] is True
    assert fetched.json()["medications"][0]["strip_thumbnail_url"].startswith("/static/strips/")
    assert client.get("/api/v1/scans/scan_does_not_exist").status_code == 404


def test_tts_stt_vision_chat_and_whatsapp_meta(monkeypatch, tmp_path: Path):
    for var in (
        "UPLIFT_API_KEY",
        "UPLIFT_VOICE_ID",
        "AZURE_SPEECH_KEY",
        "AZURE_SPEECH_REGION",
        "GOOGLE_TTS_API_KEY",
        "GEMINI_API_KEY",
        "OPENROUTER_API_KEY",
    ):
        monkeypatch.delenv(var, raising=False)
    monkeypatch.setenv("FREEAPI_TRANSCRIBE_ENABLED", "false")
    monkeypatch.setenv("FREEAPI_IMGCHAT_ENABLED", "false")

    resolver = FormularyResolver.load()
    fda = OpenFdaClient.from_resolver(resolver, live=False)
    app = create_app(
        extractor=_MultiLineStripExtractor(VisionExtraction(extracted_lines=[])),
        resolver=resolver,
        fda=fda,
        strip_dir=tmp_path / "strips",
        store=LocalStore(tmp_path / "wa.db"),
        medster=MedSterClient(live=False),
    )
    app.state.audio_dir = tmp_path / "audio"
    client = TestClient(app)

    tts_unconfigured = client.post("/api/v1/tts/urdu", json={"text": "Assalam-o-Alaikum"})
    assert tts_unconfigured.status_code == 200
    assert tts_unconfigured.json()["configured"] is False
    assert tts_unconfigured.json()["audio_urdu_url"] is None

    async def fake_tts(text: str) -> bytes:
        return b"mp3-bytes"

    monkeypatch.setattr("routers.scan.synthesize_urdu", fake_tts)
    tts_ok = client.post("/api/v1/tts/urdu", json={"text": "Panadol 500 mg"})
    assert tts_ok.status_code == 200
    assert tts_ok.json()["audio_urdu_url"].startswith("/static/audio/tts_")

    async def fake_stt(audio: bytes, filename: str = "speech.ogg", mime_type: str | None = None, language: str = "ur") -> str:
        return "1 haan dawa jari hai"

    monkeypatch.setattr("routers.scan.transcribe_urdu", fake_stt)
    stt_ok = client.post(
        "/api/v1/stt/urdu",
        files={"file": ("voice.ogg", b"OggS-fake-audio", "audio/ogg")},
        data={"language": "ur"},
    )
    assert stt_ok.status_code == 200
    assert stt_ok.json()["text"] == "1 haan dawa jari hai"

    async def fake_chat(image_bytes: bytes, mime: str, user_prompt: str, messages=None):
        return {"provider": "openrouter", "model": "nvidia/nemotron-3.5-super-vl:free", "response": "Panadol 500mg"}

    app.state.extractor = GeminiVisionExtractor()
    monkeypatch.setattr(app.state.extractor, "chat_image", fake_chat)
    chat_res = client.post(
        "/api/v1/vision/chat",
        files={"file": ("img.jpg", _jpeg_bytes(), "image/jpeg")},
        data={"user_prompt": "What medicine is this?"},
    )
    assert chat_res.status_code == 200
    assert chat_res.json()["provider"] == "openrouter"
    assert chat_res.json()["response"] == "Panadol 500mg"

    rem = client.post(
        "/api/v1/whatsapp/send-reminder",
        json={"patient_id": "p-meta-1", "brand_name": "Augmentin", "phone_e164": "03001234567"},
    )
    assert rem.status_code == 200

    meta_webhook = client.post(
        "/api/v1/whatsapp/webhook",
        json={
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "messages": [
                                    {
                                        "from": "923001234567",
                                        "type": "text",
                                        "text": {"body": "2 rash ho gaya"},
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        },
    )
    assert meta_webhook.status_code == 200
    assert meta_webhook.json()["classification"] == "STOPPED_OR_SIDE_EFFECT"
    assert meta_webhook.json()["matched_reminder"]["id"] == rem.json()["reminder_id"]

    rem_list = client.get("/api/v1/whatsapp/reminders", params={"patient_id": "p-meta-1"})
    assert rem_list.status_code == 200
    assert len(rem_list.json()["reminders"]) == 1
    assert rem_list.json()["reminders"][0]["status"] == "STOPPED_OR_SIDE_EFFECT"


def test_vision_schema_parses_single_unit_strings_and_rejects_ranges():
    clean = ExtractedLine(
        raw_text="Tab Panadol 500mg",
        brand_or_salt_guess="Panadol",
        strength_mg="500 mg",
        morning_qty="1 tab",
        afternoon_qty=0,
        night_qty="1",
        duration_days="5 days",
        ocr_confidence=0.92,
    )
    assert clean.strength_mg == 500.0
    assert clean.morning_qty == 1.0
    assert clean.night_qty == 1.0
    assert clean.duration_days == 5

    ambiguous = ExtractedLine(
        raw_text="Tab Brufen 400-600mg",
        brand_or_salt_guess="Brufen",
        strength_mg="400-600mg",
        morning_qty="1-2 tabs",
        ocr_confidence=0.92,
    )
    assert ambiguous.strength_mg is None
    assert ambiguous.morning_qty is None


def test_env_loader_override_external_preserves_empty_keys(monkeypatch, tmp_path: Path):
    monkeypatch.setenv("GEMINI_API_KEY", "stale-shell-key")
    monkeypatch.setenv("OPENROUTER_API_KEY", "shell-openrouter-key")
    env_file = tmp_path / ".env"
    env_file.write_text(
        "GEMINI_API_KEY=fresh-env-key\nOPENROUTER_API_KEY=\n",
        encoding="utf-8",
    )

    load_env_files([env_file], force=True, override_external=True)
    assert os.environ["GEMINI_API_KEY"] == "fresh-env-key"
    assert os.environ["OPENROUTER_API_KEY"] == "shell-openrouter-key"


def test_non_medication_lines_filtered_and_single_strength_verified(monkeypatch, tmp_path: Path):
    monkeypatch.setenv("NUSKHA_DB_PATH", str(tmp_path / "filter.db"))
    monkeypatch.setenv("NUSKHA_STATIC_DIR", str(tmp_path / "filter_static"))
    monkeypatch.setenv("OPENFDA_LIVE", "false")
    monkeypatch.setenv("MEDSTER_LIVE", "false")
    monkeypatch.setenv("FREEAPI_IMGCHAT_ENABLED", "false")

    class _NoisyExtractor:
        counts_as_live = False

        async def extract(self, image_bytes: bytes, mime: str, mode: str = "parchi") -> VisionExtraction:
            return VisionExtraction(
                extracted_lines=[
                    ExtractedLine(raw_text="Name Karuna chamlon Sex F Age 36", brand_or_salt_guess="Karuna", ocr_confidence=0.92),
                    ExtractedLine(raw_text="B.P: 130/90", brand_or_salt_guess="BP", ocr_confidence=0.95),
                    ExtractedLine(raw_text="SP02: 98%", brand_or_salt_guess="SpO2", ocr_confidence=0.95),
                    ExtractedLine(raw_text="- Diet", brand_or_salt_guess="Diet", ocr_confidence=0.95),
                    ExtractedLine(raw_text="- walk/oxorgize", brand_or_salt_guess="walk", ocr_confidence=0.95),
                    ExtractedLine(raw_text="Amity/Gantric", brand_or_salt_guess="Amity/Gantric", ocr_confidence=0.90),
                    ExtractedLine(raw_text="Rx", brand_or_salt_guess="Rx", ocr_confidence=0.98),
                    ExtractedLine(raw_text="Cap. Razo 1OD AC", brand_or_salt_guess="Razo", dosage_form="capsule", morning_qty=1, afternoon_qty=0, night_qty=0, meal_timing="before_food", ocr_confidence=0.94),
                    ExtractedLine(raw_text="T. Placida 1OD", brand_or_salt_guess="Placida", dosage_form="tablet", morning_qty=1, afternoon_qty=0, night_qty=0, ocr_confidence=0.93),
                    ExtractedLine(raw_text="T. Petril 1OD HS", brand_or_salt_guess="Petril", dosage_form="tablet", morning_qty=0, afternoon_qty=0, night_qty=1, ocr_confidence=0.93),
                    ExtractedLine(raw_text="Syp ???", brand_or_salt_guess="???", ocr_confidence=0.40),
                    ExtractedLine(raw_text="Tab Zyloxitron 500mg", brand_or_salt_guess="Zyloxitron", strength_mg=500, morning_qty=1, ocr_confidence=0.95),
                    ExtractedLine(raw_text="Follow for 1Modt", brand_or_salt_guess="Follow", ocr_confidence=0.95),
                ]
            )

    app = create_app(
        extractor=_NoisyExtractor(),
        fda=OpenFdaClient.from_resolver(FormularyResolver.load(), live=False),
        medster=MedSterClient(live=False),
    )
    client = TestClient(app)
    res = client.post(
        "/api/v1/scan-parchi",
        files={"file": ("parchi.jpg", _jpeg_bytes(), "image/jpeg")},
        data={"patient_id": "p-filter-1"},
    )
    assert res.status_code == 200
    meds = res.json()["medications"]
    raw_texts = [m["raw_text"] for m in meds]
    assert raw_texts == [
        "Cap. Razo 1OD AC",
        "T. Placida 1OD",
        "T. Petril 1OD HS",
        "Syp ???",
        "Tab Zyloxitron 500mg",
    ]
    by_raw = {m["raw_text"]: m for m in meds}
    assert by_raw["Cap. Razo 1OD AC"]["status"] == "VERIFIED"
    assert by_raw["Cap. Razo 1OD AC"]["generic_salts"] == ["rabeprazole"]
    assert by_raw["T. Placida 1OD"]["status"] == "VERIFIED"
    assert by_raw["T. Placida 1OD"]["generic_salts"] == ["flupentixol", "melitracen"]
    # Multi-strength clonazepam without written mg still refuses for strength confirmation.
    assert by_raw["T. Petril 1OD HS"]["status"] == "REFUSED_DOSAGE_ANOMALY"
    assert by_raw["Syp ???"]["status"] == "REFUSED_BLURRY"
    assert by_raw["Tab Zyloxitron 500mg"]["status"] == "REFUSED_UNKNOWN_DRUG"


def test_openrouter_disables_reasoning_and_handles_reasoning_fallback(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-or-key")
    monkeypatch.setenv("OPENROUTER_MODEL", "nvidia/nemotron-3.5-super-vl:free")
    monkeypatch.setenv("OPENROUTER_FALLBACK_MODELS", "google/gemma-4-31b-it:free")
    seen_payloads: list[dict] = []

    class _FakeResp:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "choices": [
                    {
                        "message": {
                            "content": "",
                            "reasoning": '{"extracted_lines": [{"raw_text": "Cap. Razo 1OD AC", "brand_or_salt_guess": "Razo", "strength_mg": null, "dosage_form": "capsule", "morning_qty": 1, "afternoon_qty": 0, "night_qty": 0, "meal_timing": "before_food", "ocr_confidence": 0.94}], "image_quality_warning": false}',
                        }
                    }
                ]
            }

    async def fake_post(self, url, **kwargs):
        seen_payloads.append(kwargs["json"])
        return _FakeResp()

    monkeypatch.setattr("services.vision_extractor.httpx.AsyncClient.post", fake_post)
    parsed = asyncio.run(GeminiVisionExtractor()._extract_openrouter(_jpeg_bytes(), "image/jpeg", "prompt"))
    assert seen_payloads[0]["reasoning"] == {"enabled": False}
    assert seen_payloads[0]["max_tokens"] == 2048
    assert parsed.extracted_lines[0].brand_or_salt_guess == "Razo"


def test_web_medicine_resolver_verifies_combo_and_topical_while_keeping_safety_locks(monkeypatch, tmp_path: Path):
    monkeypatch.setenv("NUSKHA_DB_PATH", str(tmp_path / "webmed.db"))
    monkeypatch.setenv("NUSKHA_STATIC_DIR", str(tmp_path / "webmed_static"))
    monkeypatch.setenv("OPENFDA_LIVE", "false")
    monkeypatch.setenv("MEDSTER_LIVE", "false")

    async def fake_web_fetcher(queries: list[str]) -> list[dict]:
        assert any("Enzoflam" in q for q in queries)
        assert any("Pan D" in q for q in queries)
        assert any("Hexigel" in q for q in queries)
        return [
            {
                "query": "Tab. Enzoflam",
                "is_known_medicine": True,
                "canonical_brand": "Enzoflam",
                "generic_salts": ["Diclofenac", "Paracetamol", "Serratiopeptidase"],
                "dosage_form": "Tablet",
                "is_topical": False,
                "is_fixed_single_strength_combo": True,
                "common_strengths_mg": [50, 325, 15],
                "max_single_dose_mg": 100,
                "max_daily_dose_mg": 150,
                "is_antibiotic": False,
                "who_aware_tier": "NONE",
            },
            {
                "query": "Tab. Pan D 40mg",
                "is_known_medicine": True,
                "canonical_brand": "Pan-D",
                "generic_salts": ["Pantoprazole", "Domperidone"],
                "dosage_form": "Capsule",
                "is_topical": False,
                "is_fixed_single_strength_combo": True,
                "common_strengths_mg": [40],
                "max_single_dose_mg": 40,
                "max_daily_dose_mg": 80,
                "is_antibiotic": False,
                "who_aware_tier": "NONE",
            },
            {
                "query": "Adv: Hexigel gum paint",
                "is_known_medicine": True,
                "canonical_brand": "Hexigel Gum Paint",
                "generic_salts": ["Chlorhexidine Gluconate"],
                "dosage_form": "Gum Paint Gel",
                "is_topical": True,
                "common_strengths_mg": [],
                "max_single_dose_mg": 1,
                "max_daily_dose_mg": 1,
                "is_antibiotic": False,
                "who_aware_tier": "NONE",
            },
            {
                "query": "Tab Zyloxitron-X",
                "is_known_medicine": False,
            },
        ]

    web_resolver = WebMedicineResolver(live=True, fetcher=fake_web_fetcher)

    class _DentalExtractor:
        counts_as_live = False

        async def extract(self, image_bytes: bytes, mime: str, mode: str = "parchi") -> VisionExtraction:
            return VisionExtraction(
                extracted_lines=[
                    ExtractedLine(raw_text="Tab. Augmentin 625mg", brand_or_salt_guess="Augmentin", strength_mg=625, morning_qty=1, afternoon_qty=0, night_qty=1, meal_timing="after_food", duration_days=5, ocr_confidence=0.96),
                    ExtractedLine(raw_text="Tab. Enzoflam", brand_or_salt_guess="Enzoflam", morning_qty=1, afternoon_qty=0, night_qty=1, meal_timing="after_food", duration_days=5, ocr_confidence=0.95),
                    ExtractedLine(raw_text="Tab. Pan D 40mg", brand_or_salt_guess="Pan D", strength_mg=40, morning_qty=1, afternoon_qty=0, night_qty=0, meal_timing="before_food", duration_days=5, ocr_confidence=0.95),
                    ExtractedLine(raw_text="Adv: Hexigel gum paint", brand_or_salt_guess="Hexigel gum paint", morning_qty=1, afternoon_qty=0, night_qty=1, duration_days=7, ocr_confidence=0.93),
                    ExtractedLine(raw_text="Tab Zyloxitron-X", brand_or_salt_guess="Zyloxitron-X", ocr_confidence=0.94),
                ]
            )

    app = create_app(
        extractor=_DentalExtractor(),
        fda=OpenFdaClient.from_resolver(FormularyResolver.load(), live=False),
        medster=MedSterClient(live=False),
        web_resolver=web_resolver,
    )
    client = TestClient(app)
    res = client.post(
        "/api/v1/scan-parchi",
        files={"file": ("dental.jpg", _jpeg_bytes(), "image/jpeg")},
        data={"patient_id": "p-web-1"},
    )
    assert res.status_code == 200
    meds = {m["raw_text"]: m for m in res.json()["medications"]}
    assert meds["Tab. Augmentin 625mg"]["status"] == "VERIFIED"
    assert meds["Tab. Enzoflam"]["status"] == "VERIFIED"
    assert meds["Tab. Enzoflam"]["generic_salts"] == ["diclofenac", "acetaminophen", "serratiopeptidase"]
    assert meds["Tab. Pan D 40mg"]["status"] == "VERIFIED"
    assert meds["Tab. Pan D 40mg"]["generic_salts"] == ["pantoprazole", "domperidone"]
    assert meds["Adv: Hexigel gum paint"]["status"] == "VERIFIED"
    assert meds["Adv: Hexigel gum paint"]["generic_salts"] == ["chlorhexidine gluconate"]
    # Real gibberish returned by web lookup as non-medicine stays refused.
    assert meds["Tab Zyloxitron-X"]["status"] == "REFUSED_UNKNOWN_DRUG"

    details = client.get("/api/v1/medicines/details", params={"brand": "Pan-D"})
    assert details.status_code == 200
    assert details.json()["formulary"]["generic_salts"] == ["pantoprazole", "domperidone"]


def test_web_medicine_sqlite_cache_and_reminder_crud(monkeypatch, tmp_path: Path):
    store = LocalStore(tmp_path / "persist.db")
    calls = 0

    async def counting_fetcher(queries: list[str]) -> list[dict]:
        nonlocal calls
        calls += 1
        return [
            {
                "query": "Betnovate 0.1% cream",
                "is_known_medicine": True,
                "canonical_brand": "Betnovate",
                "generic_salts": ["Betamethasone"],
                "dosage_form": "Cream",
                "is_topical": True,
            }
        ]

    first = WebMedicineResolver(live=True, fetcher=counting_fetcher, store=store)
    hit1 = asyncio.run(
        first.resolve_lines(
            [
                ExtractedLine(
                    raw_text="Betnovate 0.1% cream BD",
                    brand_or_salt_guess="Betnovate",
                    strength_mg=0.1,
                    morning_qty=1,
                    night_qty=1,
                    ocr_confidence=0.95,
                )
            ]
        )
    )
    assert calls == 1
    assert hit1[0].is_topical is True

    # Fresh resolver instance loads from SQLite cache without calling remote fetcher.
    async def fail_if_called(queries: list[str]) -> list[dict]:
        raise AssertionError("Should have hit SQLite web cache")

    second = WebMedicineResolver(live=True, fetcher=fail_if_called, store=store)
    cached = second.get_cached("Betnovate")
    assert cached is not None
    assert cached.is_topical is True

    app = create_app(
        store=store,
        medster=MedSterClient(live=False),
        web_resolver=second,
        fda=OpenFdaClient.from_resolver(FormularyResolver.load(), live=False),
    )
    client = TestClient(app)
    rem = client.post(
        "/api/v1/whatsapp/send-reminder",
        json={
            "patient_id": "p-rem-9",
            "brand_name": "Enzoflam",
            "phone_e164": "03001234567",
            "reminder_type": "daily_dose",
            "preferred_time": "21:00",
            "language": "ur",
        },
    )
    assert rem.status_code == 200
    body = rem.json()
    assert body["preferred_time"] == "21:00"
    assert body["language"] == "ur"
    rem_id = body["reminder_id"]

    listed = client.get("/api/v1/whatsapp/reminders", params={"patient_id": "p-rem-9"})
    assert listed.status_code == 200
    assert listed.json()["reminders"][0]["preferred_time"] == "21:00"

    patched = client.patch(
        f"/api/v1/whatsapp/reminders/{rem_id}",
        params={"patient_id": "p-rem-9"},
        json={"status": "TAKEN", "adherence_reply": "Dose taken"},
    )
    assert patched.status_code == 200
    assert patched.json()["reminder"]["status"] == "TAKEN"

    # Strip verification without expected_strength_mg works cleanly for cached topical/fixed meds
    class _HexigelStripExtractor:
        counts_as_live = False

        async def extract(self, image_bytes: bytes, mime: str, mode: str = "strip") -> VisionExtraction:
            return VisionExtraction(
                extracted_lines=[
                    ExtractedLine(
                        raw_text="Hexigel Gum Paint Gel",
                        brand_or_salt_guess="Hexigel",
                        strength_mg=None,
                        ocr_confidence=0.95,
                    )
                ]
            )

    second.get_cached("Betnovate")
    second._cache_store("Hexigel", hit1[0])  # topical entry
    app.state.extractor = _HexigelStripExtractor()
    verify_topical = client.post(
        "/api/v1/verify-strip",
        files={"file": ("tube.jpg", _jpeg_bytes(), "image/jpeg")},
        data={
            "scan_id": "scan_0123456789abcdef01234567",
            "matched_line_id": "med_4",
            "expected_brand": "Betnovate",
            "expected_salts": "betamethasone",
        },
    )
    assert verify_topical.status_code == 200
    assert verify_topical.json()["verification_status"] == "EXACT_MATCH"

    deleted = client.delete(f"/api/v1/whatsapp/reminders/{rem_id}", params={"patient_id": "p-rem-9"})
    assert deleted.status_code == 200
    assert deleted.json()["deleted"] is True
    assert client.get("/api/v1/whatsapp/reminders", params={"patient_id": "p-rem-9"}).json()["reminders"] == []
