/** Small display formatters shared by the dose card, day plan and cabinet. */

export type Lang = "en" | "ur";

/** `500` → "500 mg", `2.5` → "2.5 mg". Unknown strength returns an empty string. */
export function formatStrength(mg: number | null | undefined): string {
  if (mg == null || !Number.isFinite(mg) || mg <= 0) return "";
  const rounded = Math.round(mg * 100) / 100;
  return `${Number.isInteger(rounded) ? rounded : rounded.toString()} mg`;
}

