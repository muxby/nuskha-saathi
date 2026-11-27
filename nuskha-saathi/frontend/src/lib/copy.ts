import type { Language } from "@/lib/i18n";

/**
 * Feature-level copy. Each block holds English and Urdu side by side so a
 * missing translation is a type error rather than a silent English fallback.
 */
export type Bilingual<T> = { en: T; ur: T };

export function pick<T>(copy: Bilingual<T>, language: Language): T {
  return copy[language];
}

export const summaryCopy = {
  en: {
    eyebrow: "Safety check result",
    stop: "Stop. Speak to your doctor before taking these together.",
    ask: "Ask a pharmacist before you start.",
    clear: "Every line matched the medicine list.",
    empty: "No medicine line could be read.",
    stopBody: "A serious interaction was found. The warning below shows the source wording.",
    askBody: "Parts of this prescription could not be confirmed. Nothing uncertain is shown as a dose.",
    clearBody: "No interaction was found in the checked sources. Keep following your clinician's instructions.",
    emptyBody: "Retake the photo in good light with the whole prescription in frame.",
    linesRead: "Lines read",
    matched: "Matched",
    needConfirmation: "Need confirmation",
    warnings: "Warnings",
    proportion: "Matched and unconfirmed lines",
  },
  ur: {
    eyebrow: "حفاظتی جانچ کا نتیجہ",
    stop: "رکیے۔ یہ دوائیں ایک ساتھ لینے سے پہلے ڈاکٹر سے بات کریں۔",
    ask: "دوا شروع کرنے سے پہلے فارماسسٹ سے پوچھیں۔",
    clear: "ہر سطر دواؤں کی فہرست سے مل گئی۔",
    empty: "کوئی دوا کی سطر پڑھی نہیں جا سکی۔",
    stopBody: "ایک سنگین تعامل ملا ہے۔ نیچے دی گئی تنبیہ میں ماخذ کے الفاظ موجود ہیں۔",
    askBody: "اس نسخے کے کچھ حصوں کی تصدیق نہیں ہو سکی۔ غیر یقینی چیز خوراک کے طور پر نہیں دکھائی گئی۔",
    clearBody: "جانچے گئے ماخذ میں کوئی تعامل نہیں ملا۔ اپنے معالج کی ہدایات پر عمل جاری رکھیں۔",
    emptyBody: "اچھی روشنی میں پورا نسخہ فریم میں رکھ کر دوبارہ تصویر لیں۔",
    linesRead: "پڑھی گئی سطریں",
    matched: "مل گئیں",
    needConfirmation: "تصدیق درکار",
    warnings: "تنبیہات",
    proportion: "مل جانے والی اور غیر مصدقہ سطریں",
  },
} satisfies Bilingual<Record<string, string>>;

export const dayPlanCopy = {
  en: {
    eyebrow: "Your day",
    title: "When to take each medicine",
    morning: "Morning",
    afternoon: "Afternoon",
    night: "Night",
    nothing: "Nothing scheduled",
    before_food: "before food",
    after_food: "after food",
    any: "",
    hidden: (n: number) =>
      n === 1
        ? "1 line is not shown here because it needs confirmation."
        : `${n} lines are not shown here because they need confirmation.`,
    untimed: "Timing not confirmed",
    untimedBody: "Ask your pharmacist when to take:",
    perDay: (n: number) => (n === 1 ? "1 dose a day" : `${n} doses a day`),
  },
  ur: {
    eyebrow: "آپ کا دن",
    title: "ہر دوا کب لینی ہے",
    morning: "صبح",
    afternoon: "دوپہر",
    night: "رات",
    nothing: "کوئی خوراک نہیں",
    before_food: "کھانے سے پہلے",
    after_food: "کھانے کے بعد",
    any: "",
    hidden: (n: number) =>
      n === 1
        ? "1 سطر یہاں نہیں دکھائی گئی کیونکہ اس کی تصدیق درکار ہے۔"
        : `${n} سطریں یہاں نہیں دکھائی گئیں کیونکہ ان کی تصدیق درکار ہے۔`,
    untimed: "وقت کی تصدیق نہیں ہوئی",
    untimedBody: "فارماسسٹ سے پوچھیں کہ یہ کب لینی ہے:",
    perDay: (n: number) => `دن میں ${n} خوراکیں`,
  },
};

