import assert from "node:assert/strict";
import { test } from "node:test";
import { fitWithin, MAX_EDGE, needsReencode, SMALL_ENOUGH_BYTES } from "../../src/lib/imagePrep.ts";

test("a 48 megapixel photo is scaled to the long-edge limit", () => {
  assert.deepEqual(fitWithin({ width: 8000, height: 6000 }), { width: 2000, height: 1500 });
});

test("portrait photos keep their aspect ratio", () => {
  assert.deepEqual(fitWithin({ width: 3024, height: 4032 }), { width: 1500, height: 2000 });
});

test("small photos are never upscaled", () => {
  assert.deepEqual(fitWithin({ width: 1200, height: 900 }), { width: 1200, height: 900 });
});

test("extreme aspect ratios never collapse to zero", () => {
  assert.deepEqual(fitWithin({ width: 20000, height: 4 }), { width: 2000, height: 1 });
  assert.deepEqual(fitWithin({ width: 0, height: 10 }), { width: 0, height: 0 });
});

test("a small in-bounds jpeg is sent untouched", () => {
  assert.equal(needsReencode({ type: "image/jpeg", size: 400_000 }, { width: 1600, height: 1200 }), false);
});

test("png and webp are always converted to jpeg", () => {
  assert.equal(needsReencode({ type: "image/png", size: 10_000 }, { width: 100, height: 100 }), true);
  assert.equal(needsReencode({ type: "image/webp", size: 10_000 }, { width: 100, height: 100 }), true);
});

test("heavy or oversized jpegs are re-encoded", () => {
  assert.equal(needsReencode({ type: "image/jpeg", size: SMALL_ENOUGH_BYTES + 1 }, { width: 1000, height: 800 }), true);
  assert.equal(needsReencode({ type: "image/jpeg", size: 300_000 }, { width: MAX_EDGE + 1, height: 800 }), true);
});
