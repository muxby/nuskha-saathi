"""Urdu voice: Urdu-script rendering, the four voices, and the panel setting."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient

from main import create_app
from services import tts_stt_service as tts
from services import urdu_formatter as fmt
from services.local_store import LocalStore
from services.urdu_names import has_latin, name_to_urdu
from services.urdu_speech import engine_line_to_urdu, speech_text

DATA = Path(__file__).resolve().parents[1] / "data"
PASSWORD = "twelve-chars"  # test-only value


@pytest.fixture(autouse=True)
def _fresh_voice_state(monkeypatch):
    monkeypatch.delenv("URDU_TTS_VOICE", raising=False)
    tts.select_voice(None)
    tts._cache.clear()
    yield
    tts.select_voice(None)
    tts._cache.clear()


def _provider(monkeypatch, handler):
    """Route the voice provider's HTTP calls to ``handler`` and switch it on."""
    real = httpx.AsyncClient
    monkeypatch.setenv("FREEAPI_TTS_ENABLED", "1")
    monkeypatch.setattr(
        tts.httpx, "AsyncClient", lambda **kwargs: real(transport=httpx.MockTransport(handler), **kwargs)
    )


def _speaks(calls: list[dict]):
    def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        calls.append(body)
        edge = next(v.edge_voice for v in tts.VOICES.values() if v.name == body["voice"])
        return httpx.Response(200, content=b"MP3" + body["voice"].encode(), headers={"content-type": "audio/mpeg", "x-edge-voice": edge})

    return handler


# ---------- Urdu-script rendering ----------


def test_every_dataset_line_has_an_urdu_script_form():
    formulary = json.loads((DATA / "pk_formulary.json").read_text(encoding="utf-8"))
    pairs = json.loads((DATA / "pk_interactions_fallback.json").read_text(encoding="utf-8"))
    lines = [row["urdu_category_note"] for row in formulary] + [row["urdu_warning"] for row in pairs]
    assert len(lines) > 390
    for line in lines:
        spoken = engine_line_to_urdu(line)
        assert spoken, f"No Urdu-script form for: {line}"
        assert not has_latin(spoken), spoken


def test_every_medicine_name_is_spelt_in_urdu_script():
    formulary = json.loads((DATA / "pk_formulary.json").read_text(encoding="utf-8"))
    names = {row["brand_name"] for row in formulary} | {salt for row in formulary for salt in row["generic_salts"]}
    for name in names:
        spelt = name_to_urdu(name)
        assert spelt and not has_latin(spelt), (name, spelt)


def test_formatter_lines_keep_their_facts_in_urdu_script():
    dose = engine_line_to_urdu(fmt.dose_phrase("Leflox", 500, 1, 0, 1, "after_food"))
    assert dose == "لیفلوکس 500 ملی گرام صبح اور رات کھانے کے بعد لینی ہے۔"
    mismatch = engine_line_to_urdu(fmt.strength_mismatch_urdu("Leflox", 500, 250))
    assert "لیفلوکس 500 ملی گرام" in mismatch and "250 ملی گرام" in mismatch and mismatch.startswith("رک جائیے!")
    wrong = engine_line_to_urdu(fmt.wrong_medicine_urdu("Brufen", "Panadol"))
    assert "بروفین" in wrong and "پیناڈول" in wrong
    for line in (
        fmt.BLURRY_URDU, fmt.UNKNOWN_URDU, fmt.DOSAGE_URDU, fmt.UNREADABLE_STRIP_URDU,
        fmt.dose_phrase("Slow-K", None, 0, 0, 0, "any"),
        fmt.dose_phrase("Amaryl M", 2.5, 1, 1, 1, "before_food"),
        fmt.exact_strip_urdu("Augmentin BD", 625, fmt.dose_phrase("Augmentin BD", 625, 1, 0, 1, "after_food")),
        fmt.exact_strip_urdu("Panadol", None),
        fmt.wrong_medicine_urdu("Brufen", ""),
        fmt.generic_match_urdu("Risek", "Losec", 20),
        fmt.generic_match_urdu("Risek", "Losec", None),
        fmt.shortage_urdu("Tegretol", ["Epival", "Lamictal"]),
        fmt.shortage_urdu("Tegretol", []),
    ):
        spoken = engine_line_to_urdu(line)
        assert spoken and not has_latin(spoken), line


def test_a_whole_script_converts_and_an_unknown_sentence_blocks_it():
    script = fmt.join_script([fmt.dose_phrase("Panadol", 500, 1, 0, 1, "after_food"), fmt.BLURRY_URDU])
    assert engine_line_to_urdu(script).count("۔") == 2
    assert engine_line_to_urdu(f"{script} Aap theek ho jayenge.") is None
    assert engine_line_to_urdu("Take two tablets daily.") is None
    assert engine_line_to_urdu("") is None


