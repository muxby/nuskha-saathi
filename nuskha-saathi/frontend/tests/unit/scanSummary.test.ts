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

test("no extracted lines is its own tone", () => {
  assert.equal(summarizeScan({ medications: [], interactions: [] }).tone, "empty");
});

test("all verified with no interactions is clear", () => {
  const summary = summarizeScan({ medications: [verified("Panadol")], interactions: [] });
  assert.equal(summary.tone, "clear");
});

test("stop outranks ask", () => {
  assert.equal(
    toneFor({ total: 2, needsConfirmation: 1, highInteractions: 1, moderateInteractions: 1 }),
    "stop",
  );
});

test("only verified antibiotics are counted for day-3 follow-up", () => {
  const summary = summarizeScan({
    medications: [
      verified("Augmentin", { requires_day3_checkin: true }),
      verified("Panadol"),
      { ...refused(), requires_day3_checkin: true },
    ],
    interactions: [],
  });
  assert.equal(summary.antibiotics, 1);
});
