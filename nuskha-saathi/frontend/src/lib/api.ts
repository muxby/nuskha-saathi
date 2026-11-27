export const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"
).replace(/\/$/, "");

export type HealthStatus = {
  status: string;
  formulary_brands: number;
  interaction_pairs: number;
  capabilities?: {
    vision_configured: boolean;
    tts_configured: boolean;
    tts_voice?: string;
    openfda_live: boolean;
    whatsapp_configured: boolean;
    ephemeral_storage?: boolean;
  };
};

export type DemoCaseMeta = {
  case_id: string;
  title: string;
  subtitle: string;
  patient_id: string;
  highlights: string[];
  cabinet_count: number;
};

export type CabinetItem = {
  id: string;
  patient_id: string;
  brand_name: string;
  generic_salts: string[];
  strength_mg: number | null;
  source_label: string;
  added_at: string;
};

export type WhatsAppReminderResult = {
  whatsapp_scheduled: boolean;
  status: string;
  provider: string | null;
  reminder_id: string;
  day3_checkin_due_at: string;
  urdu_message: string;
  detail: string | null;
};

export type WhatsAppWebhookResult = {
  status: string;
  classification: string;
  urdu_reply: string;
};

export type EvalBenchmarkReport = {
  mode: string;
  note: string;
  total_cases: number;
  total_passed: number;
  p50_engine_ms: number;
  subsets: Array<{
    name: string;
    passed: number;
    total: number;
    misses: string[];
  }>;
};

export async function fetchHealth(
  signal?: AbortSignal,
): Promise<HealthStatus | null> {
  try {
    const response = await fetch(`${API_BASE}/health`, {
      method: "GET",
      signal,
    });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (!data || typeof data !== "object") return null;
    const h = data as Partial<HealthStatus>;
    if (
      typeof h.status === "string" &&
      typeof h.formulary_brands === "number" &&
      typeof h.interaction_pairs === "number"
    ) {
      return h as HealthStatus;
    }
    return null;
  } catch {
    return null;
  }
}

export type Schedule = {
  morning: number;
  afternoon: number;
  night: number;
  meal_timing: "before_food" | "after_food" | "any";
  duration_days: number | null;
};
export type Medication = {
  line_id: string;
  status: string;
  brand_matched: string | null;
  fuzzy_score: number | null;
  generic_salts: string[] | null;
  strength_mg: number | null;
  schedule: Schedule | null;
  who_aware_tier: string | null;
  requires_day3_checkin: boolean | null;
  drap_shortage_alert: string | null;
  strip_verified: boolean | null;
  strip_thumbnail_url: string | null;
  raw_text: string | null;
  cropped_handwriting_b64: string | null;
  refusal_reason_urdu: string | null;
};
export type Interaction = {
  severity: string;
  drug_a: string;
  drug_b: string;
  source: string;
  fda_verbatim_excerpt: string;
  urdu_warning: string;
  raw_fda_json: Record<string, unknown> | null;
};
export type ScanResult = {
  scan_id: string;
  /** Absent on older servers and saved records; treated as "OK". */
  vision_status?: "OK" | "INVALID_IMAGE" | "UNREADABLE" | "NOT_CONFIGURED" | "SERVICE_UNAVAILABLE";
  whatsapp_scheduled?: boolean;
  overall_status: string;
  medications: Medication[];
  interactions: Interaction[];
  urdu_script: string;
  audio_urdu_url: string | null;
  audio_qr_payload: string | null;
  telemetry: {
    vision_ms: number;
    resolver_ms: number;
    openfda_ms: number;
    tts_ms: number;
    total_ms: number;
    estimated_cost_usd: number;
    estimated_cost_pkr: number;
  };
};
export type StripResult = {
  verification_status: string;
  urdu_verdict: string;
  strip_thumbnail_url: string | null;
  audio_urdu_url: string | null;
  detected_on_strip: { brand: string | null; strength_mg: number | null };
};

export function assetUrl(path: string | null): string | undefined {
  if (!path) return undefined;
  return path.startsWith("http") ? path : `${API_BASE}${path}`;
}

const speechUrls = new Map<string, string>();

/**
 * Object URL of the server's Urdu voice reading `text`, or null when the
 * voice is unavailable so the caller can fall back to a device voice.
 */
