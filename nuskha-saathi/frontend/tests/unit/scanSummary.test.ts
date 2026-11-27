import assert from "node:assert/strict";
import { test } from "node:test";
import { summarizeScan, toneFor } from "../../src/lib/scanSummary.ts";
import { interaction, refused, verified } from "./fixtures.ts";

test("high interaction sets the stop tone even when every line is verified", () => {
  const summary = summarizeScan({
    medications: [verified("Brufen"), verified("Marevan")],
    interactions: [interaction("HIGH")],
  });
  assert.equal(summary.tone, "stop");
  assert.equal(summary.highInteractions, 1);
  assert.equal(summary.verified, 2);
});

