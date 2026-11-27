export const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"
).replace(/\/$/, "");

export type HealthStatus = {
  status: string;
  formulary_brands: number;
  interaction_pairs: number;
  capabilities?: {
    vision_configured: boolean;
    vision_provider?: string | null;
    vision_model?: string;
    openrouter_configured?: boolean;
    gemini_configured?: boolean;
    freeapi_imgchat_enabled?: boolean;
    freeapi_transcribe_enabled?: boolean;
    medster_live?: boolean;
    tts_configured: boolean;
    tts_provider?: string | null;
    stt_configured?: boolean;
    stt_provider?: string | null;
    openfda_live: boolean;
    openfda_key_configured?: boolean;
    whatsapp_configured: boolean;
    whatsapp_provider?: string | null;
    admin_monitor_configured?: boolean;
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
  preferred_time?: string;
  language?: string;
  urdu_message: string;
  detail: string | null;
};

export type SavedReminderItem = {
  id: string;
  patient_id: string;
  scan_id: string | null;
  brand_name: string;
  phone_e164: string;
  channel: string;
  status: string;
  day3_checkin_due_at: string;
  preferred_time?: string;
  language?: string;
  adherence_reply: string | null;
  created_at: string;
  updated_at: string;
};

export class ApiRequestError extends Error {
  code: "NETWORK" | "TIMEOUT" | "TOO_LARGE" | "RATE_LIMITED" | "UPLOAD" | "SERVER";
  status?: number;

  constructor(
    code: "NETWORK" | "TIMEOUT" | "TOO_LARGE" | "RATE_LIMITED" | "UPLOAD" | "SERVER",
    message: string,
    status?: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
    this.status = status;
  }
}

export function formatApiError(err: unknown, fallback: string): string {
  if (err instanceof ApiRequestError) return err.message;
  if (err instanceof Error && err.message && !["NETWORK", "UPLOAD"].includes(err.message)) {
    return err.message;
  }
  return fallback;
}

export type WhatsAppWebhookResult = {
  status: string;
  classification: string;
  transcript?: string;
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
  medster_id?: string | null;
  medster_price?: string | null;
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

export const UPLOAD_TIMEOUT_MS = 90_000;
async function readErrorDetail(response: Response): Promise<string> {
  try {
    const raw = await response.text();
    if (!raw) return response.statusText || `HTTP ${response.status}`;
    try {
      const parsed = JSON.parse(raw) as { detail?: unknown; error?: unknown };
      if (typeof parsed.detail === "string" && parsed.detail.trim()) return parsed.detail;
      if (Array.isArray(parsed.detail) && parsed.detail.length > 0) return JSON.stringify(parsed.detail);
      if (typeof parsed.error === "string" && parsed.error.trim()) return parsed.error;
    } catch {
      return raw.slice(0, 180);
    }
    return raw.slice(0, 180);
  } catch {
    return response.statusText || `HTTP ${response.status}`;
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = UPLOAD_TIMEOUT_MS,
): Promise<Response> {
  const outer = init.signal;
  const ctrl = new AbortController();
  let timedOut = false;
  const onOuterAbort = () => ctrl.abort(outer?.reason);
  if (outer) {
    if (outer.aborted) ctrl.abort(outer.reason);
    else outer.addEventListener("abort", onOuterAbort, { once: true });
  }
  const timer = setTimeout(() => {
    timedOut = true;
    ctrl.abort(new Error("TIMEOUT"));
  }, timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (err) {
    if (timedOut) {
      throw new ApiRequestError(
        "TIMEOUT",
        `Request timed out after ${Math.round(timeoutMs / 1000)}s waiting for the server. Please try again.`,
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
    outer?.removeEventListener("abort", onOuterAbort);
  }
}

export async function postForm<T>(
  path: string,
  form: FormData,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response | null = null;
  let lastFetchError: unknown = null;
  const candidates = [API_BASE];
  if (API_BASE === "http://localhost:8000") {
    candidates.push("http://127.0.0.1:8000");
  }

  for (let idx = 0; idx < candidates.length; idx++) {
    const base = candidates[idx];
    try {
      response = await fetchWithTimeout(`${base}${path}`, {
        method: "POST",
        body: form,
        signal,
      });
      break;
    } catch (error) {
      if (signal?.aborted) throw error;
      if (error instanceof ApiRequestError) throw error;
      lastFetchError = error;
      // Only try 127.0.0.1 fallback if localhost failed directly and 127.0.0.1 /health is reachable.
      if (idx === 0 && candidates.length > 1) {
        try {
          const probe = await fetchWithTimeout("http://127.0.0.1:8000/health", { method: "GET", signal }, 2500);
          if (probe.ok) continue;
        } catch {
          // 127.0.0.1 also unreachable
        }
      }
    }
  }

  if (!response) {
    const detail = lastFetchError instanceof Error ? lastFetchError.message : "Failed to fetch";
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      throw new ApiRequestError(
        "NETWORK",
        "Your device appears offline. Check your internet connection and try again.",
      );
    }
    try {
      const probe = await fetchWithTimeout(`${API_BASE}/health`, { method: "GET" }, 3000);
      if (probe.ok) {
        throw new ApiRequestError(
          "NETWORK",
          `Backend server at ${API_BASE} is online, but the upload connection was interrupted (${detail}). Please retry.`,
        );
      }
    } catch (probeErr) {
      if (probeErr instanceof ApiRequestError && probeErr.code === "NETWORK" && probeErr.message.includes("is online")) {
        throw probeErr;
      }
    }
    throw new ApiRequestError(
      "NETWORK",
      `Could not reach backend server at ${API_BASE} (${detail}). Ensure the backend on port 8000 is running.`,
    );
  }

  if (!response.ok) {
    const detail = await readErrorDetail(response);
    if (response.status === 413) {
      throw new ApiRequestError("TOO_LARGE", detail, 413);
    }
    if (response.status === 429) {
      throw new ApiRequestError("RATE_LIMITED", detail, 429);
    }
    if (response.status === 504 || response.status === 408) {
      throw new ApiRequestError("TIMEOUT", detail, response.status);
    }
    throw new ApiRequestError(
      "SERVER",
      `Server returned HTTP ${response.status}: ${detail}`,
      response.status,
    );
  }

  const data: unknown = await response.json();
  if (
    (path === "/api/v1/scan-parchi" && !isScanResult(data)) ||
    (path === "/api/v1/verify-strip" && !isStripResult(data))
  ) {
    throw new ApiRequestError(
      "UPLOAD",
      "The photo could not be checked — the backend returned an unexpected response format.",
    );
  }
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
  send_voice_note?: boolean;
  preferred_time?: string;
  language?: string;
}): Promise<WhatsAppReminderResult> {
  const res = await fetch(`${API_BASE}/api/v1/whatsapp/send-reminder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new ApiRequestError("SERVER", `HTTP ${res.status}: ${detail}`, res.status);
  }
  return (await res.json()) as WhatsAppReminderResult;
}

export async function fetchReminders(
  patientId: string,
  signal?: AbortSignal,
): Promise<{ configured: boolean; provider: string | null; reminders: SavedReminderItem[] }> {
  const res = await fetch(
    `${API_BASE}/api/v1/whatsapp/reminders?patient_id=${encodeURIComponent(patientId)}`,
    { signal },
  );
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new ApiRequestError("SERVER", `HTTP ${res.status}: ${detail}`, res.status);
  }
  return (await res.json()) as {
    configured: boolean;
    provider: string | null;
    reminders: SavedReminderItem[];
  };
}

export async function deleteReminder(
  patientId: string,
  reminderId: string,
): Promise<boolean> {
  const res = await fetch(
    `${API_BASE}/api/v1/whatsapp/reminders/${encodeURIComponent(reminderId)}?patient_id=${encodeURIComponent(patientId)}`,
    { method: "DELETE" },
  );
  return res.ok;
}

export async function updateReminderStatus(
  patientId: string,
  reminderId: string,
  status: string,
  adherenceReply?: string,
): Promise<SavedReminderItem> {
  const res = await fetch(
    `${API_BASE}/api/v1/whatsapp/reminders/${encodeURIComponent(reminderId)}?patient_id=${encodeURIComponent(patientId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, adherence_reply: adherenceReply }),
    },
  );
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new ApiRequestError("SERVER", `HTTP ${res.status}: ${detail}`, res.status);
  }
  const data = (await res.json()) as { reminder: SavedReminderItem };
  return data.reminder;
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

export type LocalMedicineMatch = {
  brand_name: string;
  generic_salts: string[];
  common_strengths_mg: number[];
  max_single_dose_mg: number;
  max_daily_dose_mg: number;
  is_antibiotic: boolean;
  who_aware_tier: string;
  bioequivalent_pk_brands: string[];
  source: string;
};

export type MedSterSearchMatch = {
  id: string;
  name: string;
  price: string | null;
  source: string;
};

export type MedicineSearchResponse = {
  query: string;
  local_matches: LocalMedicineMatch[];
  medster_matches: MedSterSearchMatch[];
};

export type MedicineDetailsResponse = {
  medster: {
    id: string;
    name: string;
    price: string | null;
    discount: string | null;
    ingredients: string | null;
    dosage_form: string | null;
    drug_class: string | null;
    drug_interactions: string | null;
    dose: string | null;
    over_dose: string | null;
    side_effects: string | null;
    precautions: string | null;
    sections: Array<{ section: string; title: string; content: string }>;
    source: string;
  } | null;
  formulary: (LocalMedicineMatch & {
    drap_shortage_flagged: boolean;
    urdu_category_note: string;
  }) | null;
};

export async function searchMedicines(
  query: string,
  signal?: AbortSignal,
): Promise<MedicineSearchResponse> {
  const res = await fetch(
    `${API_BASE}/api/v1/medicines/search?q=${encodeURIComponent(query)}`,
    { signal },
  );
  if (!res.ok) throw new Error("Medicine search failed");
  return (await res.json()) as MedicineSearchResponse;
}

export async function fetchMedicineDetails(
  params: { id?: string; brand?: string },
  signal?: AbortSignal,
): Promise<MedicineDetailsResponse> {
  const qs = new URLSearchParams();
  if (params.id) qs.set("id", params.id);
  if (params.brand) qs.set("brand", params.brand);
  const res = await fetch(`${API_BASE}/api/v1/medicines/details?${qs.toString()}`, {
    signal,
  });
  if (!res.ok) throw new Error("Medicine details unavailable");
  return (await res.json()) as MedicineDetailsResponse;
}

export async function visionChat(payload: {
  file: File;
  userPrompt: string;
  messages?: Array<{ type: "user" | "ai"; content: string }>;
}): Promise<{ provider: string; model: string; response: string }> {
  const form = new FormData();
  form.append("file", payload.file);
  form.append("user_prompt", payload.userPrompt);
  form.append("messages", JSON.stringify(payload.messages || []));
  const res = await fetch(`${API_BASE}/api/v1/vision/chat`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.detail === "string" ? err.detail : "Vision chat unavailable");
  }
  return (await res.json()) as { provider: string; model: string; response: string };
}

export async function synthesizeUrduTts(
  text: string,
): Promise<{ configured: boolean; provider: string | null; audio_urdu_url: string | null }> {
  const res = await fetch(`${API_BASE}/api/v1/tts/urdu`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error("TTS request failed");
  return (await res.json()) as {
    configured: boolean;
    provider: string | null;
    audio_urdu_url: string | null;
  };
}

export async function transcribeUrduAudio(
  file: Blob,
  filename = "voice.webm",
  language = "ur",
): Promise<{ configured: boolean; provider: string | null; text: string | null }> {
  const form = new FormData();
  form.append("file", file, filename);
  form.append("language", language);
  const res = await fetch(`${API_BASE}/api/v1/stt/urdu`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("Audio transcription failed");
  return (await res.json()) as {
    configured: boolean;
    provider: string | null;
    text: string | null;
  };
}

export async function fetchPatientScans(
  patientId: string,
  signal?: AbortSignal,
): Promise<Array<{ scan_id: string; patient_id: string; overall_status: string; audio_urdu_url: string | null; created_at: string }>> {
  const res = await fetch(
    `${API_BASE}/api/v1/patients/${encodeURIComponent(patientId)}/scans`,
    { signal },
  );
  if (!res.ok) throw new Error("History fetch failed");
  const data = (await res.json()) as {
    scans?: Array<{ scan_id: string; patient_id: string; overall_status: string; audio_urdu_url: string | null; created_at: string }>;
  };
  return Array.isArray(data.scans) ? data.scans : [];
}

export async function fetchScanById(
  scanId: string,
  signal?: AbortSignal,
): Promise<ScanResult | null> {
  const res = await fetch(`${API_BASE}/api/v1/scans/${encodeURIComponent(scanId)}`, {
    signal,
  });
  if (!res.ok) return null;
  const data: unknown = await res.json();
  return isScanResult(data) ? data : null;
}
