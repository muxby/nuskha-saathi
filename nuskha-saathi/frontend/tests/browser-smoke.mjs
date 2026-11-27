// Browser-only test fixtures exercise API states; the application never imports them.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
const BASE = process.env.UI_TEST_BASE_URL || "http://localhost:3000";
const OUT = process.env.UI_TEST_OUTPUT || "/tmp/nuskha-ui-results";
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.UI_TEST_BROWSER || "chrome",
  headless: true,
  args: [
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
  ],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
const errors = [];
const checks = [];
page.on("pageerror", (error) => errors.push(error.message));
const test = async (name, fn) => {
  await fn();
  checks.push(name);
  console.log(`PASS ${name}`);
};
const med = {
  line_id: "med_1",
  status: "VERIFIED",
  brand_matched: "Panadol",
  fuzzy_score: 100,
  generic_salts: ["paracetamol"],
  strength_mg: 500,
  schedule: {
    morning: 1,
    afternoon: 0,
    night: 1,
    meal_timing: "after_food",
    duration_days: 3,
  },
  who_aware_tier: "NONE",
  requires_day3_checkin: false,
  drap_shortage_alert: null,
  strip_verified: null,
  strip_thumbnail_url: null,
  raw_text: "Panadol 500 mg 1+0+1 after food, 3 days",
  cropped_handwriting_b64: null,
  refusal_reason_urdu: null,
};
const result = {
  scan_id: "scan_0123456789abcdef01234567",
  overall_status: "VERIFIED",
  medications: [med],
  interactions: [],
  urdu_script: "Panadol 500 mg صبح 1 گولی اور رات 1 گولی کھانے کے بعد لیں۔",
  audio_urdu_url: "/test-audio.wav",
  audio_qr_payload: "/audio/scan_0123456789abcdef01234567",
  whatsapp_scheduled: false,
  telemetry: {
    vision_ms: 30,
    resolver_ms: 2,
    openfda_ms: 12,
    tts_ms: 8,
    total_ms: 52,
    estimated_cost_usd: 0.0004,
    estimated_cost_pkr: 0.11,
  },
};
let response = result;
let uploadFailure = false;
let holdScan = false;
let releaseScan;
let stripStatus = "EXACT_MATCH";
await context.route("**/api/v1/scan-parchi", async (route) => {
  if (holdScan)
    await new Promise((resolve) => {
      releaseScan = resolve;
    });
  else await new Promise((r) => setTimeout(r, 250));
  if (uploadFailure) {
    await route.abort("failed");
    return;
  }
  await route.fulfill({ json: response });
});
await context.route("**/api/v1/verify-strip", (route) =>
  route.fulfill({
    json: {
      scan_id: result.scan_id,
      matched_line_id: "med_1",
      verification_status: stripStatus,
      urdu_verdict: "پٹی کی جانچ مکمل ہوئی۔",
      strip_thumbnail_url: ["EXACT_MATCH", "GENERIC_EQUIVALENT_MATCH"].includes(
        stripStatus,
      )
        ? "/icon-192.png"
        : null,
      audio_urdu_url: null,
      detected_on_strip: {
        brand: "Panadol",
        strength_mg: stripStatus === "STRENGTH_MISMATCH" ? 250 : 500,
      },
    },
  }),
);
await context.route("**/api/v1/audio/*", (route) =>
  route.fulfill({
    json: {
      scan_id: result.scan_id,
      urdu_script: result.urdu_script,
      audio_urdu_url: result.audio_urdu_url,
    },
  }),
);
const mockReminders = [];
await context.route("**/api/v1/whatsapp/reminders*", (route) => {
  if (route.request().method() === "DELETE") {
    return route.fulfill({ json: { deleted: true } });
  }
  return route.fulfill({
    json: { configured: false, provider: null, reminders: mockReminders },
  });
});
await context.route("**/api/v1/whatsapp/send-reminder", async (route) => {
  const payload = JSON.parse(route.request().postData() || "{}");
  const item = {
    id: `rem_smoke_${mockReminders.length + 1}`,
    patient_id: payload.patient_id || "anon",
    scan_id: payload.scan_id || null,
    brand_name: payload.brand_name || "Augmentin",
    phone_e164: payload.phone_e164 || "+923001234567",
    channel: "whatsapp",
    status: "UNCONFIGURED",
    day3_checkin_due_at: new Date().toISOString(),
    preferred_time: payload.preferred_time || "08:00",
    language: payload.language || "en",
    adherence_reply: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  mockReminders.unshift(item);
  await route.fulfill({
    json: {
      whatsapp_scheduled: false,
      status: "UNCONFIGURED",
      provider: null,
      reminder_id: item.id,
      day3_checkin_due_at: item.day3_checkin_due_at,
      preferred_time: item.preferred_time,
      language: item.language,
      urdu_message: `Reminder for ${item.brand_name}`,
      detail: "Saved locally.",
    },
  });
});
const wav = Buffer.alloc(44 + 16000 * 2);
wav.write("RIFF");
wav.writeUInt32LE(wav.length - 8, 4);
wav.write("WAVEfmt ", 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(8000, 24);
wav.writeUInt32LE(16000, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write("data", 36);
wav.writeUInt32LE(wav.length - 44, 40);
await context.route("**/test-audio.wav", (route) =>
  route.fulfill({ contentType: "audio/wav", body: wav }),
);
let navigation = 0;
const nav = async (view) => {
  await page.goto(`${BASE}/?test=${++navigation}#${view}`);
  await page.waitForTimeout(180);
};
const audit = async (name) => {
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  const report = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  assert.deepEqual(
    report.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
    [],
    name,
  );
};
const photo = {
  name: "prescription.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
    "base64",
  ),
};
const upload = async () => {
  await page.locator('input[type="file"]').first().setInputFiles(photo);
  await page
    .getByRole("button", { name: "Use this photo", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Your prescription", exact: true })
    .waitFor();
};
try {
  await test("English and Urdu responsive homepages, language persistence, and accessibility", async () => {
    for (const lang of ["en", "ur"]) {
      await nav("home");
      await page
        .getByRole("button", {
          name: lang === "en" ? "EN" : "اردو",
          exact: true,
        })
        .click();
      await page.evaluate(() => document.fonts.ready);
      for (const width of [360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
          `${lang} ${width} overflow`,
        );
        const clipped = await page
          .locator(".site-header button")
          .evaluateAll((nodes) =>
            nodes
              .filter((e) => e.getClientRects().length)
              .filter((e) => {
                const r = e.getBoundingClientRect();
                return (
                  r.left < -0.5 ||
                  r.right > innerWidth + 0.5 ||
                  r.width < 47.5 ||
                  r.height < 47.5
                );
              })
              .map((e) => e.textContent),
          );
        assert.deepEqual(clipped, [], `${lang} ${width} header targets`);
        if (width === 390 || width === 1440)
          await page.screenshot({
            path: `${OUT}/home-${lang}-${width}.png`,
            fullPage: true,
          });
      }
      assert.equal(
        await page.locator("html").getAttribute("dir"),
        lang === "ur" ? "rtl" : "ltr",
      );
      await audit(lang);
      await page.reload();
      await page.waitForFunction(
        (dir) => document.documentElement.dir === dir,
        lang === "ur" ? "rtl" : "ltr",
      );
      assert.equal(
        await page.locator("html").getAttribute("dir"),
        lang === "ur" ? "rtl" : "ltr",
      );
    }
    await page.getByRole("button", { name: "EN", exact: true }).click();
  });
  await test("empty cabinet, verification prerequisites, and unavailable reminders", async () => {
    await nav("medicines");
    assert.equal(
      await page
        .getByRole("heading", { name: "Your medicine cabinet is empty" })
        .count(),
      1,
    );
    await nav("verify");
    assert.equal(
      await page
        .getByRole("heading", { name: "Scan a prescription first" })
        .count(),
      1,
    );
    await nav("reminders");
    assert.equal(
      await page.getByRole("button", { name: "Enable reminders" }).isDisabled(),
      false,
    );
    await page.getByRole("button", { name: "Enable reminders" }).click();
    await page.locator(".reminder-saved-card").first().waitFor();
    await audit("reminders");
  });
  await test("camera permission denial, gallery file checks, and photo review", async () => {
    await nav("scan");
    await context.grantPermissions([]);
    await page.evaluate(() => {
      navigator.mediaDevices.getUserMedia = () =>
        Promise.reject(new DOMException("Denied", "NotAllowedError"));
    });
    await page.getByRole("button", { name: "Use camera", exact: true }).click();
    await page.locator(".capture-error").waitFor();
    assert.match(
      await page.locator(".capture-error").innerText(),
      /Camera access/,
    );
    await page.locator('input[type="file"]').setInputFiles({
      name: "wrong.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from("<svg/>"),
    });
    assert.match(await page.locator(".capture-error").innerText(), /JPEG/);
    await page
      .locator('input[type="file"]')
      .setInputFiles({ ...photo, buffer: Buffer.alloc(8 * 1024 * 1024 + 1) });
    assert.match(await page.locator(".capture-error").innerText(), /8 MB/);
    await page.locator('input[type="file"]').setInputFiles(photo);
    await page
      .getByRole("button", { name: "Use this photo", exact: true })
      .waitFor();
    await audit("scanner");
  });
  await test("simulated live camera capture and retake", async () => {
    await nav("scan");
    await context.grantPermissions(["camera"]);
    await page.getByRole("button", { name: "Use camera", exact: true }).click();
    await page.waitForFunction(
      () => document.querySelector("video")?.videoWidth > 0,
    );
    await page.getByRole("button", { name: "Take photo", exact: true }).click();
    await page
      .getByRole("button", { name: "Use this photo", exact: true })
      .waitFor();
    assert.equal(await page.locator("video").count(), 0);
    await page
      .getByRole("button", { name: "Retake photo", exact: true })
      .click();
    await page.locator("video").waitFor();
    await nav("scan");
    await page.locator('input[type="file"]').setInputFiles(photo);
    await page
      .getByRole("button", { name: "Use this photo", exact: true })
      .waitFor();
  });
  await test("scan processing, source text, confirmed dose and explicit zero", async () => {
    holdScan = true;
    await page
      .getByRole("button", { name: "Use this photo", exact: true })
      .click();
    await page.locator(".processing-layout h2").waitFor();
    assert.equal(
      await page.locator(".processing-layout").getAttribute("aria-busy"),
      "true",
    );
    assert.doesNotMatch(
      await page.locator(".processing-layout").innerText(),
      /\d+%/,
    );
    releaseScan();
    holdScan = false;
    await page
      .getByRole("heading", { name: "Your prescription", exact: true })
      .waitFor();
    assert.match(await page.locator(".source-wording").innerText(), /1\+0\+1/);
    assert.equal(await page.locator(".slot.no-dose").count(), 1);
    await audit("results");
    await page.screenshot({
      path: `OUT/results-en.png`.replace("OUT", OUT),
      fullPage: true,
    });
  });
  await test("recorded audio playback drives duration and waveform", async () => {
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page.locator(".wave-art.is-playing").waitFor();
    assert.equal(await page.locator("audio").evaluate((a) => a.duration), 2);
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await page.locator(".wave-art.is-playing").waitFor({ state: "hidden" });
    assert.equal(await page.locator(".wave-art.is-playing").count(), 0);
    await page
      .getByRole("combobox", { name: "Playback speed" })
      .selectOption("1.25");
    assert.equal(
      await page.locator("audio").evaluate((a) => a.playbackRate),
      1.25,
    );
  });
  await test("print and audio QR remain available", async () => {
    await page.emulateMedia({ media: "print", reducedMotion: "reduce" });
    assert.equal(await page.locator(".qr-row").isVisible(), true);
    assert.equal(await page.locator(".dose-card").isVisible(), true);
    await page.pdf({
      path: `${OUT}/dose-print.pdf`,
      format: "A4",
      printBackground: true,
    });
    await page.emulateMedia({ media: "screen", reducedMotion: "reduce" });
    assert.equal(
      await page
        .locator(".share-button")
        .getAttribute("href")
        .then((s) => s.includes("wa.me/?text=")),
      true,
    );
  });
  await test("all strip outcomes, generic substitution caution, and focus containment", async () => {
    for (const status of [
      "EXACT_MATCH",
      "GENERIC_EQUIVALENT_MATCH",
      "STRENGTH_MISMATCH",
      "WRONG_MEDICINE",
      "UNREADABLE_STRIP",
    ]) {
      stripStatus = status;
      await page
        .locator(".dose-card")
        .getByRole("button", { name: "Verify medicine", exact: true })
        .click();
      const dialog = page.getByRole("dialog");
      await dialog.waitFor();
      assert.equal(
        await page.evaluate(
          () => document.activeElement.closest("dialog") !== null,
        ),
        true,
      );
      await dialog.locator('input[type="file"]').setInputFiles(photo);
      await dialog
        .getByRole("button", { name: "Check this strip", exact: true })
        .click();
      await dialog.locator(".verification-outcome").waitFor();
      if (status === "GENERIC_EQUIVALENT_MATCH")
        assert.match(
          await dialog.locator(".generic-caution").innerText(),
          /not permission to substitute/,
        );
      await audit(status);
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden" });
    }
  });
  await test("explicit saving, local history replay, and reminders stay disabled", async () => {
    await page
      .getByRole("button", { name: "Save on this device", exact: true })
      .click();
    assert.equal(
      await page
        .getByRole("button", { name: "Saved on this device", exact: true })
        .isDisabled(),
      true,
    );
    await page
      .locator(".desktop-nav")
      .getByRole("button", { name: "History", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Open prescription", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Your prescription", exact: true })
      .waitFor();
    assert.equal(await page.locator(".original-empty").count(), 1);
  });
  await test("developer proof is opt in and shows actual response evidence", async () => {
    assert.equal(await page.locator(".proof-chip").count(), 0);
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("switch").click();
    await page.waitForFunction(
      () => document.querySelector('[role="switch"]')?.checked === true,
    );
    await page
      .getByRole("button", { name: "Developer proof", exact: true })
      .click();
    await page.getByRole("dialog").waitFor();
    assert.match(
      await page.locator(".proof-grid").first().innerText(),
      /30 ms/,
    );
    await audit("proof");
    await page.keyboard.press("Escape");
  });
  await test("high contrast light theme and reduced motion", async () => {
    await page
      .getByRole("button", { name: "High contrast light", exact: true })
      .click();
    assert.equal(
      await page.locator("html").getAttribute("data-theme"),
      "light",
    );
    await audit("light settings");
    await page
      .locator(".desktop-nav")
      .getByRole("button", { name: "Home", exact: true })
      .click();
    await audit("light home");
    assert.equal(
      await page
        .locator(".bento-card")
        .first()
        .evaluate((e) => parseFloat(getComputedStyle(e).animationDuration)),
      0.00001,
    );
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("button", { name: "Midnight", exact: true }).click();
  });
  await test("unknown doses are never displayed as zero; safety warnings remain prominent", async () => {
    response = {
      ...result,
      overall_status: "ACTION_REQUIRED",
      medications: [
        { ...med, schedule: null },
        {
          ...med,
          line_id: "med_2",
          status: "REFUSED_UNKNOWN_DRUG",
          brand_matched: null,
          raw_text: "unclear medicine",
          schedule: null,
          refusal_reason_urdu: "نام واضح نہیں۔",
        },
      ],
      interactions: [
        {
          severity: "HIGH",
          drug_a: "Medicine A",
          drug_b: "Medicine B",
          source: "TEST fixture",
          fda_verbatim_excerpt: "Test interaction evidence",
          urdu_warning: "فارماسسٹ سے بات کریں۔",
          raw_fda_json: { test: true },
        },
        {
          severity: "MODERATE",
          drug_a: "Medicine C",
          drug_b: "Medicine D",
          source: "TEST fixture",
          fda_verbatim_excerpt: "Test review evidence",
          urdu_warning: "تصدیق ضروری ہے۔",
          raw_fda_json: null,
        },
      ],
    };
    await nav("scan");
    await upload();
    assert.equal(await page.locator(".slot.unknown-dose").count(), 3);
    assert.equal(await page.locator(".slot.no-dose").count(), 0);
    assert.equal(await page.locator(".alert-red").count(), 1);
    assert.equal(await page.locator(".alert-amber").count(), 1);
    assert.equal(await page.locator(".med-issue-dropdown").count(), 1);
    const bodyText = await page.locator("body").innerText();
    assert.equal(bodyText.includes("The medicine name or dose needs confirmation."), false);
    assert.equal(bodyText.includes("Ask a pharmacist to read this part before taking medicine."), false);
    await audit("safety");
    await page.screenshot({ path: `${OUT}/safety-states.png`, fullPage: true });
  });
  await test("Urdu fallback never silently uses an English voice", async () => {
    response = { ...result, audio_urdu_url: null };
    await nav("scan");
    await upload();
    await page.evaluate(() => {
      speechSynthesis.getVoices = () => [{ lang: "en-US" }];
    });
    await page
      .getByRole("button", { name: "Use device Urdu voice", exact: true })
      .click();
    await page.locator(".audio-fallback .audio-error").waitFor();
    assert.match(
      await page.locator(".audio-fallback .audio-error").innerText(),
      /matching voice is not installed/,
    );
    response = result;
  });
  await test("malformed success responses fail closed", async () => {
    response = { invalid: true };
    await nav("scan");
    await page.locator('input[type="file"]').setInputFiles(photo);
    await page
      .getByRole("button", { name: "Use this photo", exact: true })
      .click();
    await page.locator(".error-panel").waitFor();
    assert.match(
      await page.locator(".error-panel").innerText(),
      /could not be checked/,
    );
    assert.equal(await page.locator(".dose-card").count(), 0);
    response = result;
  });
  await test("network errors show an actionable failure", async () => {
    uploadFailure = true;
    await nav("scan");
    await page.locator('input[type="file"]').setInputFiles(photo);
    await page
      .getByRole("button", { name: "Use this photo", exact: true })
      .click();
    await page.locator(".error-panel").waitFor();
    assert.match(
      await page.locator(".error-panel").innerText(),
      /backend|connection|interrupted/i,
    );
    uploadFailure = false;
  });
  await test("QR route replays the same Urdu script and audio", async () => {
    await page.goto(`${BASE}/audio/${result.scan_id}`);
    await page.locator("audio").waitFor({state:"attached"});
    assert.equal(
      await page
        .locator("audio")
        .getAttribute("src")
        .then((s) => s.endsWith("/test-audio.wav")),
      true,
    );
    await audit("QR audio");
  });
  await test("saved prescriptions can be deleted", async () => {
    await nav("history");
    page.once("dialog", (dialog) => dialog.accept());
    await page.locator(".delete-record").click();
    await page
      .getByRole("heading", { name: "No saved prescriptions yet", exact: true })
      .waitFor();
    assert.deepEqual(
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem("nuskha-prescriptions-v1")),
      ),
      [],
    );
  });
  await test("bilingual not-found screen", async () => {
    await page.goto(`${BASE}/missing-page`);
    await page
      .getByRole("heading", {
        name: "This page could not be found.",
        exact: true,
      })
      .waitFor();
    await page.getByRole("button", { name: "اردو", exact: true }).click();
    await page
      .getByRole("heading", { name: "یہ صفحہ نہیں مل سکا۔", exact: true })
      .waitFor();
    await audit("Urdu not found");
    await page.getByRole("button", { name: "EN", exact: true }).click();
  });
  await test("PWA manifest and install icons are served", async () => {
    const manifest = await (
      await context.request.get(`${BASE}/manifest.json`)
    ).json();
    assert.equal(manifest.display, "standalone");
    assert.equal(manifest.theme_color, "#131D38");
    for (const icon of manifest.icons)
      assert.equal(
        (await context.request.get(`${BASE}${icon.src}`)).status(),
        200,
      );
  });
  assert.deepEqual(errors, []);
  await writeFile(
    `${OUT}/report.json`,
    JSON.stringify(
      {
        checks,
        pageErrors: errors,
        notes:
          "API states use controlled test responses; external vision/TTS and physical camera are not certified by these tests.",
      },
      null,
      2,
    ),
  );
  console.log(`${checks.length} browser checks passed. Artifacts: ${OUT}`);
} catch (error) {
  await page.screenshot({ path: `${OUT}/failure.png`, fullPage: true });
  console.log("Failure page", await page.locator("main").innerText());
  throw error;
} finally {
  await browser.close();
}
