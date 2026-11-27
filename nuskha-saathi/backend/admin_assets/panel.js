'use strict';

const $ = (id) => document.getElementById(id);
const node = (tag, text, cls) => {
  const element = document.createElement(tag);
  if (text != null) element.textContent = text;
  if (cls) element.className = cls;
  return element;
};

/* ---------- Language ---------- */

const TEXT = {
  en: {
    title: 'Backend monitor',
    subtitle: 'Live application diagnostics, self-tests and keep-awake.',
    signOut: 'Sign out',
    refresh: 'Refresh now',
    pause: 'Pause updates',
    resume: 'Resume updates',
    logs: 'Render logs ↗',
    testsTitle: 'Backend tests',
    testsBody: 'Quick checks run inside the server with no network calls and no cost. Live checks also send one test image to Gemini and one request to openFDA.',
    runQuick: 'Run quick checks',
    runLive: 'Run live checks',
    running: 'Running…',
    testsPassed: (p, t, ms) => `${p} of ${t} passed · ${ms} ms`,
    testsFailed: 'The test run could not be completed.',
    wakeTitle: 'Wake and keep awake',
    wakeBody: 'Free hosting puts the backend to sleep when idle, so the first scan after a quiet period is slow. Ping it before a demo, or keep it awake while this tab stays open.',
    pingNow: 'Ping backend now',
    pinging: 'Pinging…',
    keepAwakeOff: 'Keep awake: off',
    keepAwakeOn: 'Keep awake: on',
    awake: (ms) => `Awake · answered in ${ms} ms`,
    coldStart: (ms) => `Was asleep · woke in ${(ms / 1000).toFixed(1)} s`,
    noAnswer: 'No answer from the backend',
    lastPing: 'Last ping',
    pingCount: 'Pings this session',
    nextPing: 'Next automatic ping',
    never: 'Not yet',
    off: 'Off',
    configTitle: 'Service configuration',
    configBody: 'Configured means enabled in the environment. Use the live checks above to prove a provider actually answers.',
    activeTitle: 'In progress',
    recentTitle: 'Recent API requests',
    recentBody: 'Select a request to inspect stages. A safety refusal is a clinical outcome; a failed stage is a technical issue.',
    footer: 'Refreshes every 10 seconds while this tab is visible. History is limited to 100 requests on this process and resets on restart. No patient content, images, query strings or API keys are retained here. This panel cannot detect an outage while the backend itself is unreachable; connection failures are shown from this browser.',
    connecting: 'Connecting…',
    connected: 'Connected',
    unreachable: 'Unreachable / stale data',
    lastChecked: 'Last checked',
    lastSuccess: 'Last success',
    noSuccess: 'No successful response yet',
    application: 'Application',
    healthy: 'Healthy',
    degraded: 'Degraded',
    commit: 'Deployed commit',
    uptime: 'Process uptime',
    roundTrip: 'Status round trip',
    model: 'Vision model',
    started: 'Started',
    yes: 'yes',
    no: 'no',
    cap: {
      vision_configured: 'Gemini configured',
      tts_configured: 'Urdu voice configured',
      openfda_live: 'openFDA live enabled',
      whatsapp_configured: 'WhatsApp configured',
    },
    noActive: 'No active API requests.',
    processing: 'Processing request',
    counts: (r, f) => `${r} requests · ${f} HTTP errors since restart`,
    noRequests: 'No API requests observed since this process started. Health checks and this panel are excluded.',
    requestId: 'Request ID',
    cols: ['Stage', 'Result', 'Time', 'Category'],
    noStages: 'No pipeline stages recorded for this route.',
    checks: {},
  },
  ur: {
    title: 'بیک اینڈ کی نگرانی',
    subtitle: 'ایپلیکیشن کی براہِ راست جانچ، خودکار ٹیسٹ اور سرور کو جگائے رکھنا۔',
    signOut: 'سائن آؤٹ',
    refresh: 'ابھی تازہ کریں',
    pause: 'تازہ کاری روکیں',
    resume: 'تازہ کاری جاری کریں',
    logs: 'رینڈر لاگز ↗',
    testsTitle: 'بیک اینڈ کے ٹیسٹ',
    testsBody: 'فوری جانچ سرور کے اندر چلتی ہے، نہ انٹرنیٹ استعمال ہوتا ہے نہ کوئی خرچ آتا ہے۔ براہِ راست جانچ میں ایک آزمائشی تصویر جیمنائی کو اور ایک درخواست اوپن ایف ڈی اے کو بھی جاتی ہے۔',
    runQuick: 'فوری جانچ چلائیں',
    runLive: 'براہِ راست جانچ چلائیں',
    running: 'جانچ جاری ہے…',
    testsPassed: (p, t, ms) => `${t} میں سے ${p} کامیاب · ${ms} ms`,
    testsFailed: 'جانچ مکمل نہیں ہو سکی۔',
    wakeTitle: 'سرور کو جگائیں اور جگائے رکھیں',
    wakeBody: 'مفت ہوسٹنگ پر سرور فارغ رہنے پر سو جاتا ہے، اس لیے وقفے کے بعد پہلا اسکین سست ہوتا ہے۔ ڈیمو سے پہلے اسے جگا لیں، یا جب تک یہ ٹیب کھلا ہے اسے جگائے رکھیں۔',
    pingNow: 'سرور کو ابھی جگائیں',
    pinging: 'رابطہ ہو رہا ہے…',
    keepAwakeOff: 'جگائے رکھنا: بند',
    keepAwakeOn: 'جگائے رکھنا: چالو',
    awake: (ms) => `سرور جاگ رہا ہے · جواب ${ms} ms میں ملا`,
    coldStart: (ms) => `سرور سویا ہوا تھا · ${(ms / 1000).toFixed(1)} سیکنڈ میں جاگا`,
    noAnswer: 'سرور سے کوئی جواب نہیں ملا',
    lastPing: 'آخری رابطہ',
    pingCount: 'اس نشست میں رابطے',
    nextPing: 'اگلا خودکار رابطہ',
    never: 'ابھی نہیں',
    off: 'بند',
    configTitle: 'سروس کی ترتیبات',
    configBody: 'ترتیب شدہ کا مطلب ہے کہ ماحول میں فعال ہے۔ فراہم کنندہ واقعی جواب دیتا ہے یا نہیں، یہ اوپر کی براہِ راست جانچ سے معلوم کریں۔',
    activeTitle: 'جاری درخواستیں',
    recentTitle: 'حالیہ درخواستیں',
    recentBody: 'مراحل دیکھنے کے لیے کوئی درخواست منتخب کریں۔ حفاظتی انکار ایک طبی نتیجہ ہے؛ ناکام مرحلہ تکنیکی خرابی ہے۔',
    footer: 'جب تک یہ ٹیب سامنے ہے، ہر 10 سیکنڈ بعد تازہ ہوتا ہے۔ تاریخ صرف 100 درخواستوں تک محدود ہے اور سرور دوبارہ چلنے پر صاف ہو جاتی ہے۔ یہاں مریض کا کوئی مواد، تصویر یا خفیہ کلید محفوظ نہیں ہوتی۔ اگر سرور خود بند ہو تو یہ صفحہ اس کا پتہ نہیں لگا سکتا؛ رابطے کی ناکامی اسی براؤزر سے دکھائی جاتی ہے۔',
    connecting: 'رابطہ ہو رہا ہے…',
    connected: 'رابطہ قائم ہے',
    unreachable: 'رابطہ نہیں / پرانا ڈیٹا',
    lastChecked: 'آخری جانچ',
    lastSuccess: 'آخری کامیابی',
    noSuccess: 'ابھی تک کوئی کامیاب جواب نہیں',
    application: 'ایپلیکیشن',
    healthy: 'ٹھیک ہے',
    degraded: 'خرابی ہے',
    commit: 'چالو ورژن',
    uptime: 'چلنے کا دورانیہ',
    roundTrip: 'جواب کا وقت',
    model: 'تصویر پڑھنے والا ماڈل',
    started: 'آغاز',
    yes: 'ہاں',
    no: 'نہیں',
    cap: {
      vision_configured: 'جیمنائی ترتیب شدہ',
      tts_configured: 'اردو آواز ترتیب شدہ',
      openfda_live: 'اوپن ایف ڈی اے براہِ راست',
      whatsapp_configured: 'واٹس ایپ ترتیب شدہ',
    },
    noActive: 'کوئی درخواست جاری نہیں۔',
    processing: 'درخواست پر کام جاری ہے',
    counts: (r, f) => `${r} درخواستیں · دوبارہ چلنے کے بعد ${f} خرابیاں`,
    noRequests: 'سرور چلنے کے بعد سے کوئی درخواست نہیں آئی۔ صحت کی جانچ اور یہ صفحہ شمار نہیں ہوتے۔',
    requestId: 'درخواست کی شناخت',
    cols: ['مرحلہ', 'نتیجہ', 'وقت', 'قسم'],
    noStages: 'اس راستے کے لیے کوئی مرحلہ درج نہیں۔',
    checks: {
      datasets: 'طبی ڈیٹا',
      formulary: 'برانڈ سے جزو کی پہچان',
      locks: 'حفاظتی انکار کے تالے',
      interactions: 'آف لائن تعامل کا ذخیرہ',
      storage: 'ڈیٹا بیس میں لکھنا اور پڑھنا',
      vision: 'جیمنائی سے تصویر پڑھنا (1 درخواست)',
      openfda: 'اوپن ایف ڈی اے براہِ راست',
    },
  },
};

