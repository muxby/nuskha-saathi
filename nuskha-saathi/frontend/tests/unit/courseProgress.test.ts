import assert from "node:assert/strict";
import { test } from "node:test";
import { courseLabel, courseProgress, isDay3Window } from "../../src/lib/courseProgress.ts";

const started = new Date(2026, 10, 24, 18, 30).toISOString();
const on = (day: number) => new Date(2026, 10, day, 8, 0);

test("the day a course is saved is day 1", () => {
  const progress = courseProgress(started, 5, on(24));
  assert.deepEqual(progress, { day: 1, total: 5, remaining: 4, finished: false, fraction: 0.2 });
});

test("the third calendar day is day 3", () => {
  assert.equal(courseProgress(started, 5, on(26))?.day, 3);
});

test("a course is finished after its last day", () => {
  const progress = courseProgress(started, 5, on(29));
  assert.equal(progress?.finished, true);
  assert.equal(progress?.remaining, 0);
  assert.equal(progress?.fraction, 1);
});

test("unknown duration has no progress", () => {
  assert.equal(courseProgress(started, null, on(25)), null);
  assert.equal(courseProgress(started, 0, on(25)), null);
});

test("invalid or future start dates have no progress", () => {
  assert.equal(courseProgress("nope", 5, on(25)), null);
  assert.equal(courseProgress(started, 5, on(20)), null);
});

