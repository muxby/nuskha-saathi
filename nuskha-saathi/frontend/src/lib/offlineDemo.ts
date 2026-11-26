import type { DemoCaseMeta, ScanResult } from "./api";

export const OFFLINE_DEMO_CASES: DemoCaseMeta[] = [
  {
    case_id: "case-01-zubaida-warfarin",
    title: "Amma Zubaida: Cabinet clash + blurry syrup",
    subtitle: "Cross-doctor NSAID + Warfarin bleed risk alongside an unclear line",
    patient_id: "demo-zubaida-01",
    highlights: ["HIGH Ibuprofen + Warfarin clash", "REFUSED_BLURRY", "Augmentin Day-3"],
    cabinet_count: 1,
  },
  {
    case_id: "case-02-tariq-nitrate-sildenafil",
    title: "Tariq Mahmood: Nitrate + sildenafil clash",
    subtitle: "Detects hypotension risk against heart clinic Ismo",
    patient_id: "demo-tariq-02",
    highlights: ["HIGH Isosorbide Mononitrate + Sildenafil", "Concor verified"],
    cabinet_count: 1,
  },
  {
    case_id: "case-03-leflox-overdose",
    title: "Fatima Bibi: 5000mg overdose refusal",
    subtitle: "Overdose ceiling triggers REFUSED_DOSAGE_ANOMALY",
    patient_id: "demo-fatima-03",
    highlights: ["REFUSED_DOSAGE_ANOMALY", "Risek 40mg before food"],
    cabinet_count: 0,
  },
  {
    case_id: "case-04-unknown-mystery-brand",
    title: "Bilal Ahmed: Unlisted brand refusal",
    subtitle: "Low formulary match score refuses unknown brand without guessing",
    patient_id: "demo-bilal-04",
    highlights: ["REFUSED_UNKNOWN_DRUG", "Panadol 500mg verified"],
    cabinet_count: 0,
  },
  {
    case_id: "case-05-augmntin-all-clear",
    title: "Ayesha Siddiqui: All-clear prescription",
    subtitle: "Resolves handwritten 'Augmntin' -> Augmentin cleanly",
    patient_id: "demo-ayesha-05",
    highlights: ["VERIFIED status", "Augmentin typo resolved"],
    cabinet_count: 0,
  },
];

const ZERO_TELEMETRY = {
  vision_ms: 0,
  resolver_ms: 2,
  openfda_ms: 1,
  tts_ms: 0,
  total_ms: 3,
  estimated_cost_usd: 0,
  estimated_cost_pkr: 0,
};

