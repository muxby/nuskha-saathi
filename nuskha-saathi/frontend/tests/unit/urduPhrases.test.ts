import assert from "node:assert/strict";
import { test } from "node:test";
import { detectScript } from "../../src/lib/textScript.ts";
import { displayUrdu, urduScriptFor } from "../../src/lib/urduPhrases.ts";

const BLURRY = "Yeh lafz saaf nahi hai — meharbani kar ke pharmacist ya doctor se tasdeeq karein.";

test("blurry refusal has an urdu-script form", () => {
  const urdu = urduScriptFor(BLURRY);
  assert.ok(urdu);
  assert.equal(detectScript(urdu), "arabic");
});

test("matching tolerates extra whitespace", () => {
  assert.equal(urduScriptFor(`  ${BLURRY.replace(" — ", "  —  ")} `), urduScriptFor(BLURRY));
});

test("an unrecognised warning is returned unchanged", () => {
  const warning = "Khabardar! Brufen is ke sath lene se bleeding ka khatra barh sakta hai.";
  assert.equal(urduScriptFor(warning), null);
  assert.equal(displayUrdu(warning, "ur"), warning);
});

test("english interface keeps the engine wording", () => {
  assert.equal(displayUrdu(BLURRY, "en"), BLURRY);
});

test("empty input displays nothing", () => {
  assert.equal(displayUrdu(null, "ur"), "");
  assert.equal(urduScriptFor(""), null);
});