let language = 'en';
try {
  if (localStorage.getItem('nuskha-admin-language') === 'ur') language = 'ur';
} catch { /* storage unavailable */ }
const t = () => TEXT[language];

function applyLanguage() {
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'ur' ? 'rtl' : 'ltr';
  for (const element of document.querySelectorAll('[data-i18n]')) {
    const value = t()[element.dataset.i18n];
    if (typeof value === 'string') element.textContent = value;
  }
  $('lang-en').setAttribute('aria-pressed', String(language === 'en'));
  $('lang-ur').setAttribute('aria-pressed', String(language === 'ur'));
  $('pause').textContent = paused ? t().resume : t().pause;
  $('keep-awake').textContent = keepAwake ? t().keepAwakeOn : t().keepAwakeOff;
  if (lastStatus) render(lastStatus.data, lastStatus.latency);
  if (lastTests) renderTests(lastTests);
  renderWake();
  renderConnection();
}

function setLanguage(next) {
  language = next;
  try { localStorage.setItem('nuskha-admin-language', next); } catch { /* ignore */ }
  applyLanguage();
}

/* ---------- Status ---------- */

let paused = false;
let busy = false;
let lastSuccess = null;
let lastStatus = null;
let connection = 'connecting';

function card(label, value, cls) {
  const element = node('div', null, 'card');
  element.append(node('div', label, 'label'), node('div', value, `value ${cls || ''} ltr`));
  return element;
}