export async function urduSpeechUrl(text: string): Promise<string | null> {
  const line = text.trim();
  if (!line) return null;
  const known = speechUrls.get(line);
  if (known) return known;
  try {
    const response = await fetch(`${API_BASE}/api/v1/speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: line }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.size || !blob.type.startsWith("audio/")) return null;
    const url = URL.createObjectURL(blob);
    speechUrls.set(line, url);
    return url;
  } catch {
    return null;
  }
}

export const UPLOAD_TIMEOUT_MS = 90_000;

export async function postForm<T>(
  path: string,
  form: FormData,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  // A scan waits on vision, interaction lookups and speech. Past this the
  // host has almost certainly dropped the request, so stop and say so.
  const deadline = new AbortController();
  const timer = setTimeout(() => deadline.abort(), UPLOAD_TIMEOUT_MS);
  const onAbort = () => deadline.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      body: form,
      signal: deadline.signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    if (deadline.signal.aborted) throw new Error("TIMEOUT");
    throw new Error("NETWORK");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
  if (!response.ok) {
    if (response.status === 413) throw new Error("TOO_LARGE");
    if (response.status === 429) throw new Error("RATE_LIMITED");
    if (response.status === 504 || response.status === 408) throw new Error("TIMEOUT");
    throw new Error("UPLOAD");
  }
  const data: unknown = await response.json();
  if (
    (path === "/api/v1/scan-parchi" && !isScanResult(data)) ||
    (path === "/api/v1/verify-strip" && !isStripResult(data))
  )
    throw new Error("UPLOAD");
  return data as T;
}

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const nullableText = (value: unknown) =>
  value == null || typeof value === "string";
export function isScanResult(value: unknown): value is ScanResult {
  if (!value || typeof value !== "object") return false;
  const scan = value as Partial<ScanResult>;
  return (
    typeof scan.scan_id === "string" &&
    typeof scan.urdu_script === "string" &&
    ["VERIFIED", "ACTION_REQUIRED", "REFUSED"].includes(
      scan.overall_status || "",
    ) &&
    nullableText(scan.audio_urdu_url) &&
    nullableText(scan.audio_qr_payload) &&
    Array.isArray(scan.medications) &&
    scan.medications.every(
      (m) =>
        m &&
        typeof m.line_id === "string" &&
        [
          "VERIFIED",
          "REFUSED_BLURRY",
          "REFUSED_UNKNOWN_DRUG",
          "REFUSED_DOSAGE_ANOMALY",
        ].includes(m.status) &&
        nullableText(m.brand_matched) &&
        nullableText(m.raw_text) &&
        nullableText(m.refusal_reason_urdu) &&
        nullableText(m.cropped_handwriting_b64) &&
        nullableText(m.strip_thumbnail_url) &&
        nullableText(m.drap_shortage_alert) &&
        (m.strength_mg == null ||
          (finite(m.strength_mg) && m.strength_mg > 0)) &&
        (m.generic_salts == null ||
          (Array.isArray(m.generic_salts) &&
            m.generic_salts.every((s) => typeof s === "string"))) &&
        (m.schedule == null ||
          (["morning", "afternoon", "night"].every(
            (k) =>
              finite(m.schedule![k as keyof Schedule]) &&
              Number(m.schedule![k as keyof Schedule]) >= 0,
          ) &&
            ["before_food", "after_food", "any"].includes(
              m.schedule.meal_timing,
            ) &&
            (m.schedule.duration_days == null ||
              (finite(m.schedule.duration_days) &&
                m.schedule.duration_days > 0)))),
    ) &&
    Array.isArray(scan.interactions) &&
    scan.interactions.every(
      (hit) =>
        hit &&
        ["HIGH", "MODERATE"].includes(hit.severity) &&
        [
          hit.drug_a,
          hit.drug_b,
          hit.source,
          hit.fda_verbatim_excerpt,
          hit.urdu_warning,
        ].every((v) => typeof v === "string"),
    ) &&
    Boolean(scan.telemetry) &&
    [
      "vision_ms",
      "resolver_ms",
      "openfda_ms",
      "tts_ms",
      "total_ms",
      "estimated_cost_usd",
      "estimated_cost_pkr",
    ].every((k) => finite(scan.telemetry![k as keyof ScanResult["telemetry"]]))
  );
}
export function isStripResult(value: unknown): value is StripResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<StripResult>;
  return (
    [
      "EXACT_MATCH",
      "GENERIC_EQUIVALENT_MATCH",
      "STRENGTH_MISMATCH",
      "WRONG_MEDICINE",
      "UNREADABLE_STRIP",
    ].includes(result.verification_status || "") &&
    typeof result.urdu_verdict === "string" &&
    nullableText(result.audio_urdu_url) &&
    nullableText(result.strip_thumbnail_url) &&
    Boolean(result.detected_on_strip) &&
    nullableText(result.detected_on_strip!.brand) &&
    (result.detected_on_strip!.strength_mg == null ||
      finite(result.detected_on_strip!.strength_mg))
  );
}


export async function fetchDemoCases(
  signal?: AbortSignal,
): Promise<DemoCaseMeta[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/demo-cases`, { signal });
    if (!res.ok) return [];
    const data = (await res.json()) as { cases?: DemoCaseMeta[] };
    return Array.isArray(data.cases) ? data.cases : [];
  } catch {
    return [];
  }
}

