"""Comprehensive tests for clinical edge cases, uploads, persistence, demo cases, and WhatsApp routes."""

from __future__ import annotations

import asyncio
import base64
import json
from io import BytesIO
from pathlib import Path

import httpx
from fastapi.testclient import TestClient
from PIL import Image

from main import create_app
from schemas.vision import ExtractedLine, VisionExtraction
from services.formulary_resolver import FormularyResolver
from services.image_ops import crop_bbox_jpeg_b64, safe_slug, validate_image_bytes
from services.local_store import LocalStore
from services.openfda_client import OpenFdaClient
from services.safety_gate import evaluate_line
from services.strip_verifier import compare_strip
from services.tts_stt_service import synthesize_urdu, to_opus_ogg, tts_configured
from services.vision_extractor import GeminiVisionExtractor, VisionExtractError


def _jpeg_bytes(size=(160, 80), color=(255, 255, 255), exif_orientation: int | None = None) -> bytes:
    image = Image.new("RGB", size, color)
    if size[1] >= 40:
        for x in range(size[0]):
            for y in range(size[1] // 2):
                image.putpixel((x, y), (200, 30, 30))
    buf = BytesIO()
    if exif_orientation is not None:
        exif = image.getexif()
        exif[0x0112] = exif_orientation
        image.save(buf, format="JPEG", exif=exif.tobytes())
    else:
        image.save(buf, format="JPEG")
    return buf.getvalue()


class _ScriptedExtractor:
    counts_as_live = False

    def __init__(self, result: VisionExtraction | None = None, error: Exception | None = None):
        self.result = result
        self.error = error

    async def extract(self, image_bytes: bytes, mime: str, mode: str = "parchi") -> VisionExtraction:
        if self.error:
            raise self.error
        assert self.result is not None
        return self.result


def _isolated_app(tmp_path: Path, extractor=None):
    resolver = FormularyResolver.load()
    fda = OpenFdaClient.from_resolver(resolver, live=False)
    store = LocalStore(tmp_path / "test_nuskha.db")
    app = create_app(
        extractor=extractor or _ScriptedExtractor(VisionExtraction(extracted_lines=[])),
        resolver=resolver,
        fda=fda,
        strip_dir=tmp_path / "strips",
        store=store,
    )
    app.state.audio_dir = tmp_path / "audio"
    app.state.audio_dir.mkdir(parents=True, exist_ok=True)
    return app


def test_nan_inf_and_zero_duration_sanitization():
    resolver = FormularyResolver.load()
    nan_line = ExtractedLine(
        raw_text="Tab Panadol 500mg",
        brand_or_salt_guess="Panadol",
        strength_mg=float("nan"),
        morning_qty=float("inf"),
        afternoon_qty=-2,
        night_qty=1,
        meal_timing="after food",
        duration_days=0,
        ocr_confidence=float("nan"),
        bbox_1000=[-50, 950, 1200, 100],
    )
    assert nan_line.ocr_confidence == 0.0
    assert nan_line.strength_mg is None
    assert nan_line.morning_qty is None
    assert nan_line.afternoon_qty == 0.0
    assert nan_line.duration_days is None
    assert nan_line.bbox_1000 == [0.0, 950.0, 1000.0, 100.0]

    decision = evaluate_line(nan_line, resolver)
    assert decision.status == "VERIFIED" or decision.status == "REFUSED_BLURRY"
    # ocr_confidence was NaN -> coerced to 0.0 -> MUST refuse as blurry!
    assert decision.status == "REFUSED_BLURRY"


def test_dose_token_stripping_and_raw_text_fallback():
    resolver = FormularyResolver.load()
    assert resolver.resolve("Leflox 500mg") is not None
    assert resolver.resolve("Leflox 500mg").entry.brand_name == "Leflox"
    assert resolver.resolve("Cap Risek 40mg OD ac") is not None
    assert resolver.resolve("Cap Risek 40mg OD ac").entry.brand_name == "Risek"
    assert resolver.resolve("Tab Brufen 400mg 1+0+1 x5d") is not None
    assert resolver.resolve("Tab Brufen 400mg 1+0+1 x5d").entry.brand_name == "Brufen"

    line = ExtractedLine(
        raw_text="Tab Panadol 500mg BD pc",
        brand_or_salt_guess="",
        strength_mg=500,
        morning_qty=1,
        afternoon_qty=0,
        night_qty=1,
        meal_timing="pc",
        duration_days=3,
        ocr_confidence=0.95,
    )
    decision = evaluate_line(line, resolver)
    assert decision.status == "VERIFIED"
    assert decision.resolved is not None
    assert decision.resolved.entry.brand_name == "Panadol"
    assert decision.meal_timing == "after_food"


def test_exif_rotated_crop_and_path_slug_and_inverted_bbox():
    # Create portrait-after-EXIF-rotation image: stored 80x160 rotated 90 deg CW -> visual top is red.
    raw = Image.new("RGB", (80, 160), (255, 255, 255))
    # Rotate 90 deg CCW -> left half in raw becomes visual top when EXIF orientation 6 (rotate 90 CW) applies.
    for x in range(40):
        for y in range(160):
            raw.putpixel((x, y), (220, 20, 20))
    exif = raw.getexif()
    exif[0x0112] = 6
    buf = BytesIO()
    raw.save(buf, format="JPEG", exif=exif.tobytes())
    rotated_bytes = buf.getvalue()

    assert validate_image_bytes(rotated_bytes) is True
    assert validate_image_bytes(b"not-an-image") is False

    # Inverted bounds [500, 1000, 0, 0] should normalize cleanly and crop visual top half.
    b64 = crop_bbox_jpeg_b64(rotated_bytes, [450, 1000, 0, 0])
    assert b64 is not None and b64.startswith("data:image/jpeg;base64,")
    cropped = Image.open(BytesIO(base64.b64decode(b64.split(",", 1)[1])))
    r, g, b = cropped.getpixel((cropped.width // 2, cropped.height // 2))
    assert r > 150 and g < 80 and b < 80

    assert safe_slug("../../etc/passwd") == "etc_passwd"
    assert "/" not in safe_slug("../a/b")


def test_strip_verifier_unreadable_without_strength_and_verify_route_audio(monkeypatch, tmp_path):
    resolver = FormularyResolver.load()
    verdict = compare_strip(
        expected_brand="Leflox",
        expected_salts=["levofloxacin"],
        expected_strength=500,
        detected_brand="Leflox",
        detected_salts=["levofloxacin"],
        detected_strength=None,
        detected_confidence=0.95,
        resolver=resolver,
    )
    assert verdict.status == "UNREADABLE_STRIP"

    nan_verdict = compare_strip(
        expected_brand="Leflox",
        expected_salts=["levofloxacin"],
        expected_strength=500,
        detected_brand="Leflox",
        detected_salts=["levofloxacin"],
        detected_strength=500,
        detected_confidence=float("nan"),
        resolver=resolver,
    )
    assert nan_verdict.status == "UNREADABLE_STRIP"

    async def fake_tts(text: str) -> bytes | None:
        return b"mock-strip-mp3"

    monkeypatch.setattr("routers.scan.synthesize_urdu", fake_tts)
    extraction = VisionExtraction(
        extracted_lines=[
            ExtractedLine(
                raw_text="Leflox 500",
                brand_or_salt_guess="Leflox",
                strength_mg=500,
                ocr_confidence=0.97,
            )
        ]
    )
    app = _isolated_app(tmp_path, _ScriptedExtractor(extraction))
    client = TestClient(app)

    res = client.post(
        "/api/v1/verify-strip",
        files={"file": ("strip.jpg", _jpeg_bytes(), "image/jpeg")},
        data={
            "scan_id": "../../scan_01",
            "matched_line_id": "med/1",
            "expected_brand": "Leflox",
            "expected_strength_mg": "500",
            "expected_salts": "levofloxacin",
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["verification_status"] == "EXACT_MATCH"
    assert body["audio_urdu_url"].startswith("/static/audio/verify_")
    thumb_name = body["strip_thumbnail_url"].rsplit("/", 1)[-1]
    assert (tmp_path / "strips" / thumb_name).is_file()

    bad = client.post(
        "/api/v1/verify-strip",
        files={"file": ("strip.jpg", _jpeg_bytes(), "image/jpeg")},
        data={
            "scan_id": "scan_1",
            "matched_line_id": "med_1",
            "expected_brand": "Leflox",
            "expected_strength_mg": "-10",
        },
    )
    assert bad.status_code == 400
    assert bad.json()["error"] == "HTTP_400"


def test_upload_mime_size_corrupt_and_validation_errors(tmp_path):
    app = _isolated_app(
        tmp_path,
        _ScriptedExtractor(
            VisionExtraction(
                extracted_lines=[
                    ExtractedLine(
                        raw_text="Tab Panadol 500mg",
                        brand_or_salt_guess="Panadol",
                        strength_mg=500,
                        morning_qty=1,
                        ocr_confidence=0.95,
                    )
                ]
            )
        ),
    )
    client = TestClient(app)

    pdf_res = client.post(
        "/api/v1/scan-parchi",
        files={"file": ("parchi.pdf", b"%PDF-1.4...", "application/pdf")},
    )
    assert pdf_res.status_code == 415
    assert pdf_res.json()["error"] == "HTTP_415"
    assert "urdu_message" in pdf_res.json()

    svg_res = client.post(
        "/api/v1/scan-parchi",
        files={"file": ("parchi.svg", b"<svg></svg>", "image/svg+xml")},
    )
    assert svg_res.status_code == 415

    huge_res = client.post(
        "/api/v1/scan-parchi",
        files={"file": ("huge.jpg", b"a" * (8 * 1024 * 1024 + 5), "image/jpeg")},
    )
    assert huge_res.status_code == 413
    assert huge_res.json()["error"] == "HTTP_413"

    corrupt_res = client.post(
        "/api/v1/scan-parchi",
        files={"file": ("corrupt.jpg", b"not-valid-jpeg-bytes", "image/jpeg")},
    )
    assert corrupt_res.status_code == 200
    assert corrupt_res.json()["overall_status"] == "REFUSED"
    assert corrupt_res.json()["medications"][0]["status"] == "REFUSED_BLURRY"

    missing_field = client.post("/api/v1/cabinet/test-p", json={})
    assert missing_field.status_code == 422
    assert missing_field.json()["error"] == "VALIDATION_ERROR"


def test_openfda_synonyms_concurrency_and_vision_failfast(monkeypatch, tmp_path):
    calls: list[str] = []

    async def fetcher(url: str):
        calls.append(url)
        if "sildenafil" in url:
            return {
                "results": [
                    {
                        "contraindications": [
                            "Administration of sildenafil to patients who are using organic nitrates in any form is contraindicated."
                        ]
                    }
                ]
            }
        return {"results": []}

    resolver = FormularyResolver.load()
    fda = OpenFdaClient.from_resolver(resolver, fetcher=fetcher, live=True)
    hits = asyncio.run(
        fda.check_medications(
            current=[{"brand_name": "Viagra", "generic_salts": ["sildenafil"], "source_label": "current parchi"}],
            cabinet=[{"brand_name": "Ismo", "generic_salts": ["isosorbide mononitrate"], "source_label": "Heart Clinic"}],
        )
    )
    assert len(hits) == 1
    assert hits[0].source == "openFDA Drug Label API"
    assert "organic nitrates" in hits[0].fda_verbatim_excerpt

    # Vision extractor: image/jpg normalized -> image/jpeg, list JSON wrapped, HTTP 401 fails fast on attempt 1
    attempts = {"count": 0}

    async def http_list(url: str, body: dict):
        attempts["count"] += 1
        assert body["contents"][0]["parts"][1]["inline_data"]["mime_type"] == "image/jpeg"
        return {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {
                                "text": json.dumps(
                                    [
                                        {
                                            "raw_text": "Tab Panadol 500",
                                            "brand_or_salt_guess": "Panadol",
                                            "strength_mg": 500,
                                            "ocr_confidence": 0.92,
                                        }
                                    ]
                                )
                            }
                        ]
                    }
                }
            ]
        }

    ext = GeminiVisionExtractor(api_key="k", http_post=http_list, backoff_seconds=0)
    out = asyncio.run(ext.extract(_jpeg_bytes(), "image/jpg"))
    assert len(out.extracted_lines) == 1
    assert attempts["count"] == 1

    fail_calls = {"n": 0}

    async def http_401(url: str, body: dict):
        fail_calls["n"] += 1
        req = httpx.Request("POST", url)
        resp = httpx.Response(401, request=req)
        raise httpx.HTTPStatusError("unauthorized", request=req, response=resp)

    ext_auth = GeminiVisionExtractor(api_key="bad", http_post=http_401, backoff_seconds=0)
    try:
        asyncio.run(ext_auth.extract(_jpeg_bytes(), "image/jpeg"))
        raised = False
    except VisionExtractError:
        raised = True
    assert raised and fail_calls["n"] == 1

    # TTS & ffmpeg guards
    for var in ("UPLIFT_API_KEY", "UPLIFT_VOICE_ID", "AZURE_SPEECH_KEY", "AZURE_SPEECH_REGION", "GOOGLE_TTS_API_KEY"):
        monkeypatch.delenv(var, raising=False)
    assert tts_configured() is False
    assert asyncio.run(synthesize_urdu("Assalam o Alaikum")) is None

    monkeypatch.setattr("services.tts_stt_service.shutil.which", lambda _name: None)
    try:
        to_opus_ogg(tmp_path / "a.mp3", tmp_path / "b.ogg")
        ffmpeg_missing = False
    except RuntimeError:
        ffmpeg_missing = True
    assert ffmpeg_missing


def test_cabinet_crud_cross_doctor_automerge_and_demo_cases(tmp_path):
    extraction = VisionExtraction(
        extracted_lines=[
            ExtractedLine(
                raw_text="Tab Brufen 400mg BD",
                brand_or_salt_guess="Brufen",
                strength_mg=400,
                morning_qty=1,
                night_qty=1,
                meal_timing="after_food",
                duration_days=5,
                ocr_confidence=0.95,
            )
        ]
    )
    app = _isolated_app(tmp_path, _ScriptedExtractor(extraction))
    client = TestClient(app)

    add_res = client.post(
        "/api/v1/cabinet/patient-42",
        json={"brand_name": "Marevan", "strength_mg": 5, "source_label": "Cardiology Clinic"},
    )
    assert add_res.status_code == 201
    item = add_res.json()["item"]
    assert item["generic_salts"] == ["warfarin"]

    # Scan WITHOUT passing active_cabinet inline -> should pull persisted Marevan from SQLite!
    scan_res = client.post(
        "/api/v1/scan-parchi",
        files={"file": ("parchi.jpg", _jpeg_bytes(), "image/jpeg")},
        data={"patient_id": "patient-42", "active_cabinet": "[]"},
    )
    assert scan_res.status_code == 200
    scan_body = scan_res.json()
    assert scan_body["overall_status"] == "ACTION_REQUIRED"
    assert len(scan_body["interactions"]) == 1
    assert scan_body["medications"][0]["raw_text"] == "Tab Brufen 400mg BD"
    assert scan_body["medications"][0]["ocr_confidence"] == 0.95

    history = client.get("/api/v1/patients/patient-42/scans")
    assert history.status_code == 200
    assert history.json()["scans"][0]["scan_id"] == scan_body["scan_id"]

    del_res = client.delete(f"/api/v1/cabinet/patient-42/{item['id']}")
    assert del_res.status_code == 200
    assert del_res.json()["deleted"] is True
    assert client.delete(f"/api/v1/cabinet/patient-42/{item['id']}").status_code == 404

    # All 5 offline demo cases run deterministically through safety gate & return valid ScanResponse
    index = client.get("/api/v1/demo-cases")
    assert index.status_code == 200
    cases = index.json()["cases"]
    assert len(cases) == 5

    by_case = {}
    for entry in cases:
        run_res = client.post(f"/api/v1/demo-cases/{entry['case_id']}")
        assert run_res.status_code == 200
        by_case[entry["case_id"]] = run_res.json()

    assert by_case["case-01-zubaida-warfarin"]["overall_status"] == "ACTION_REQUIRED"
    assert any(m["status"] == "REFUSED_BLURRY" and m["cropped_handwriting_b64"] for m in by_case["case-01-zubaida-warfarin"]["medications"])
    assert by_case["case-02-tariq-nitrate-sildenafil"]["interactions"][0]["severity"] == "HIGH"
    assert any(m["status"] == "REFUSED_DOSAGE_ANOMALY" for m in by_case["case-03-leflox-overdose"]["medications"])
    assert any(m["status"] == "REFUSED_UNKNOWN_DRUG" for m in by_case["case-04-unknown-mystery-brand"]["medications"])
    assert by_case["case-05-augmntin-all-clear"]["overall_status"] == "VERIFIED"
    assert client.post("/api/v1/demo-cases/does-not-exist").status_code == 404


def test_whatsapp_honest_unconfigured_and_webhook_classification(monkeypatch, tmp_path):
    for var in ("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_WHATSAPP_FROM", "WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"):
        monkeypatch.delenv(var, raising=False)

    app = _isolated_app(tmp_path)
    client = TestClient(app)

    bad_phone = client.post(
        "/api/v1/whatsapp/send-reminder",
        json={"patient_id": "p-1", "brand_name": "Augmentin", "phone_e164": "12345"},
    )
    assert bad_phone.status_code == 400

    rem = client.post(
        "/api/v1/whatsapp/send-reminder",
        json={"patient_id": "p-1", "brand_name": "Augmentin", "phone_e164": "03001234567"},
    )
    assert rem.status_code == 200
    body = rem.json()
    assert body["whatsapp_scheduled"] is False
    assert body["status"] == "UNCONFIGURED"
    assert "Augmentin" in body["urdu_message"]

    reply_ok = client.post(
        "/api/v1/whatsapp/webhook",
        data={"From": "whatsapp:+923001234567", "Body": "1 haan theek hai"},
    )
    assert reply_ok.status_code == 200
    assert reply_ok.json()["classification"] == "ADHERENT"
    assert reply_ok.json()["matched_reminder"]["id"] == body["reminder_id"]

    reply_stop = client.post(
        "/api/v1/whatsapp/webhook",
        json={"from": "+923001234567", "body": "2 rash ho gaya"},
    )
    assert reply_stop.status_code == 200
    assert reply_stop.json()["classification"] == "STOPPED_OR_SIDE_EFFECT"