function render(data, latency) {
  const healthy = data.health.status === 'ok';
  $('cards').replaceChildren(
    card(t().application, healthy ? t().healthy : t().degraded, healthy ? 'good' : 'bad'),
    card(t().commit, String(data.commit).slice(0, 12)),
    card(t().uptime, `${Math.floor(data.uptime_seconds / 3600)}h ${Math.floor(data.uptime_seconds / 60) % 60}m`),
    card(t().roundTrip, `${Math.round(latency)} ms`),
    card(t().model, data.vision_model || '—'),
    node('div', `API v${data.version} · ${t().started} ${new Date(data.started_at).toLocaleString()}`, 'card muted'),
  );

  $('capabilities').replaceChildren();
  for (const [key, label] of Object.entries(t().cap)) {
    const on = Boolean(data.health.capabilities?.[key]);
    $('capabilities').append(node('span', `${label}: ${on ? t().yes : t().no}`, `badge ${on ? 'on' : 'off'}`));
  }

  $('active').replaceChildren();
  if (!data.active.length) $('active').append(node('p', t().noActive, 'muted'));
  for (const request of data.active) {
    $('active').append(node('p', `${request.id.slice(0, 12)} · ${request.active_stage || t().processing}`));
  }

  $('counts').textContent = t().counts(data.requests, data.http_failures);
  const opened = new Set([...$('requests').querySelectorAll('details[open]')].map((d) => d.dataset.id));
  $('requests').replaceChildren();
  if (!data.recent.length) $('requests').append(node('p', t().noRequests, 'empty'));
  for (const request of data.recent) {
    const details = document.createElement('details');
    details.dataset.id = request.id;
    details.open = opened.has(request.id);
    const summary = document.createElement('summary');
    const failed = request.status >= 400 || request.stages.some((s) => s.status === 'failed');
    summary.append(
      node('strong', String(request.status), failed ? 'bad' : 'good'),
      node('code', `${request.method} ${request.route}`),
      node('span', `${request.ms} ms`, 'ltr'),
      node('span', new Date(request.at).toLocaleTimeString(), 'muted'),
    );
    details.append(summary, node('div', `${t().requestId}: ${request.id}`, 'trace'));
    if (request.stages.length) {
      const table = document.createElement('table');
      const head = document.createElement('tr');
      for (const heading of t().cols) head.append(node('th', heading));
      table.append(head);
      for (const stage of request.stages) {
        const row = document.createElement('tr');
        row.append(
          node('td', stage.name, 'ltr'),
          node('td', stage.status, stage.status === 'failed' ? 'bad ltr' : 'ltr'),
          node('td', `${stage.ms} ms`, 'ltr'),
          node('td', stage.error || '—', 'ltr'),
        );
        table.append(row);
      }
      details.append(table);
    } else {
      details.append(node('p', t().noStages, 'muted'));
    }
    $('requests').append(details);
  }
}

