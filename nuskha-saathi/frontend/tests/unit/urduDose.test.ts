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

test("missing or all-zero schedule returns an empty line", () => {
  assert.equal(urduDoseLine(null), "");
  assert.equal(urduDoseLine(schedule({ morning: 0, night: 0 })), "");
  assert.equal(englishDoseLine(undefined), "");
});

test("english line mirrors the urdu line", () => {
  assert.equal(englishDoseLine(schedule()), "Morning 1, night 1 — after food — 5 days");
  assert.equal(englishDoseLine(schedule({ duration_days: 1 })), "Morning 1, night 1 — after food — 1 day");
});

test("half tablets use the fraction glyph", () => {
  assert.equal(englishDoseLine(schedule({ morning: 0.5, night: 0, duration_days: null })), "Morning ½ — after food");
});

test("doseLine switches on language", () => {
  assert.equal(doseLine(schedule(), "ur"), urduDoseLine(schedule()));
  assert.equal(doseLine(schedule(), "en"), englishDoseLine(schedule()));
});
