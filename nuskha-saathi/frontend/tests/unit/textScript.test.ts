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