function renderConnection() {
  const element = $('connection');
  element.textContent = t()[connection];
  element.className = connection === 'connected' ? 'good' : connection === 'unreachable' ? 'bad' : '';
  $('checked').textContent = connection === 'connected'
    ? `${t().lastChecked} ${lastSuccess.toLocaleTimeString()}`
    : connection === 'unreachable'
      ? (lastSuccess ? `${t().lastSuccess} ${lastSuccess.toLocaleTimeString()}` : t().noSuccess)
      : '';
}

async function refresh() {
  if (busy) return;
  busy = true;
  $('refresh').disabled = true;
  const start = performance.now();
  try {
    const response = await fetch('/admin/api/status', { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (response.status === 401) { location.replace('/admin'); return; }
    if (!response.ok) throw new Error('Status unavailable');
    const data = await response.json();
    lastStatus = { data, latency: performance.now() - start };
    render(lastStatus.data, lastStatus.latency);
    lastSuccess = new Date();
    connection = 'connected';
  } catch {
    connection = 'unreachable';
  } finally {
    renderConnection();
    busy = false;
    $('refresh').disabled = false;
  }
}

/* ---------- Backend tests ---------- */

let lastTests = null;

function renderTests(result) {
  const summary = $('test-summary');
  if (result.error) {
    summary.textContent = t().testsFailed;
    summary.className = 'bad';
    $('test-results').replaceChildren();
    return;
  }
  summary.textContent = t().testsPassed(result.passed, result.total, Math.round(result.ms));
  summary.className = result.ok ? 'good' : 'bad';
  const list = node('ul', null, 'checks');
  for (const check of result.checks) {
    const item = node('li', null, `check ${check.ok ? 'pass' : 'fail'}`);
    const text = node('div');
    text.append(node('div', t().checks[check.name] || check.label, 'name'), node('div', check.detail, 'detail ltr'));
    item.append(node('span', check.ok ? '✓' : '✕', `mark ${check.ok ? 'good' : 'bad'}`), text, node('span', `${check.ms} ms`, 'ms'));
    list.append(item);
  }
  $('test-results').replaceChildren(list);
}

async function runTests(live) {
  const buttons = [$('run-quick'), $('run-live')];
  for (const button of buttons) button.disabled = true;
  $('test-summary').textContent = t().running;
  $('test-summary').className = '';
  try {
    const response = await fetch(`/admin/api/selftest${live ? '?live=1' : ''}`, {
      method: 'POST',
      cache: 'no-store',
      signal: AbortSignal.timeout(90000),
    });
    if (response.status === 401) { location.replace('/admin'); return; }
    if (!response.ok) throw new Error('Self-test unavailable');
    lastTests = await response.json();
  } catch {
    lastTests = { error: true };
  } finally {
    renderTests(lastTests);
    for (const button of buttons) button.disabled = false;
    refresh();
  }
}

/* ---------- Wake and keep awake ---------- */

const KEEP_AWAKE_MS = 4 * 60 * 1000; // free instances sleep after ~15 idle minutes
const COLD_START_MS = 4000;
let keepAwake = false;
let keepTimer = null;
let nextPingAt = null;
let lastPing = null;
let pingCount = 0;
try { keepAwake = localStorage.getItem('nuskha-admin-keep-awake') === '1'; } catch { /* ignore */ }

function renderWake() {
  const state = $('wake-state');
  if (lastPing) {
    state.textContent = !lastPing.ok
      ? t().noAnswer
      : lastPing.ms > COLD_START_MS ? t().coldStart(lastPing.ms) : t().awake(Math.round(lastPing.ms));
    state.className = !lastPing.ok ? 'bad' : lastPing.ms > COLD_START_MS ? 'warn' : 'good';
  } else {
    state.textContent = '';
  }
  $('wake-cards').replaceChildren(
    card(t().lastPing, lastPing ? lastPing.at.toLocaleTimeString() : t().never),
    card(t().pingCount, String(pingCount)),
    card(t().nextPing, keepAwake && nextPingAt ? nextPingAt.toLocaleTimeString() : t().off),
  );
}

async function ping() {
  $('ping').disabled = true;
  $('wake-state').textContent = t().pinging;
  $('wake-state').className = '';
  const start = performance.now();
  let ok = false;
  try {
    // A sleeping instance can take most of a minute to answer its first request.
    const response = await fetch('/health', { cache: 'no-store', signal: AbortSignal.timeout(75000) });
    ok = response.ok;
  } catch { ok = false; }
  lastPing = { ok, ms: performance.now() - start, at: new Date() };
  pingCount += 1;
  $('ping').disabled = false;
  renderWake();
}

function scheduleKeepAwake() {
  clearInterval(keepTimer);
  keepTimer = null;
  nextPingAt = null;
  if (keepAwake) {
    nextPingAt = new Date(Date.now() + KEEP_AWAKE_MS);
    keepTimer = setInterval(() => {
      nextPingAt = new Date(Date.now() + KEEP_AWAKE_MS);
      ping();
    }, KEEP_AWAKE_MS);
  }
  $('keep-awake').setAttribute('aria-pressed', String(keepAwake));
  $('keep-awake').textContent = keepAwake ? t().keepAwakeOn : t().keepAwakeOff;
  renderWake();
}

/* ---------- Wiring ---------- */

$('lang-en').addEventListener('click', () => setLanguage('en'));
$('lang-ur').addEventListener('click', () => setLanguage('ur'));
$('refresh').addEventListener('click', refresh);
$('pause').addEventListener('click', () => {
  paused = !paused;
  $('pause').textContent = paused ? t().resume : t().pause;
  $('pause').setAttribute('aria-pressed', String(paused));
  if (!paused) refresh();
});
$('run-quick').addEventListener('click', () => runTests(false));
$('run-live').addEventListener('click', () => runTests(true));
$('ping').addEventListener('click', ping);
$('keep-awake').addEventListener('click', () => {
  keepAwake = !keepAwake;
  try { localStorage.setItem('nuskha-admin-keep-awake', keepAwake ? '1' : '0'); } catch { /* ignore */ }
  scheduleKeepAwake();
  if (keepAwake) ping();
});
document.addEventListener('visibilitychange', () => { if (!document.hidden && !paused) refresh(); });
setInterval(() => { if (!paused && !document.hidden) refresh(); }, 10000);

applyLanguage();
scheduleKeepAwake();
refresh();
