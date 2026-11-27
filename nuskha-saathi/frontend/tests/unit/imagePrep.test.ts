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

