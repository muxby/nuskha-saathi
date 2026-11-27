import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatDuration,
  formatQuantity,
  formatSalts,
  formatSavedDate,
  formatStrength,
} from "../../src/lib/format.ts";

test("strength drops trailing zeros and keeps decimals", () => {
  assert.equal(formatStrength(500), "500 mg");
  assert.equal(formatStrength(2.5), "2.5 mg");
  assert.equal(formatStrength(null), "");
  assert.equal(formatStrength(0), "");
  assert.equal(formatStrength(Number.NaN), "");
});

test("quantities render common fractions", () => {
  assert.equal(formatQuantity(1), "1");
  assert.equal(formatQuantity(0.5), "½");
  assert.equal(formatQuantity(1.5), "1½");
  assert.equal(formatQuantity(0), "0");
});

test("invalid quantities are shown as unknown", () => {
  assert.equal(formatQuantity(null), "?");
  assert.equal(formatQuantity(-1), "?");
  assert.equal(formatQuantity(Number.POSITIVE_INFINITY), "?");
});

test("duration is labelled in both languages", () => {
  assert.equal(formatDuration(5, "en"), "5 days");
  assert.equal(formatDuration(1, "en"), "1 day");
  assert.equal(formatDuration(5, "ur"), "5 دن");
});

test("unknown duration stays unknown", () => {
  assert.equal(formatDuration(null, "en"), "Duration not stated");
  assert.equal(formatDuration(0, "ur"), "مدت معلوم نہیں");
});

test("salts are joined with a plus", () => {
  assert.equal(formatSalts(["amoxicillin", "clavulanate"]), "amoxicillin + clavulanate");
  assert.equal(formatSalts(null), "");
});