def test_dose_letters_are_read_out_and_numbers_are_kept():
    assert name_to_urdu("Septran DS") == "سیپٹران ڈی ایس"
    assert name_to_urdu("Co-Diovan") == "کو ڈایووان"
    assert "625" in engine_line_to_urdu(fmt.dose_phrase("Augmentin", 625, 1, 0, 0, "any"))


def test_urdu_script_text_passes_and_stray_latin_is_spelt_out():
    assert speech_text("پرچی کی تصویر صاف لیں۔") == "پرچی کی تصویر صاف لیں۔"
    assert not has_latin(speech_text("یہ Panadol ہے۔"))
    assert speech_text("Please retake the photo.") is None


# ---------- Voice provider ----------


def test_uzma_is_the_default_and_only_four_voices_exist(monkeypatch):
    assert sorted(tts.VOICES) == ["asad", "gul", "salman", "uzma"]
    assert tts.selected_voice().key == "uzma"
    assert tts.select_voice("asad").key == "asad"
    assert tts.select_voice("andrew").key == "uzma"
    monkeypatch.setenv("URDU_TTS_VOICE", "Gul")
    assert tts.selected_voice().key == "gul"
    monkeypatch.setenv("URDU_TTS_VOICE", "andrew")
    assert tts.selected_voice().key == "uzma"


def test_provider_receives_urdu_script_and_the_selected_voice(monkeypatch):
    calls: list[dict] = []
    _provider(monkeypatch, _speaks(calls))
    audio = asyncio.run(tts.synthesize_urdu(fmt.dose_phrase("Leflox", 500, 1, 0, 0, "after_food")))
    assert audio == b"MP3Uzma"
    assert calls == [{"voice": "Uzma", "text": "لیفلوکس 500 ملی گرام صبح کھانے کے بعد لینی ہے۔"}]
    tts.select_voice("salman")
    assert asyncio.run(tts.synthesize_urdu(fmt.BLURRY_URDU)) == b"MP3Salman"
    assert calls[-1]["voice"] == "Salman" and not has_latin(calls[-1]["text"])


def test_unknown_text_is_never_sent_to_the_provider(monkeypatch):
    calls: list[dict] = []
    _provider(monkeypatch, _speaks(calls))
    assert asyncio.run(tts.synthesize_urdu("Assalam o Alaikum")) is None
    assert calls == []


def test_a_different_voice_in_the_reply_is_rejected(monkeypatch):
    def wrong_voice(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, content=b"MP3", headers={"content-type": "audio/mpeg", "x-edge-voice": "en-US-AndrewNeural"})

    _provider(monkeypatch, wrong_voice)
    assert asyncio.run(tts.synthesize_urdu(fmt.BLURRY_URDU)) is None


def test_provider_failure_returns_none_after_one_retry(monkeypatch):
    attempts = []

    def down(request: httpx.Request) -> httpx.Response:
        attempts.append(request.url.host)
        return httpx.Response(502)

    _provider(monkeypatch, down)
    assert asyncio.run(tts.synthesize_urdu(fmt.BLURRY_URDU)) is None
    assert attempts == ["freeapi.pro", "freeapi.pro"]


def test_long_scripts_are_split_at_sentence_ends_and_joined_in_order(monkeypatch):
    calls: list[dict] = []
    _provider(monkeypatch, _speaks(calls))
    script = fmt.join_script([fmt.dose_phrase(brand, 500, 1, 0, 1, "after_food") for brand in ("Panadol", "Brufen", "Leflox", "Flagyl")] * 4)
    audio = asyncio.run(tts.synthesize_urdu(script))
    assert len(calls) > 1 and audio == b"MP3Uzma" * len(calls)
    assert all(len(call["text"]) <= tts.CHUNK_CHARS and call["text"].endswith("۔") for call in calls)
    assert " ".join(call["text"] for call in calls) == engine_line_to_urdu(script)


def test_repeated_lines_are_served_from_memory(monkeypatch):
    calls: list[dict] = []
    _provider(monkeypatch, _speaks(calls))
    first = asyncio.run(tts.synthesize_urdu(fmt.BLURRY_URDU))
    assert asyncio.run(tts.synthesize_urdu(fmt.BLURRY_URDU)) == first
    assert len(calls) == 1


def test_switched_off_provider_stays_silent(monkeypatch):
    monkeypatch.setenv("FREEAPI_TTS_ENABLED", "0")
    for var in ("AZURE_SPEECH_KEY", "AZURE_SPEECH_REGION"):
        monkeypatch.delenv(var, raising=False)
    assert tts.tts_configured() is False
    assert asyncio.run(tts.synthesize_urdu(fmt.BLURRY_URDU)) is None


# ---------- Routes and panel ----------


