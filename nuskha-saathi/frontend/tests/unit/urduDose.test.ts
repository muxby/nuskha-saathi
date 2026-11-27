import assert from "node:assert/strict";
import { test } from "node:test";
import { doseLine, englishDoseLine, urduDoseLine } from "../../src/lib/urduDose.ts";
import { schedule } from "./fixtures.ts";

test("urdu line lists slots, meal timing and duration", () => {
  assert.equal(urduDoseLine(schedule()), "صبح 1، رات 1 — کھانے کے بعد — 5 دن");
});

test("urdu line keeps western digits", () => {
  assert.match(urduDoseLine(schedule({ duration_days: 10 })), /10 دن$/);
});

test("meal timing 'any' is omitted", () => {
  assert.equal(urduDoseLine(schedule({ meal_timing: "any", duration_days: null })), "صبح 1، رات 1");
});

