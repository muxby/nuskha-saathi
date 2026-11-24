"""HTTP path: photo bytes to a deterministic scan and strip response."""

import asyncio
import json
from io import BytesIO

from fastapi.testclient import TestClient
from PIL import Image

from main import create_app
from schemas.vision import ExtractedLine, VisionExtraction
from services.formulary_resolver import FormularyResolver
from services.openfda_client import OpenFdaClient
from services.vision_extractor import GeminiVisionExtractor, VisionExtractError


def jpeg_bytes(color=(255, 255, 255)) -> bytes:
    image = Image.new("RGB", (120, 60), color)
    buffer = BytesIO()
    image.save(buffer, format="JPEG")
    return buffer.getvalue()


class ScriptedExtractor:
    counts_as_live = False

    def __init__(self, result: VisionExtraction | None = None, error: Exception | None = None):
        self.result = result
        self.error = error
        self.modes: list[str] = []

    async def extract(self, image_bytes: bytes, mime: str, mode: str = "parchi"):
        self.modes.append(mode)
        if self.error:
            raise self.error
        return self.result


def app_for(extractor):
    resolver = FormularyResolver.load()
    fda = OpenFdaClient.from_resolver(resolver, live=False)
    return create_app(extractor=extractor, resolver=resolver, fda=fda)


def test_health_reports_dataset_sizes():
    client = TestClient(app_for(ScriptedExtractor()))
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["formulary_brands"] >= 200
    assert body["interaction_pairs"] >= 60