export const statusCopy = {
  en: {
    offline: "You are offline. Saved prescriptions and demo cases still work.",
    backOnline: "Back online.",
    install: "Install app",
    installHint: "Add Nuskha Saathi to your home screen for one-tap scanning.",
    notNow: "Not now",
  },
  ur: {
    offline: "آپ آف لائن ہیں۔ محفوظ نسخے اور ڈیمو کیس اب بھی کام کرتے ہیں۔",
    backOnline: "انٹرنیٹ بحال ہو گیا۔",
    install: "ایپ انسٹال کریں",
    installHint: "ایک ٹیپ میں اسکین کے لیے نسخہ ساتھی کو ہوم اسکرین پر شامل کریں۔",
    notNow: "ابھی نہیں",
  },
} satisfies Bilingual<Record<string, string>>;

export const cabinetCopy = {
  en: {
    suggestions: "Matching medicines",
    noMatch: "No medicine with this name is in the list. Check the spelling on the strip.",
    courseProgress: "Course calendar",
    day3: "Day 3 or later: keep taking the antibiotic for the full course your doctor wrote.",
    clearAll: "Clear all",
    clearConfirm: "Remove every medicine from this list?",
    cleared: "Your regular medicines list was cleared.",
  },
  ur: {
    suggestions: "ملتی جلتی دوائیں",
    noMatch: "اس نام کی کوئی دوا فہرست میں نہیں۔ پٹی پر لکھے ہجے دیکھیں۔",
    courseProgress: "کورس کا کیلنڈر",
    day3: "تیسرا دن یا اس کے بعد: اینٹی بایوٹک اتنے ہی دن جاری رکھیں جتنے ڈاکٹر نے لکھے ہیں۔",
    clearAll: "سب ہٹائیں",
    clearConfirm: "کیا اس فہرست سے تمام دوائیں ہٹا دیں؟",
    cleared: "آپ کی باقاعدہ دواؤں کی فہرست صاف کر دی گئی۔",
  },
} satisfies Bilingual<Record<string, string>>;
export const connectionCopy = {
  en: {
    checking: "Checking the safety engine…",
    ready: "Connected to the safety engine.",
    noApiUrl: "This app is not connected to a server.",
    noApiUrlBody:
      "The site was built without a server address. Live scanning cannot work until it is set. Demo cases still work.",
    unreachable: "The server is not answering.",
    unreachableBody:
      "It may be waking up, or your internet may be down. Wait a few seconds and check again. Demo cases still work.",
    readerOff: "Live reading is switched off on the server.",
    readerOffBody:
      "The server is running but has no reading key, so photos cannot be analysed yet. Demo cases still work.",
    retry: "Check again",
    tryDemo: "Open demo cases",
    server: "Server",
  },
  ur: {
    checking: "حفاظتی نظام سے رابطہ جانچا جا رہا ہے…",
    ready: "حفاظتی نظام سے رابطہ قائم ہے۔",
    noApiUrl: "یہ ایپ کسی سرور سے منسلک نہیں ہے۔",
    noApiUrlBody:
      "ویب سائٹ سرور کے پتے کے بغیر بنائی گئی ہے۔ جب تک پتہ درج نہ ہو، براہِ راست اسکین کام نہیں کرے گا۔ ڈیمو کیس اب بھی چلتے ہیں۔",
    unreachable: "سرور جواب نہیں دے رہا۔",
    unreachableBody:
      "ممکن ہے سرور ابھی شروع ہو رہا ہو یا آپ کا انٹرنیٹ بند ہو۔ چند سیکنڈ انتظار کر کے دوبارہ جانچیں۔ ڈیمو کیس اب بھی چلتے ہیں۔",
    readerOff: "سرور پر نسخہ پڑھنے کی سہولت بند ہے۔",
    readerOffBody:
      "سرور چل رہا ہے مگر پڑھنے کی کلید موجود نہیں، اس لیے تصویر کا تجزیہ ابھی ممکن نہیں۔ ڈیمو کیس اب بھی چلتے ہیں۔",
    retry: "دوبارہ جانچیں",
    tryDemo: "ڈیمو کیس کھولیں",
    server: "سرور",
  },
} satisfies Bilingual<Record<string, string>>;

