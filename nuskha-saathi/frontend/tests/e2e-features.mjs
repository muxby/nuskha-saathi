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

check("roman urdu warning is laid out left to right", async ({ page }) => {
  await openDemoCase(page, 0);
  const warning = page.locator(".alert-red .clinical-text").first();
  assert.equal(await warning.getAttribute("dir"), "ltr");
  assert.equal(await warning.getAttribute("lang"), "ur-Latn");
  assert.match(await warning.innerText(), /^Khabardar!/);
});

check("day plan schedules verified medicines and withholds refused lines", async ({ page }) => {
  await openDemoCase(page, 0);
  const morning = await page.locator(".day-slot-morning .day-dose-name").allInnerTexts();
  assert.ok(morning.some((text) => text.includes("Brufen 400 mg")));
  assert.ok(morning.some((text) => text.includes("Augmentin 625 mg")));
  assert.equal(await page.locator(".day-slot-afternoon.is-empty").count(), 1);
  assert.equal(await page.locator(".day-plan-note").count(), 1);
  assert.equal(await page.locator(".day-plan").getByText("???").count(), 0);
});

check("urdu interface shows the refusal line in urdu script", async ({ page }) => {
  await useUrdu(page);
  await openDemoCase(page, 0);
  const refusal = page.locator(".alert-amber .clinical-text").first();
  assert.equal(await refusal.getAttribute("dir"), "rtl");
  assert.equal(await refusal.getAttribute("lang"), "ur");
  assert.match(await refusal.innerText(), /فارماسسٹ/);
  assert.match(await page.locator(".dose-sentence").first().innerText(), /صبح 1/);
});

check("results fit a 360px viewport in English and Urdu", async ({ browser }) => {
  for (const urdu of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 360, height: 740 } });
    const page = await context.newPage();
    if (urdu) await useUrdu(page);
    await openDemoCase(page, 0);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    assert.ok(overflow <= 1, `horizontal overflow of ${overflow}px (urdu=${urdu})`);
    await context.close();
  }
});

check("results summary and day plan have no axe violations", async ({ page }) => {
  await openDemoCase(page, 0);
  const results = await new AxeBuilder({ page })
    .include(".scan-summary")
    .include(".day-plan")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  assert.deepEqual(results.violations.map((v) => v.id), []);
});

