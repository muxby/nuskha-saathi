import type { Schedule } from "@/lib/api";

/**
 * Urdu-script dose sentence built from the structured schedule.
 *
 * The backend voice script is Roman Urdu for the speech vendors. Patients who
 * read Urdu read it in Urdu script, so the card composes the same facts from
 * the verified schedule. Brand names stay in Latin letters and numbers stay as
 * Western digits, matching the strip in the patient's hand.
 */
const SLOT_UR = { morning: "صبح", afternoon: "دوپہر", night: "رات" } as const;
const SLOT_EN = { morning: "morning", afternoon: "afternoon", night: "night" } as const;

const MEAL_UR: Record<Schedule["meal_timing"], string> = {
  before_food: "کھانے سے پہلے",
  after_food: "کھانے کے بعد",
  any: "",
};
const MEAL_EN: Record<Schedule["meal_timing"], string> = {
  before_food: "before food",
  after_food: "after food",
  any: "",
};

type Slot = keyof typeof SLOT_UR;
const SLOTS: Slot[] = ["morning", "afternoon", "night"];

function activeSlots(schedule: Schedule): Array<[Slot, number]> {
  return SLOTS.flatMap((slot) => {
    const qty = schedule[slot];
    return typeof qty === "number" && Number.isFinite(qty) && qty > 0
      ? [[slot, qty] as [Slot, number]]
      : [];
  });
}

function qtyLabel(qty: number): string {
  if (qty === 0.5) return "½";
  return String(Math.round(qty * 100) / 100);
}

/** "صبح 1، رات 1 — کھانے کے بعد — 5 دن". Empty when timing is unknown. */
export function urduDoseLine(schedule: Schedule | null | undefined): string {
  if (!schedule) return "";
  const slots = activeSlots(schedule);
  if (!slots.length) return "";
  const parts = [slots.map(([slot, qty]) => `${SLOT_UR[slot]} ${qtyLabel(qty)}`).join("، ")];
  if (MEAL_UR[schedule.meal_timing]) parts.push(MEAL_UR[schedule.meal_timing]);
  if (schedule.duration_days && schedule.duration_days > 0) {
    parts.push(`${Math.round(schedule.duration_days)} دن`);
  }
  return parts.join(" — ");
}