export const visionCopy = {
  en: {
    serviceTitle: "Your photo was not read. This is not a problem with your photo.",
    serviceBody:
      "The reading service did not answer, so nothing below describes your prescription. Try again in a moment.",
    notConfiguredTitle: "Live reading is not set up on the server.",
    notConfiguredBody:
      "Your photo was not analysed. Nothing below describes your prescription. You can still open the demo cases.",
    invalidTitle: "This file could not be opened as a photo.",
    invalidBody: "Take a new photo with the camera, or choose a JPEG or PNG image.",
    retry: "Try again",
    rateLimited: "Too many scans in a short time. Wait one minute, then try again.",
    timeout: "The server took too long to answer. Check your connection and try again.",
  },
  ur: {
    serviceTitle: "آپ کی تصویر پڑھی نہیں گئی۔ یہ آپ کی تصویر کی خرابی نہیں ہے۔",
    serviceBody:
      "پڑھنے والی سروس نے جواب نہیں دیا، اس لیے نیچے دی گئی کوئی چیز آپ کے نسخے کے بارے میں نہیں ہے۔ تھوڑی دیر بعد دوبارہ کوشش کریں۔",
    notConfiguredTitle: "سرور پر نسخہ پڑھنے کی سہولت ترتیب نہیں دی گئی۔",
    notConfiguredBody:
      "آپ کی تصویر کا تجزیہ نہیں ہوا۔ نیچے دی گئی کوئی چیز آپ کے نسخے کے بارے میں نہیں ہے۔ آپ ڈیمو کیس کھول سکتے ہیں۔",
    invalidTitle: "یہ فائل تصویر کے طور پر نہیں کھل سکی۔",
    invalidBody: "کیمرے سے نئی تصویر لیں، یا JPEG یا PNG تصویر منتخب کریں۔",
    retry: "دوبارہ کوشش کریں",
    rateLimited: "کم وقت میں بہت زیادہ اسکین ہو گئے۔ ایک منٹ انتظار کر کے دوبارہ کوشش کریں۔",
    timeout: "سرور نے جواب دینے میں بہت دیر کی۔ اپنا انٹرنیٹ دیکھ کر دوبارہ کوشش کریں۔",
  },
} satisfies Bilingual<Record<string, string>>;
export const adminCopy = {
  en: {
    eyebrow: "Private backend panel",
    waking: "Waking the backend…",
    wakingBody: "A sleeping server can take up to a minute to answer its first request. This page keeps trying.",
    awake: "The backend is awake.",
    awakeBody: (s: number) => `It answered in ${s} second${s === 1 ? "" : "s"}. Opening the panel sign-in.`,
    failed: "The backend did not answer.",
    failedBody: "It may still be starting, or the server address may be wrong. Try again in a moment.",
    seconds: "seconds",
    retry: "Try again",
    open: "Open the panel",
    server: "Server",
  },
  ur: {
    eyebrow: "بیک اینڈ کا نجی پینل",
    waking: "سرور کو جگایا جا رہا ہے…",
    wakingBody: "سویا ہوا سرور پہلی درخواست کا جواب دینے میں ایک منٹ تک لے سکتا ہے۔ یہ صفحہ کوشش جاری رکھتا ہے۔",
    awake: "سرور جاگ گیا ہے۔",
    awakeBody: (s: number) => `اس نے ${s} سیکنڈ میں جواب دیا۔ پینل کا سائن اِن کھل رہا ہے۔`,
    failed: "سرور نے جواب نہیں دیا۔",
    failedBody: "ممکن ہے سرور ابھی شروع ہو رہا ہو یا اس کا پتہ غلط ہو۔ تھوڑی دیر بعد دوبارہ کوشش کریں۔",
    seconds: "سیکنڈ",
    retry: "دوبارہ کوشش کریں",
    open: "پینل کھولیں",
    server: "سرور",
  },
};
