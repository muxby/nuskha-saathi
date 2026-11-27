/*
 * End-to-end checks for the results summary, day plan, script-aware Urdu,
 * cabinet lookup and offline shell.
 *
 * Unlike browser-smoke.mjs this suite does not intercept API calls: it needs
 * the FastAPI backend on E2E_API_URL and the production frontend on
 * E2E_BASE_URL. Run `npm run build && npm run start` and the backend first.
 */
import assert from "node:assert/strict";
import { AxeBuilder } from "@axe-core/playwright";
import { chromium } from "playwright";

const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";
const API = process.env.E2E_API_URL || "http://localhost:8000";
const checks = [];
const check = (name, fn) => checks.push({ name, fn });

async function openDemoCase(page, index = 0) {
  await page.goto(`${BASE}/?demo=offline`, { waitUntil: "networkidle" });
  const run = page.locator("dialog[open] button").nth(index + 1);
  await run.waitFor({ state: "visible" });
  await run.click();
  await page.locator(".scan-summary").waitFor({ state: "visible" });
}

async function useUrdu(page) {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /اردو/ }).first().click();
  await page.waitForFunction(() => document.documentElement.lang === "ur");
}

check("results summary leads with stop for a high interaction", async ({ page }) => {
  await openDemoCase(page, 0);
  const summary = page.locator(".scan-summary");
  assert.match(await summary.getAttribute("class"), /tone-stop/);
  const stats = await summary.locator("dd").allInnerTexts();
  assert.deepEqual(stats.map((s) => s.trim()), ["3", "2", "1", "1"]);
});

