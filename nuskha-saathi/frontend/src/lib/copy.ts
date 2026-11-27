import type { Language } from "@/lib/i18n";

/**
 * Feature-level copy. Each block holds English and Urdu side by side so a
 * missing translation is a type error rather than a silent English fallback.
 */
export type Bilingual<T> = { en: T; ur: T };

export function pick<T>(copy: Bilingual<T>, language: Language): T {
  return copy[language];
}