export function buildOfflineDemoFallback(caseId: string): ScanResult | null {
  if (caseId === "case-01-zubaida-warfarin") {
    return {
      scan_id: "scan_de0000000000000000000001",
      overall_status: "ACTION_REQUIRED",
      whatsapp_scheduled: false,
      medications: [
        {
          line_id: "med_1",
          status: "VERIFIED",
          brand_matched: "Brufen",
          fuzzy_score: 100,
          generic_salts: ["ibuprofen"],
          strength_mg: 400,
          schedule: { morning: 1, afternoon: 0, night: 1, meal_timing: "after_food", duration_days: 5 },
          who_aware_tier: "NONE",
          requires_day3_checkin: false,
          drap_shortage_alert: null,
          strip_verified: false,
          strip_thumbnail_url: null,
          raw_text: "Tab Brufen 400mg BD pc",
          cropped_handwriting_b64: null,
          refusal_reason_urdu: null,
        },
        {
          line_id: "med_2",
          status: "REFUSED_BLURRY",
          brand_matched: null,
          fuzzy_score: null,
          generic_salts: null,
          strength_mg: null,
          schedule: null,
          who_aware_tier: null,
          requires_day3_checkin: null,
          drap_shortage_alert: null,
          strip_verified: null,
          strip_thumbnail_url: null,
          raw_text: "Syp ??? (smudged ink)",
          cropped_handwriting_b64: null,
          refusal_reason_urdu:
            "Yeh lafz saaf nahi hai. Meharbani kar ke pharmacist ya doctor se tasdeeq karein.",
        },
        {
          line_id: "med_3",
          status: "VERIFIED",
          brand_matched: "Augmentin",
          fuzzy_score: 94.1,
          generic_salts: ["amoxicillin", "clavulanate"],
          strength_mg: 625,
          schedule: { morning: 1, afternoon: 0, night: 1, meal_timing: "after_food", duration_days: 5 },
          who_aware_tier: "ACCESS",
          requires_day3_checkin: true,
          drap_shortage_alert: null,
          strip_verified: false,
          strip_thumbnail_url: null,
          raw_text: "Tab Augmntin 625mg BD x5d",
          cropped_handwriting_b64: null,
          refusal_reason_urdu: null,
        },
      ],
      interactions: [
        {
          severity: "HIGH",
          drug_a: "ibuprofen (Brufen — current parchi)",
          drug_b: "warfarin (Marevan — Active Cabinet — Cardiologist 14 Nov)",
          source: "openFDA Drug Label (Cached Verified Excerpt)",
          fda_verbatim_excerpt:
            "The effects of warfarin and NSAIDs on GI bleeding are synergistic, such that users of both drugs together have a risk of serious GI bleeding higher than users of either drug alone.",
          urdu_warning:
            "Khabardar! Warfarin aur ibuprofen ka sang milakar istemal khoon behne ka khatra barha sakta hai. Lene se pehle apne doctor se foran rabta karein.",
          raw_fda_json: null,
        },
      ],
      urdu_script:
        "Brufen 400 mg subah 1 aur raat 1 goli khane ke baad lein. Khabardar! Warfarin aur ibuprofen milakar lene se pehle apne doctor se rabta karein.",
      audio_urdu_url: null,
      audio_qr_payload: "/audio/scan_de0000000000000000000001",
      telemetry: ZERO_TELEMETRY,
    };
  }
  if (caseId === "case-05-augmntin-all-clear") {
    return {
      scan_id: "scan_de0000000000000000000005",
      overall_status: "VERIFIED",
      whatsapp_scheduled: false,
      medications: [
        {
          line_id: "med_1",
          status: "VERIFIED",
          brand_matched: "Augmentin",
          fuzzy_score: 94.1,
          generic_salts: ["amoxicillin", "clavulanate"],
          strength_mg: 625,
          schedule: { morning: 1, afternoon: 0, night: 1, meal_timing: "after_food", duration_days: 5 },
          who_aware_tier: "ACCESS",
          requires_day3_checkin: true,
          drap_shortage_alert: null,
          strip_verified: false,
          strip_thumbnail_url: null,
          raw_text: "Tab Augmntin 625mg BD pc x5d",
          cropped_handwriting_b64: null,
          refusal_reason_urdu: null,
        },
        {
          line_id: "med_2",
          status: "VERIFIED",
          brand_matched: "Panadol",
          fuzzy_score: 100,
          generic_salts: ["acetaminophen"],
          strength_mg: 500,
          schedule: { morning: 1, afternoon: 0, night: 1, meal_timing: "after_food", duration_days: 3 },
          who_aware_tier: "NONE",
          requires_day3_checkin: false,
          drap_shortage_alert: null,
          strip_verified: false,
          strip_thumbnail_url: null,
          raw_text: "Tab Panadol 500mg BD x3d",
          cropped_handwriting_b64: null,
          refusal_reason_urdu: null,
        },
      ],
      interactions: [],
      urdu_script:
        "Augmentin 625 mg subah 1 aur raat 1 goli khane ke baad poore 5 din mukammal karein.",
      audio_urdu_url: null,
      audio_qr_payload: "/audio/scan_de0000000000000000000005",
      telemetry: ZERO_TELEMETRY,
    };
  }
  return null;
}
