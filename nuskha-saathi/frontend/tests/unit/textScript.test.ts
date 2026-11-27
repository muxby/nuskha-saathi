import assert from "node:assert/strict";
import { test } from "node:test";
import { detectScript, textDirection, urduLangTag } from "../../src/lib/textScript.ts";

test("urdu script is detected as arabic", () => {
  assert.equal(detectScript("یہ لفظ صاف نہیں ہے"), "arabic");
});

test("roman urdu is detected as latin", () => {
  assert.equal(detectScript("Yeh lafz saaf nahi hai"), "latin");
});

test("digits and punctuation are neutral", () => {
  assert.equal(detectScript("500 — 1+0+1"), "neutral");
  assert.equal(detectScript(""), "neutral");
  assert.equal(detectScript(null), "neutral");
});

test("roman urdu warning reads left to right", () => {
  const warning = "Khabardar! Aap pehle se khoon patla karne ki dawai Warfarin le rahi hain.";
  assert.equal(textDirection(warning), "ltr");
  assert.equal(urduLangTag(warning), "ur-Latn");
});

test("urdu script with a latin brand name stays right to left", () => {
  const text = "صبح 1، رات 1 — کھانے کے بعد — Brufen 400 mg";
  assert.equal(textDirection(text), "rtl");
  assert.equal(urduLangTag(text), "ur");
});

test("neutral text falls back to left to right", () => {
  assert.equal(textDirection("500"), "ltr");
});
