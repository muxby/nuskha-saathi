-- Nuskha Saathi (Dawa-Guard) PostgreSQL / Supabase schema (Master Spec §5.E)
-- Safe for repeated execution via IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT 'Patient',
  whatsapp_phone TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'ur',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id TEXT PRIMARY KEY,
  patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
  image_url TEXT,
  raw_vision_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  verified_response_json JSONB NOT NULL,
  audio_urdu_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cabinet_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
  prescription_id TEXT REFERENCES prescriptions(id) ON DELETE SET NULL,
  brand_name TEXT NOT NULL,
  generic_salts TEXT[] NOT NULL DEFAULT '{}',
  strength_mg NUMERIC,
  source_label TEXT NOT NULL DEFAULT 'Active Cabinet',
  who_aware_tier TEXT NOT NULL DEFAULT 'NONE',
  strip_verified BOOLEAN NOT NULL DEFAULT FALSE,
  strip_thumbnail_url TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cabinet_patient_active
  ON cabinet_medications (patient_id, is_active);

CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
  prescription_id TEXT REFERENCES prescriptions(id) ON DELETE SET NULL,
  brand_name TEXT NOT NULL DEFAULT '',
  reminder_type TEXT NOT NULL DEFAULT 'DAY3_ANTIBIOTIC_CHECKIN',
  scheduled_at TIMESTAMPTZ NOT NULL,
  audio_ogg_url TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  user_reply_transcript TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS telemetry_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id TEXT,
  vision_ms INT NOT NULL DEFAULT 0,
  resolver_ms INT NOT NULL DEFAULT 0,
  openfda_ms INT NOT NULL DEFAULT 0,
  tts_ms INT NOT NULL DEFAULT 0,
  total_ms INT NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(8,5) NOT NULL DEFAULT 0,
  estimated_cost_pkr NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
