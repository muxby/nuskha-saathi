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

