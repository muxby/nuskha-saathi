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

test("a refused line sets the ask tone", () => {
  const summary = summarizeScan({ medications: [verified("Panadol"), refused()], interactions: [] });
  assert.equal(summary.tone, "ask");
  assert.equal(summary.needsConfirmation, 1);
  assert.equal(summary.total, 2);
});

test("a moderate interaction sets the ask tone", () => {
  const summary = summarizeScan({ medications: [verified("Risek")], interactions: [interaction("MODERATE")] });
  assert.equal(summary.tone, "ask");
  assert.equal(summary.moderateInteractions, 1);
});

