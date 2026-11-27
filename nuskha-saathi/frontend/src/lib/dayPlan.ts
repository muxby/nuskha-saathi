import type { Medication } from "@/lib/api";

/**
 * Turns verified lines into a morning / afternoon / night plan.
 *
 * Only VERIFIED lines with a positive quantity appear. A refused line, a
 * missing schedule or an explicit zero never produces an entry, so the plan
 * cannot show a dose the safety gate did not confirm.
 */
export type DaySlot = "morning" | "afternoon" | "night";

export const DAY_SLOTS: readonly DaySlot[] = ["morning", "afternoon", "night"];

export type PlanEntry = {
  lineId: string;
  brand: string;
  strengthMg: number | null;
  quantity: number;
  mealTiming: "before_food" | "after_food" | "any";
};

export type DayPlan = Record<DaySlot, PlanEntry[]>;

