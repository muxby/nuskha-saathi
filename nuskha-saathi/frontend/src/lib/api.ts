export const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"
).replace(/\/$/, "");

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

export async function postForm<T>(
  path: string,
  form: FormData,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      body: form,
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error("NETWORK");
  }
  if (!response.ok) {
    if (response.status === 413) throw new Error("TOO_LARGE");
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
