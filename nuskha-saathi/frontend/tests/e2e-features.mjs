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
  await page.waitForFunction(() => document.documentElement.lang.startsWith("ur"));
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
  // Entry transitions fade text in; contrast is only meaningful once settled.
  await page.evaluate(() =>
    Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => null))),
  );
  const results = await new AxeBuilder({ page })
    .include(".scan-summary")
    .include(".day-plan")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  assert.deepEqual(results.violations.map((v) => v.id), []);
});

check("cabinet suggests listed brands and offers strength chips", async ({ page }) => {
  await page.goto(`${BASE}/#medicines`, { waitUntil: "networkidle" });
  const input = page.locator(".brand-suggest input");
  await input.pressSequentially("leflo", { delay: 40 });
  const option = page.getByRole("option", { name: /Leflox/ });
  await option.waitFor({ state: "visible" });
  assert.match(await option.innerText(), /levofloxacin/);
  await option.dispatchEvent("mousedown");
  assert.equal(await input.inputValue(), "Leflox");
  const chips = await page.locator(".strength-chips button").allInnerTexts();
  assert.ok(chips.includes("500 mg"));
});

check("clear all empties the regular medicines list on device and server", async ({ page }) => {
  await page.goto(`${BASE}/#medicines`, { waitUntil: "networkidle" });
  const input = page.locator(".brand-suggest input");
  await input.fill("Marevan");
  await page.locator(".cabinet-add-form button[type=submit]").click();
  await page.locator(".cabinet-active-list li").first().waitFor({ state: "visible" });
  const patientId = await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i += 1) {
      const value = localStorage.getItem(localStorage.key(i));
      if (value && /^pk-[a-z0-9]+$/.test(value)) return value;
    }
    return null;
  });
  await page.locator(".cabinet-clear button").click();
  assert.equal(await page.locator(".cabinet-active-list li").count(), 1, "first tap only asks");
  await page.locator(".cabinet-clear button.is-danger").click();
  await page.locator(".cabinet-active-list").waitFor({ state: "detached" });
  if (patientId) {
    const response = await page.request.get(`${API}/api/v1/cabinet/${patientId}`);
    assert.deepEqual((await response.json()).medications, []);
  }
});

check("security headers are present on the app and the API", async ({ page }) => {
  const app = await page.request.get(BASE);
  assert.equal(app.headers()["x-content-type-options"], "nosniff");
  assert.equal(app.headers()["x-frame-options"], "DENY");
  assert.match(app.headers()["permissions-policy"], /camera=\(self\)/);
  const api = await page.request.get(`${API}/api/v1/formulary/search?q=risek`);
  assert.equal(api.headers()["cache-control"], "no-store");
  assert.equal(api.headers()["x-content-type-options"], "nosniff");
});

check("app shell and offline demo case load with no network", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload({ waitUntil: "networkidle" });
  await context.setOffline(true);
  await page.goto(`${BASE}/?demo=offline`, { waitUntil: "domcontentloaded" });
  const run = page.locator("dialog[open] button").nth(1);
  await run.waitFor({ state: "visible" });
  await run.click();
  await page.locator(".scan-summary").waitFor({ state: "visible" });
  assert.equal(await page.locator(".connection-status.is-offline").count(), 1);
  await context.close();
});

check("settings show the backend connection state and host", async ({ page }) => {
  await page.goto(`${BASE}/#settings`, { waitUntil: "networkidle" });
  const status = page.locator(".settings-connection .backend-status");
  await status.waitFor({ state: "visible" });
  await page.waitForFunction(
    () => !document.querySelector(".settings-connection .backend-status.is-checking"),
  );
  const health = await (await page.request.get(`${API}/health`)).json();
  const expected = health.capabilities.vision_configured ? "is-ready" : "is-reader-not-configured";
  assert.match(await status.getAttribute("class"), new RegExp(expected));
  assert.match(await status.locator(".backend-status-host").innerText(), new RegExp(new URL(API).host));
});

check("an unanalysed photo is compressed, uploaded and reported as a service problem", async ({ page }) => {
  const health = await (await page.request.get(`${API}/health`)).json();
  if (health.capabilities.vision_configured) {
    console.log("     (skipped: a reader key is configured on this backend)");
    return;
  }
  await page.goto(`${BASE}/#scan`, { waitUntil: "networkidle" });
  await page.locator(".backend-status.is-reader-not-configured").waitFor({ state: "visible" });
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 3200;
    canvas.height = 2400;
    const context = canvas.getContext("2d");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, 3200, 2400);
    context.fillStyle = "#111";
    context.font = "120px sans-serif";
    context.fillText("Tab Panadol 500mg 1+0+1", 200, 600);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  const upload = page.waitForRequest((request) => request.url().endsWith("/api/v1/scan-parchi"));
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "parchi.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  });
  await page.locator("button.primary-button:has(svg.lucide-check)").first().click();
  const request = await upload;
  await page.locator(".vision-notice").waitFor({ state: "visible" });
  const { requestBodySize } = await request.sizes();
  assert.ok(requestBodySize > 0 && requestBodySize < 1_500_000, `upload was ${requestBodySize} bytes`);
  assert.equal(await page.locator(".alert-amber").count(), 0, "no blur warning for a service fault");
  assert.equal(await page.locator(".scan-summary").count(), 0);
});

const browser = await chromium.launch({
  executablePath: process.env.E2E_CHROMIUM_PATH || undefined,
  args: process.env.E2E_CHROMIUM_PATH ? ["--no-sandbox"] : [],
});
let failed = 0;
for (const { name, fn } of checks) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await fn({ page, browser });
    assert.deepEqual(errors, [], "page threw an exception");
    console.log(`ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${name}\n     ${String(error.message).split("\n").join("\n     ")}`);
  } finally {
    await context.close();
  }
}
await browser.close();
console.log(`\n${checks.length - failed}/${checks.length} end-to-end checks passed`);
process.exit(failed ? 1 : 0);