def _client(monkeypatch, tmp_path) -> TestClient:
    monkeypatch.setenv("ADMIN_MONITOR_PASSWORD", PASSWORD)
    return TestClient(create_app(store=LocalStore(tmp_path / "voice.db")))


def _signin(client: TestClient):
    return client.post("/admin/login", data={"password": PASSWORD}, follow_redirects=False)


def test_speech_route_returns_audio_or_503(monkeypatch, tmp_path):
    client = _client(monkeypatch, tmp_path)
    assert client.post("/api/v1/speech", json={"text": fmt.BLURRY_URDU}).status_code == 503
    calls: list[dict] = []
    _provider(monkeypatch, _speaks(calls))
    spoken = client.post("/api/v1/speech", json={"text": fmt.BLURRY_URDU})
    assert spoken.status_code == 200
    assert spoken.headers["content-type"] == "audio/mpeg" and spoken.content == b"MP3Uzma"
    assert spoken.headers["cache-control"] == "no-store"
    assert client.post("/api/v1/speech", json={"text": "Buy cheap watches today."}).status_code == 503
    assert client.post("/api/v1/speech", json={"text": ""}).status_code == 422
    assert len(calls) == 1


def test_scan_audio_uses_the_voice_chosen_in_the_panel(monkeypatch, tmp_path):
    calls: list[dict] = []
    _provider(monkeypatch, _speaks(calls))
    client = _client(monkeypatch, tmp_path)
    client.app.state.audio_dir = tmp_path
    _signin(client)
    assert client.post("/admin/api/voice", json={"voice": "asad"}).json()["selected"] == "asad"
    body = client.post("/api/v1/demo-cases/case-01-zubaida-warfarin").json()
    assert body["audio_urdu_url"] == f"/static/audio/{body['scan_id']}.mp3"
    assert (tmp_path / f"{body['scan_id']}.mp3").read_bytes().startswith(b"MP3Asad")
    assert calls and all(call["voice"] == "Asad" and not has_latin(call["text"]) for call in calls)


def test_panel_voice_setting_requires_login_and_a_listed_voice(monkeypatch, tmp_path):
    client = _client(monkeypatch, tmp_path)
    assert client.post("/admin/api/voice", json={"voice": "asad"}).status_code == 401
    assert client.get("/admin/api/voice/sample?voice=asad").status_code == 401
    _signin(client)
    status = client.get("/admin/api/status").json()["voice"]
    assert status["selected"] == status["default"] == "uzma"
    assert [option["name"] for option in status["options"]] == ["Uzma", "Asad", "Gul", "Salman"]
    assert client.post("/admin/api/voice", json={"voice": "andrew"}).status_code == 400
    assert client.post("/admin/api/voice", content=b"not json").status_code == 400
    assert client.post("/admin/api/voice", json={"voice": "gul"}, headers={"Origin": "https://evil.example"}).status_code == 403
    assert tts.selected_voice().key == "uzma"
    assert client.post("/admin/api/voice", json={"voice": "Gul"}).json()["selected"] == "gul"
    assert client.get("/health").json()["capabilities"]["tts_voice"] == "Gul"


def test_panel_voice_choice_survives_a_restart_with_the_same_database(monkeypatch, tmp_path):
    client = _client(monkeypatch, tmp_path)
    _signin(client)
    client.post("/admin/api/voice", json={"voice": "salman"})
    tts.select_voice(None)
    create_app(store=LocalStore(tmp_path / "voice.db"))
    assert tts.selected_voice().key == "salman"
    create_app(store=LocalStore(tmp_path / "other.db"))
    assert tts.selected_voice().key == "uzma"


def test_panel_sample_plays_the_requested_voice(monkeypatch, tmp_path):
    client = _client(monkeypatch, tmp_path)
    _signin(client)
    assert client.get("/admin/api/voice/sample?voice=asad").status_code == 503
    calls: list[dict] = []
    _provider(monkeypatch, _speaks(calls))
    sample = client.get("/admin/api/voice/sample?voice=asad")
    assert sample.status_code == 200 and sample.content == b"MP3Asad"
    assert sample.headers["content-type"] == "audio/mpeg"
    assert client.get("/admin/api/voice/sample?voice=andrew").status_code == 400
    assert tts.selected_voice().key == "uzma"


def test_live_selftest_reports_the_voice(monkeypatch, tmp_path):
    client = _client(monkeypatch, tmp_path)
    _signin(client)
    off = next(c for c in client.post("/admin/api/selftest?live=1").json()["checks"] if c["name"] == "voice")
    assert off["ok"] is False and "switched off" in off["detail"]
    _provider(monkeypatch, _speaks([]))
    on = next(c for c in client.post("/admin/api/selftest?live=1").json()["checks"] if c["name"] == "voice")
    assert on["ok"] is True and on["detail"].startswith("Uzma spoke")
