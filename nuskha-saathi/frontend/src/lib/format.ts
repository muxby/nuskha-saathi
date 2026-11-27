/** Small display formatters shared by the dose card, day plan and cabinet. */

export type Lang = "en" | "ur";

/** `500` → "500 mg", `2.5` → "2.5 mg". Unknown strength returns an empty string. */
export function formatStrength(mg: number | null | undefined): string {
  if (mg == null || !Number.isFinite(mg) || mg <= 0) return "";
  const rounded = Math.round(mg * 100) / 100;
  return `${Number.isInteger(rounded) ? rounded : rounded.toString()} mg`;
}

const FRACTIONS: Record<string, string> = {
  "0.25": "¼",
  "0.5": "½",
  "0.75": "¾",
};

/** `1.5` → "1½", `0.5` → "½", `2` → "2". Invalid quantities return "?". */
export function formatQuantity(qty: number | null | undefined): string {
  if (qty == null || !Number.isFinite(qty) || qty < 0) return "?";
  const whole = Math.floor(qty);
  const rest = Math.round((qty - whole) * 100) / 100;
  if (rest === 0) return String(whole);
  const glyph = FRACTIONS[String(rest)];
  if (!glyph) return String(Math.round(qty * 100) / 100);
  return whole === 0 ? glyph : `${whole}${glyph}`;
}

/** Duration label. Unknown stays unknown: the app never invents a course length. */
export function formatDuration(days: number | null | undefined, lang: Lang): string {
  if (days == null || !Number.isFinite(days) || days <= 0) {
    return lang === "ur" ? "مدت معلوم نہیں" : "Duration not stated";
  }
  const whole = Math.round(days);
  if (lang === "ur") return `${whole} دن`;
  return whole === 1 ? "1 day" : `${whole} days`;
}