export async function runDemoCase(
  caseId: string,
  signal?: AbortSignal,
): Promise<ScanResult> {
  const res = await fetch(
    `${API_BASE}/api/v1/demo-cases/${encodeURIComponent(caseId)}`,
    { method: "POST", signal },
  );
  if (!res.ok) throw new Error("UPLOAD");
  const data: unknown = await res.json();
  if (!isScanResult(data)) throw new Error("UPLOAD");
  return data;
}

export async function fetchCabinet(
  patientId: string,
  signal?: AbortSignal,
): Promise<CabinetItem[] | null> {
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/cabinet/${encodeURIComponent(patientId)}`,
      { signal },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { medications?: CabinetItem[] };
    return Array.isArray(data.medications) ? data.medications : [];
  } catch {
    return null;
  }
}

export async function addCabinetMed(
  patientId: string,
  payload: {
    brand_name: string;
    generic_salts?: string[];
    strength_mg?: number | null;
    source_label?: string;
  },
): Promise<{ item: CabinetItem; medications: CabinetItem[] }> {
  const res = await fetch(
    `${API_BASE}/api/v1/cabinet/${encodeURIComponent(patientId)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) throw new Error("UPLOAD");
  return (await res.json()) as {
    item: CabinetItem;
    medications: CabinetItem[];
  };
}

export async function removeCabinetMed(
  patientId: string,
  itemId: string,
): Promise<CabinetItem[] | null> {
  const res = await fetch(
    `${API_BASE}/api/v1/cabinet/${encodeURIComponent(patientId)}/${encodeURIComponent(itemId)}`,
    { method: "DELETE" },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { medications?: CabinetItem[] };
  return Array.isArray(data.medications) ? data.medications : [];
}

export async function sendWhatsAppReminder(payload: {
  patient_id: string;
  scan_id?: string | null;
  brand_name: string;
  phone_e164: string;
  reminder_type?: "day3_checkin" | "daily_dose";
}): Promise<WhatsAppReminderResult> {
  const res = await fetch(`${API_BASE}/api/v1/whatsapp/send-reminder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.detail === "string" ? err.detail : "Request failed");
  }
  return (await res.json()) as WhatsAppReminderResult;
}

export async function simulateWhatsAppReply(payload: {
  from: string;
  body: string;
}): Promise<WhatsAppWebhookResult> {
  const res = await fetch(`${API_BASE}/api/v1/whatsapp/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Webhook request failed");
  return (await res.json()) as WhatsAppWebhookResult;
}

export async function fetchBenchmark(
  signal?: AbortSignal,
): Promise<EvalBenchmarkReport | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/benchmark`, { signal });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      available?: boolean;
      summary?: EvalBenchmarkReport;
    };
    return data.available && data.summary ? data.summary : null;
  } catch {
    return null;
  }
}

export type FormularyMatch = {
  brand_name: string;
  generic_salts: string[];
  common_strengths_mg: number[];
  is_antibiotic: boolean;
  who_aware_tier: string;
};

/** Listed brands matching what the patient typed. Empty on any failure. */
export async function searchFormulary(
  query: string,
  signal?: AbortSignal,
): Promise<FormularyMatch[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/formulary/search?q=${encodeURIComponent(q)}&limit=6`,
      { signal },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: unknown };
    if (!Array.isArray(data.results)) return [];
    return data.results.filter(
      (row): row is FormularyMatch =>
        Boolean(row) &&
        typeof (row as FormularyMatch).brand_name === "string" &&
        Array.isArray((row as FormularyMatch).generic_salts) &&
        Array.isArray((row as FormularyMatch).common_strengths_mg),
    );
  } catch {
    return [];
  }
}


/** Clears every active cabinet medicine on the server. False when unreachable. */
export async function clearCabinet(patientId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/cabinet/${encodeURIComponent(patientId)}`,
      { method: "DELETE" },
    );
    return res.ok;
  } catch {
    return false;
  }
}
