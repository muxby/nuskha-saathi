"""Thread-safe local SQLite store for patients, cabinet meds, scans, and reminders."""

from __future__ import annotations

import json
import os
import sqlite3
import threading
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from schemas.responses import ScanResponse
from services.runtime_paths import writable_db_path

DEFAULT_DB_PATH = writable_db_path()


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalize_patient_id(patient_id: str | None) -> str:
    clean = " ".join((patient_id or "anonymous").strip().split())
    return clean[:80] if clean else "anonymous"


class LocalStore:
    """Zero-dependency SQLite persistence matching the Dawa-Guard schema."""

    def __init__(self, db_path: Path | str | None = None):
        resolved = db_path or os.environ.get("NUSKHA_DB_PATH") or DEFAULT_DB_PATH
        self.db_path = Path(resolved)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=15.0, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    def _init_schema(self) -> None:
        with self._lock, self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS patients (
                    patient_id TEXT PRIMARY KEY,
                    phone_e164 TEXT,
                    preferred_language TEXT NOT NULL DEFAULT 'ur',
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS cabinet_medications (
                    id TEXT PRIMARY KEY,
                    patient_id TEXT NOT NULL,
                    brand_name TEXT NOT NULL,
                    generic_salts TEXT NOT NULL,
                    strength_mg REAL,
                    source_label TEXT NOT NULL DEFAULT 'Active Cabinet',
                    is_active INTEGER NOT NULL DEFAULT 1,
                    added_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_cabinet_patient_active
                    ON cabinet_medications (patient_id, is_active);

                CREATE TABLE IF NOT EXISTS prescriptions (
                    scan_id TEXT PRIMARY KEY,
                    patient_id TEXT NOT NULL,
                    overall_status TEXT NOT NULL,
                    response_json TEXT NOT NULL,
                    audio_urdu_url TEXT,
                    created_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_created
                    ON prescriptions (patient_id, created_at DESC);

                CREATE TABLE IF NOT EXISTS reminders (
                    id TEXT PRIMARY KEY,
                    patient_id TEXT NOT NULL,
                    scan_id TEXT,
                    brand_name TEXT NOT NULL,
                    phone_e164 TEXT NOT NULL,
                    channel TEXT NOT NULL,
                    status TEXT NOT NULL,
                    day3_checkin_due_at TEXT NOT NULL,
                    adherence_reply TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_reminders_phone_created
                    ON reminders (phone_e164, created_at DESC);

                CREATE TABLE IF NOT EXISTS telemetry_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    scan_id TEXT NOT NULL,
                    vision_ms INTEGER NOT NULL,
                    resolver_ms INTEGER NOT NULL,
                    openfda_ms INTEGER NOT NULL,
                    tts_ms INTEGER NOT NULL,
                    total_ms INTEGER NOT NULL,
                    estimated_cost_usd REAL NOT NULL,
                    estimated_cost_pkr REAL NOT NULL,
                    created_at TEXT NOT NULL
                );
                """
            )

    def ensure_patient(self, patient_id: str, phone_e164: str | None = None) -> str:
        pid = _normalize_patient_id(patient_id)
        with self._lock, self._connect() as conn:
            conn.execute(
                """
                INSERT INTO patients (patient_id, phone_e164, created_at)
                VALUES (?, ?, ?)
                ON CONFLICT(patient_id) DO UPDATE SET
                    phone_e164 = COALESCE(excluded.phone_e164, patients.phone_e164)
                """,
                (pid, phone_e164, _utc_now_iso()),
            )
        return pid

    def list_cabinet(self, patient_id: str) -> list[dict]:
        pid = _normalize_patient_id(patient_id)
        with self._lock, self._connect() as conn:
            rows = conn.execute(
                """
                SELECT id, patient_id, brand_name, generic_salts, strength_mg, source_label, added_at
                FROM cabinet_medications
                WHERE patient_id = ? AND is_active = 1
                ORDER BY added_at DESC, rowid DESC
                """,
                (pid,),
            ).fetchall()
        items: list[dict] = []
        for row in rows:
            try:
                salts = json.loads(row["generic_salts"] or "[]")
            except json.JSONDecodeError:
                salts = []
            items.append(
                {
                    "id": row["id"],
                    "patient_id": row["patient_id"],
                    "brand_name": row["brand_name"],
                    "generic_salts": [str(salt) for salt in salts if salt],
                    "strength_mg": row["strength_mg"],
                    "source_label": row["source_label"],
                    "added_at": row["added_at"],
                }
            )
        return items

    def add_cabinet_item(
        self,
        patient_id: str,
        *,
        brand_name: str,
        generic_salts: list[str],
        strength_mg: float | None = None,
        source_label: str = "Active Cabinet",
    ) -> dict:
        pid = self.ensure_patient(patient_id)
        clean_brand = " ".join(brand_name.strip().split())
        clean_salts = [str(s).strip().lower() for s in generic_salts if str(s).strip()]
        clean_source = " ".join((source_label or "Active Cabinet").strip().split())
        now = _utc_now_iso()

        with self._lock, self._connect() as conn:
            existing = conn.execute(
                """
                SELECT id, brand_name, strength_mg
                FROM cabinet_medications
                WHERE patient_id = ? AND is_active = 1 AND lower(brand_name) = lower(?)
                """,
                (pid, clean_brand),
            ).fetchall()
            for row in existing:
                if row["strength_mg"] == strength_mg:
                    conn.execute(
                        """
                        UPDATE cabinet_medications
                        SET generic_salts = ?, source_label = ?, added_at = ?
                        WHERE id = ?
                        """,
                        (json.dumps(clean_salts), clean_source, now, row["id"]),
                    )
                    item_id = row["id"]
                    break
            else:
                item_id = f"cab_{uuid.uuid4().hex[:12]}"
                conn.execute(
                    """
                    INSERT INTO cabinet_medications
                        (id, patient_id, brand_name, generic_salts, strength_mg, source_label, is_active, added_at)
                    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
                    """,
                    (item_id, pid, clean_brand, json.dumps(clean_salts), strength_mg, clean_source, now),
                )

        return {
            "id": item_id,
            "patient_id": pid,
            "brand_name": clean_brand,
            "generic_salts": clean_salts,
            "strength_mg": strength_mg,
            "source_label": clean_source,
            "added_at": now,
        }

    def delete_cabinet_item(self, patient_id: str, item_id: str) -> bool:
        pid = _normalize_patient_id(patient_id)
        with self._lock, self._connect() as conn:
            cursor = conn.execute(
                """
                UPDATE cabinet_medications
                SET is_active = 0
                WHERE id = ? AND patient_id = ? AND is_active = 1
                """,
                (item_id, pid),
            )
            return cursor.rowcount > 0

    def clear_cabinet(self, patient_id: str) -> int:
        """Deactivate every active cabinet row for one patient. Returns rows cleared."""
        pid = _normalize_patient_id(patient_id)
        with self._lock, self._connect() as conn:
            cursor = conn.execute(
                "UPDATE cabinet_medications SET is_active = 0 WHERE patient_id = ? AND is_active = 1",
                (pid,),
            )
            return cursor.rowcount

    def record_scan(self, scan: ScanResponse) -> None:
        pid = self.ensure_patient(scan.patient_id)
        now = _utc_now_iso()
        payload_json = scan.model_dump_json()
        with self._lock, self._connect() as conn:
            conn.execute(
                """
                INSERT INTO prescriptions (scan_id, patient_id, overall_status, response_json, audio_urdu_url, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(scan_id) DO UPDATE SET
                    overall_status = excluded.overall_status,
                    response_json = excluded.response_json,
                    audio_urdu_url = excluded.audio_urdu_url
                """,
                (scan.scan_id, pid, scan.overall_status, payload_json, scan.audio_urdu_url, now),
            )
            conn.execute(
                """
                INSERT INTO telemetry_logs
                    (scan_id, vision_ms, resolver_ms, openfda_ms, tts_ms, total_ms, estimated_cost_usd, estimated_cost_pkr, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    scan.scan_id,
                    scan.telemetry.vision_ms,
                    scan.telemetry.resolver_ms,
                    scan.telemetry.openfda_ms,
                    scan.telemetry.tts_ms,
                    scan.telemetry.total_ms,
                    scan.telemetry.estimated_cost_usd,
                    scan.telemetry.estimated_cost_pkr,
                    now,
                ),
            )

    def get_scan(self, scan_id: str) -> dict | None:
        with self._lock, self._connect() as conn:
            row = conn.execute(
                "SELECT response_json FROM prescriptions WHERE scan_id = ?",
                (scan_id,),
            ).fetchone()
        if row is None:
            return None
        try:
            return json.loads(row["response_json"])
        except json.JSONDecodeError:
            return None

    def list_patient_scans(self, patient_id: str, limit: int = 20) -> list[dict]:
        pid = _normalize_patient_id(patient_id)
        safe_limit = max(1, min(limit, 50))
        with self._lock, self._connect() as conn:
            rows = conn.execute(
                """
                SELECT scan_id, patient_id, overall_status, audio_urdu_url, created_at
                FROM prescriptions
                WHERE patient_id = ?
                ORDER BY created_at DESC, rowid DESC
                LIMIT ?
                """,
                (pid, safe_limit),
            ).fetchall()
        return [dict(row) for row in rows]

    def create_reminder(
        self,
        *,
        patient_id: str,
        scan_id: str | None,
        brand_name: str,
        phone_e164: str,
        channel: str,
        status: str,
    ) -> dict:
        pid = self.ensure_patient(patient_id, phone_e164=phone_e164)
        now_dt = datetime.now(timezone.utc)
        now = now_dt.isoformat()
        due_at = (now_dt + timedelta(days=3)).isoformat()
        rem_id = f"rem_{uuid.uuid4().hex[:12]}"
        with self._lock, self._connect() as conn:
            conn.execute(
                """
                INSERT INTO reminders
                    (id, patient_id, scan_id, brand_name, phone_e164, channel, status, day3_checkin_due_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (rem_id, pid, scan_id, brand_name.strip(), phone_e164, channel, status, due_at, now, now),
            )
        return {
            "id": rem_id,
            "patient_id": pid,
            "scan_id": scan_id,
            "brand_name": brand_name.strip(),
            "phone_e164": phone_e164,
            "channel": channel,
            "status": status,
            "day3_checkin_due_at": due_at,
            "created_at": now,
        }

    def record_whatsapp_reply(self, phone_e164: str, reply_status: str, reply_text: str) -> dict | None:
        now = _utc_now_iso()
        with self._lock, self._connect() as conn:
            row = conn.execute(
                """
                SELECT id, patient_id, brand_name
                FROM reminders
                WHERE phone_e164 = ?
                ORDER BY created_at DESC, rowid DESC
                LIMIT 1
                """,
                (phone_e164,),
            ).fetchone()
            if row is None:
                return None
            conn.execute(
                """
                UPDATE reminders
                SET status = ?, adherence_reply = ?, updated_at = ?
                WHERE id = ?
                """,
                (reply_status, reply_text[:500], now, row["id"]),
            )
            return dict(row)

    def counts(self) -> dict[str, int]:
        with self._lock, self._connect() as conn:
            cabinet = conn.execute("SELECT COUNT(*) FROM cabinet_medications WHERE is_active = 1").fetchone()[0]
            scans = conn.execute("SELECT COUNT(*) FROM prescriptions").fetchone()[0]
            reminders = conn.execute("SELECT COUNT(*) FROM reminders").fetchone()[0]
        return {"active_cabinet_items": int(cabinet), "saved_scans": int(scans), "reminders": int(reminders)}
