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

