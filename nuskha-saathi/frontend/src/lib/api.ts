export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");

export type Schedule = { morning: number; afternoon: number; night: number; meal_timing: "before_food" | "after_food" | "any"; duration_days: number | null };
export type Medication = {
  line_id: string; status: string; brand_matched: string | null; fuzzy_score: number | null;
  generic_salts: string[] | null; strength_mg: number | null; schedule: Schedule | null;
  who_aware_tier: string | null; requires_day3_checkin: boolean | null;
  drap_shortage_alert: string | null; strip_verified: boolean | null;
  strip_thumbnail_url: string | null; raw_text: string | null;
  cropped_handwriting_b64: string | null; refusal_reason_urdu: string | null;
};
export type Interaction = { severity: string; drug_a: string; drug_b: string; source: string; fda_verbatim_excerpt: string; urdu_warning: string; raw_fda_json: Record<string, unknown> | null };
export type ScanResult = {
  scan_id: string; overall_status: string; medications: Medication[]; interactions: Interaction[];
  urdu_script: string; audio_urdu_url: string | null; audio_qr_payload: string | null;
  telemetry: { vision_ms: number; resolver_ms: number; openfda_ms: number; tts_ms: number; total_ms: number; estimated_cost_usd: number; estimated_cost_pkr: number };
};
export type StripResult = {
  verification_status: string; urdu_verdict: string; strip_thumbnail_url: string | null;
  audio_urdu_url: string | null; detected_on_strip: { brand: string | null; strength_mg: number | null };
};

export function assetUrl(path: string | null): string | undefined {
  if (!path) return undefined;
  return path.startsWith("http") ? path : `${API_BASE}${path}`;
}

export async function postForm<T>(path: string, form: FormData): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { method: "POST", body: form });
  } catch {
    throw new Error("انٹرنیٹ سے رابطہ نہیں ہو سکا۔ دوبارہ کوشش کریں۔");
  }
  if (!response.ok) {
    if (response.status === 413) throw new Error("تصویر 8 MB سے بڑی ہے۔ چھوٹی تصویر منتخب کریں۔");
    throw new Error("تصویر کی جانچ نہیں ہو سکی۔ دوبارہ کوشش کریں۔");
  }
  return response.json() as Promise<T>;
}
