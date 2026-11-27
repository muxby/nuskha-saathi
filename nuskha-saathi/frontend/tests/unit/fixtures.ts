import type { Interaction, Medication, Schedule } from "../../src/lib/api.ts";

export function schedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    morning: 1,
    afternoon: 0,
    night: 1,
    meal_timing: "after_food",
    duration_days: 5,
    ...overrides,
  };
}

export function verified(brand: string, overrides: Partial<Medication> = {}): Medication {
  return {
    line_id: `line-${brand.toLowerCase()}`,
    status: "VERIFIED",
    brand_matched: brand,
    fuzzy_score: 100,
    generic_salts: [],
    strength_mg: 500,
    schedule: schedule(),
    who_aware_tier: "NONE",
    requires_day3_checkin: false,
    drap_shortage_alert: null,
    strip_verified: null,
    strip_thumbnail_url: null,
    raw_text: `Tab ${brand} 500mg`,
    cropped_handwriting_b64: null,
    refusal_reason_urdu: null,
    ...overrides,
  };
}

export function refused(status = "REFUSED_BLURRY"): Medication {
  return {
    ...verified("unknown"),
    line_id: `line-${status.toLowerCase()}`,
    status,
    brand_matched: null,
    fuzzy_score: null,
    generic_salts: null,
    strength_mg: null,
    schedule: null,
    raw_text: "Syp ???",
    refusal_reason_urdu: "Yeh lafz saaf nahi hai",
  };
}

export function interaction(severity: "HIGH" | "MODERATE" = "HIGH"): Interaction {
  return {
    severity,
    drug_a: "ibuprofen",
    drug_b: "warfarin",
    source: "openFDA Drug Label (Cached Verified Excerpt)",
    fda_verbatim_excerpt: "The effects of warfarin and NSAIDs on GI bleeding are synergistic.",
    urdu_warning: "Khabardar!",
    raw_fda_json: null,
  };
}
