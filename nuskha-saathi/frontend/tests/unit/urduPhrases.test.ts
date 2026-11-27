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

