"""Tests for clearing a patient's Active Cabinet in one request."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from main import create_app
from services.local_store import LocalStore


@pytest.fixture()
def client(tmp_path):
    return TestClient(create_app(store=LocalStore(tmp_path / "store.db")))


def _add(client, patient, brand, strength=5):
    response = client.post(f"/api/v1/cabinet/{patient}", json={"brand_name": brand, "strength_mg": strength})
    assert response.status_code == 201
    return response.json()["item"]


def test_clear_removes_all_active_medicines(client):
    _add(client, "patient-a", "Marevan")
    _add(client, "patient-a", "Concor")
    response = client.delete("/api/v1/cabinet/patient-a")
    assert response.status_code == 200
    assert response.json() == {"patient_id": "patient-a", "cleared": 2, "medications": []}
    assert client.get("/api/v1/cabinet/patient-a").json()["medications"] == []


def test_clear_is_scoped_to_one_patient(client):
    _add(client, "patient-a", "Marevan")
    _add(client, "patient-b", "Concor")
    client.delete("/api/v1/cabinet/patient-a")
    remaining = client.get("/api/v1/cabinet/patient-b").json()["medications"]
    assert [item["brand_name"] for item in remaining] == ["Concor"]


def test_clearing_an_empty_cabinet_is_safe(client):
    response = client.delete("/api/v1/cabinet/nobody")
    assert response.status_code == 200
    assert response.json()["cleared"] == 0


def test_single_delete_still_works(client):
    item = _add(client, "patient-a", "Marevan")
    keep = _add(client, "patient-a", "Concor")
    response = client.delete(f"/api/v1/cabinet/patient-a/{item['id']}")
    assert response.status_code == 200
    assert [m["id"] for m in response.json()["medications"]] == [keep["id"]]


def test_clear_rejects_invalid_patient_id(client):
    assert client.delete("/api/v1/cabinet/%20").status_code == 400
