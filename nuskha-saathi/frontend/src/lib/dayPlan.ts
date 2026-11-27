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

function validQuantity(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function buildDayPlan(medications: Medication[]): DayPlan {
  const plan: DayPlan = { morning: [], afternoon: [], night: [] };
  for (const med of medications) {
    if (med.status !== "VERIFIED" || !med.schedule || !med.brand_matched) continue;
    for (const slot of DAY_SLOTS) {
      const quantity = med.schedule[slot];
      if (!validQuantity(quantity)) continue;
      plan[slot].push({
        lineId: med.line_id,
        brand: med.brand_matched,
        strengthMg: med.strength_mg,
        quantity,
        mealTiming: med.schedule.meal_timing,
      });
    }
  }
  return plan;
}

export function isPlanEmpty(plan: DayPlan): boolean {
  return DAY_SLOTS.every((slot) => plan[slot].length === 0);
}

export function dosesPerDay(plan: DayPlan): number {
  return DAY_SLOTS.reduce((sum, slot) => sum + plan[slot].length, 0);
}

