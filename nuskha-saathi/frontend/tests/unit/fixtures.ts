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

