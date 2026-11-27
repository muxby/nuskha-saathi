import assert from "node:assert/strict";
import { test } from "node:test";
import { isApiUrlMissing, isMixedContent } from "../../src/lib/connectionRules.ts";

test("a deployed page pointing at a localhost API is flagged", () => {
  assert.equal(isApiUrlMissing("http://localhost:8000", "nuskha-saathi.vercel.app"), true);
  assert.equal(isApiUrlMissing("http://127.0.0.1:8000", "example.com"), true);
});

test("local development against a local API is fine", () => {
  assert.equal(isApiUrlMissing("http://localhost:8000", "localhost"), false);
  assert.equal(isApiUrlMissing("http://localhost:8000", "127.0.0.1"), false);
});

test("a real API host is never flagged", () => {
  assert.equal(isApiUrlMissing("https://api.example.com", "app.example.com"), false);
});

test("an unparseable API URL is treated as missing", () => {
  assert.equal(isApiUrlMissing("not a url", "app.example.com"), true);
});

test("an http API on an https page is mixed content", () => {
  assert.equal(isMixedContent("http://api.example.com", "https:"), true);
  assert.equal(isMixedContent("https://api.example.com", "https:"), false);
  assert.equal(isMixedContent("http://localhost:8000", "http:"), false);
});