def test_blurry_line_returns_amber_crop_and_warfarin_conflict_from_cabinet():
    extraction = VisionExtraction(
        extracted_lines=[
            ExtractedLine(
                raw_text="Tab Brufen 400mg BD",
                brand_or_salt_guess="Brufen",
                strength_mg=400,
                morning_qty=1,
                afternoon_qty=0,
                night_qty=1,
                meal_timing="after_food",
                duration_days=5,
                ocr_confidence=0.96,
                bbox_1000=[0, 0, 500, 1000],
            ),
            ExtractedLine(
                raw_text="Syp ???",
                brand_or_salt_guess="???",
                strength_mg=5,
                morning_qty=1,
                afternoon_qty=0,
                night_qty=0,
                meal_timing="any",
                duration_days=3,
                ocr_confidence=0.42,
                bbox_1000=[500, 0, 1000, 1000],
            ),
        ],
        image_quality_warning=False,
    )
    client = TestClient(app_for(ScriptedExtractor(extraction)))
    cabinet = [
        {
            "brand_name": "Marevan",
            "generic_salts": ["warfarin"],
            "strength_mg": 5,
            "source_label": "Active Cabinet — Cardiologist 14 Nov",
        }
    ]
    response = client.post(
        "/api/v1/scan-parchi",
        files={"file": ("parchi.jpg", jpeg_bytes(), "image/jpeg")},
        data={"patient_id": "demo-zubaida-01", "active_cabinet": json.dumps(cabinet)},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["patient_id"] == "demo-zubaida-01"
    assert body["overall_status"] == "ACTION_REQUIRED"
    by_status = {item["status"]: item for item in body["medications"]}
    assert by_status["VERIFIED"]["brand_matched"] == "Brufen"
    assert by_status["VERIFIED"]["generic_salts"] == ["ibuprofen"]
    assert by_status["VERIFIED"]["who_aware_tier"] == "NONE"
    assert by_status["REFUSED_BLURRY"]["ocr_confidence"] == 0.42
    assert by_status["REFUSED_BLURRY"]["refusal_reason_urdu"].startswith("Yeh lafz saaf nahi hai")
    assert by_status["REFUSED_BLURRY"]["cropped_handwriting_b64"].startswith("data:image/jpeg;base64,")
    assert body["interactions"]
    interaction = body["interactions"][0]
    assert interaction["severity"] == "HIGH"
    assert "ibuprofen" in interaction["drug_a"] or "ibuprofen" in interaction["drug_b"]
    assert "warfarin" in interaction["drug_a"] or "warfarin" in interaction["drug_b"]
    assert "Cardiologist 14 Nov" in interaction["drug_a"] or "Cardiologist 14 Nov" in interaction["drug_b"]
    assert len(interaction["fda_verbatim_excerpt"]) > 40
    assert body["telemetry"]["tts_ms"] >= 0
    assert body["audio_qr_payload"].endswith(f"/audio/{body['scan_id']}")
    replay = client.get(f"/api/v1/audio/{body['scan_id']}")
    assert replay.status_code == 200
    assert replay.json()["urdu_script"] == body["urdu_script"]
    assert body["whatsapp_scheduled"] is False
    assert "Brufen" in body["urdu_script"]


def test_same_parchi_pair_and_augmntin_and_overdose():
    extraction = VisionExtraction(
        extracted_lines=[
            ExtractedLine(
                raw_text="Augmntin 625",
                brand_or_salt_guess="Augmntin",
                strength_mg=625,
                morning_qty=1,
                afternoon_qty=0,
                night_qty=1,
                meal_timing="after_food",
                duration_days=5,
                ocr_confidence=0.93,
                bbox_1000=[0, 0, 300, 1000],
            ),
            ExtractedLine(
                raw_text="Tab Leflox 5000mg",
                brand_or_salt_guess="Leflox",
                strength_mg=5000,
                morning_qty=1,
                afternoon_qty=0,
                night_qty=0,
                meal_timing="pc",
                duration_days=5,
                ocr_confidence=0.97,
                bbox_1000=[300, 0, 600, 1000],
            ),
        ]
    )
    client = TestClient(app_for(ScriptedExtractor(extraction)))
    response = client.post(
        "/api/v1/scan-parchi",
        files={"file": ("parchi.jpg", jpeg_bytes((240, 240, 240)), "image/jpeg")},
        data={"patient_id": "anonymous", "active_cabinet": "[]"},
    )
    assert response.status_code == 200
    meds = response.json()["medications"]
    verified = next(item for item in meds if item["status"] == "VERIFIED")
    refused = next(item for item in meds if item["status"] == "REFUSED_DOSAGE_ANOMALY")
    assert verified["brand_matched"] == "Augmentin"
    assert verified["generic_salts"] == ["amoxicillin", "clavulanate"]
    assert verified["requires_day3_checkin"] is True
    assert verified["who_aware_tier"] == "ACCESS"
    assert verified["schedule"]["meal_timing"] == "after_food"
    assert refused["fuzzy_score"] == 100.0 or refused["fuzzy_score"] >= 82


def test_vision_failure_and_empty_file_fail_closed():
    client = TestClient(app_for(ScriptedExtractor(error=VisionExtractError("bad json"))))
    response = client.post(
        "/api/v1/scan-parchi",
        files={"file": ("parchi.jpg", jpeg_bytes(), "image/jpeg")},
        data={"active_cabinet": "[]"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["overall_status"] == "REFUSED"
    assert body["medications"][0]["status"] == "REFUSED_BLURRY"
    assert body["interactions"] == []

    empty = client.post(
        "/api/v1/scan-parchi",
        files={"file": ("parchi.jpg", b"", "image/jpeg")},
        data={"active_cabinet": "[]"},
    )
    assert empty.status_code == 200
    assert empty.json()["medications"][0]["status"] == "REFUSED_BLURRY"


def test_scan_audio_is_saved_and_replayed(monkeypatch, tmp_path):
    async def fake_speech(text):
        assert text
        return b"fake-mp3"

    monkeypatch.setattr("routers.scan.synthesize_urdu", fake_speech)
    app = app_for(ScriptedExtractor(error=VisionExtractError("blur")))
    app.state.audio_dir = tmp_path
    client = TestClient(app)
    body = client.post(
        "/api/v1/scan-parchi",
        files={"file": ("parchi.jpg", jpeg_bytes(), "image/jpeg")},
    ).json()
    assert body["audio_urdu_url"].endswith(f"/{body['scan_id']}.mp3")
    assert (tmp_path / f"{body['scan_id']}.mp3").read_bytes() == b"fake-mp3"
    assert client.get(f"/api/v1/audio/{body['scan_id']}").json()["urdu_script"] == body["urdu_script"]


def test_cabinet_brand_without_salts_still_catches_warfarin():
    extraction = VisionExtraction(
        extracted_lines=[
            ExtractedLine(
                raw_text="Tab Brufen 400mg",
                brand_or_salt_guess="Brufen",
                strength_mg=400,
                morning_qty=1,
                afternoon_qty=0,
                night_qty=0,
                meal_timing="after_food",
                duration_days=3,
                ocr_confidence=0.95,
                bbox_1000=[0, 0, 1000, 1000],
            )
        ]
    )
    client = TestClient(app_for(ScriptedExtractor(extraction)))
    response = client.post(
        "/api/v1/scan-parchi",
        files={"file": ("parchi.jpg", jpeg_bytes(), "image/jpeg")},
        data={"patient_id": "demo-zubaida-01", "active_cabinet": json.dumps([{"brand_name": "Warfarin"}])},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["interactions"]
    joined = " ".join(item["drug_a"] + " " + item["drug_b"] for item in body["interactions"])
    assert "warfarin" in joined
    assert "ibuprofen" in joined


def test_bad_cabinet_json_is_400():
    client = TestClient(app_for(ScriptedExtractor()))
    response = client.post(
        "/api/v1/scan-parchi",
        files={"file": ("parchi.jpg", jpeg_bytes(), "image/jpeg")},
        data={"active_cabinet": "{"},
    )
    assert response.status_code == 400


def test_verify_strip_mismatch_over_http():
    extraction = VisionExtraction(
        extracted_lines=[
            ExtractedLine(
                raw_text="Leflox 250",
                brand_or_salt_guess="Leflox",
                strength_mg=250,
                ocr_confidence=0.98,
                bbox_1000=[0, 0, 1000, 1000],
            )
        ]
    )
    client = TestClient(app_for(ScriptedExtractor(extraction)))
    response = client.post(
        "/api/v1/verify-strip",
        files={"file": ("strip.jpg", jpeg_bytes((200, 0, 0)), "image/jpeg")},
        data={
            "scan_id": "scan_test",
            "matched_line_id": "med_1",
            "expected_brand": "Leflox",
            "expected_strength_mg": "500",
            "expected_salts": "levofloxacin",
            "morning_qty": "1",
            "meal_timing": "after_food",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["verification_status"] == "STRENGTH_MISMATCH"
    assert body["detected_on_strip"]["strength_mg"] == 250
    assert body["expected"]["strength_mg"] == 500
    assert body["strip_thumbnail_url"].startswith("/static/strips/")
    assert "RUK JAIYE" in body["urdu_verdict"]


def test_gemini_parser_accepts_schema_json_and_retries_once():
    calls = {"n": 0}

    async def http_post(url, body):
        calls["n"] += 1
        assert "temperature" in body["generationConfig"]
        assert body["generationConfig"]["temperature"] == 0.0
        assert body["generationConfig"]["responseMimeType"] == "application/json"
        assert "leflox" not in url  # key query is empty in this test double
        if calls["n"] == 1:
            return {"candidates": [{"content": {"parts": [{"text": "not json"}]}}]}
        return {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {
                                "text": json.dumps(
                                    {
                                        "extracted_lines": [
                                            {
                                                "raw_text": "Tab Panadol 500",
                                                "brand_or_salt_guess": "Panadol",
                                                "strength_mg": 500,
                                                "ocr_confidence": 0.91,
                                                "bbox_1000": [0, 0, 10, 10],
                                            }
                                        ],
                                        "image_quality_warning": False,
                                    }
                                )
                            }
                        ]
                    }
                }
            ]
        }

    extractor = GeminiVisionExtractor(api_key="test-key", http_post=http_post, backoff_seconds=0)
    parsed = asyncio.run(extractor.extract(jpeg_bytes(), "image/jpeg", "parchi"))
    assert calls["n"] == 2
    assert parsed.extracted_lines[0].brand_or_salt_guess == "Panadol"

    async def always_bad(url, body):
        return {"candidates": []}

    broken = GeminiVisionExtractor(api_key="test-key", http_post=always_bad, backoff_seconds=0)
    try:
        asyncio.run(broken.extract(jpeg_bytes(), "image/jpeg"))
        raised = False
    except VisionExtractError:
        raised = True
    assert raised


def test_live_excerpt_overrides_cached_text_without_calling_a_brand():
    seen: list[str] = []

    async def fetcher(url: str):
        seen.append(url)
        if "ibuprofen" in url:
            return {
                "results": [
                    {
                        "drug_interactions": [
                            "Concomitant use of ibuprofen and warfarin increases the risk of serious bleeding."
                        ]
                    }
                ]
            }
        if "warfarin" in url:
            return {"results": [{"drug_interactions": ["No extra sentence here about other products."]}]}
        return {"results": []}

    resolver = FormularyResolver.load()
    client = OpenFdaClient.from_resolver(resolver, fetcher=fetcher, live=True)
    hit = asyncio.run(client.lookup_pair("ibuprofen", "warfarin"))
    assert hit is not None
    assert hit.source == "openFDA Drug Label API"
    assert "serious bleeding" in hit.fda_verbatim_excerpt
    assert hit.raw_fda_json["drug_interactions"][0].startswith("Concomitant use")
    assert all("leflox" not in url.casefold() for url in seen)
    assert any("ibuprofen" in url for url in seen)
