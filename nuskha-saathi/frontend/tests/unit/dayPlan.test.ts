import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDayPlan, dosesPerDay, isPlanEmpty, unscheduled } from "../../src/lib/dayPlan.ts";
import { refused, schedule, verified } from "./fixtures.ts";

test("morning and night doses are placed in their slots", () => {
  const plan = buildDayPlan([verified("Brufen")]);
  assert.deepEqual(plan.morning.map((e) => e.brand), ["Brufen"]);
  assert.deepEqual(plan.afternoon, []);
  assert.deepEqual(plan.night.map((e) => e.brand), ["Brufen"]);
  assert.equal(dosesPerDay(plan), 2);
});

test("entries carry strength, quantity and meal timing", () => {
  const plan = buildDayPlan([
    verified("Risek", { strength_mg: 40, schedule: schedule({ morning: 1, night: 0, meal_timing: "before_food" }) }),
  ]);
  assert.deepEqual(plan.morning[0], {
    lineId: "line-risek",
    brand: "Risek",
    strengthMg: 40,
    quantity: 1,
    mealTiming: "before_food",
  });
});

