/**
 * Script detection for clinical strings.
 *
 * The safety engine speaks Roman Urdu (Latin letters) while the interface can
 * be Urdu script. Rendering Latin text right-to-left flips punctuation and
 * makes warnings hard to read, so every clinical string picks its direction
 * from its own characters, never from the page.
 */

const ARABIC_SCRIPT = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/g;
const LATIN_LETTER = /[A-Za-z]/g;

export type TextScript = "arabic" | "latin" | "neutral";

function count(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

/** Dominant script of a string. Digits and punctuation alone are neutral. */
export function detectScript(text: string | null | undefined): TextScript {
  if (!text) return "neutral";
  const arabic = count(text, ARABIC_SCRIPT);
  const latin = count(text, LATIN_LETTER);
  if (arabic === 0 && latin === 0) return "neutral";
  return arabic >= latin ? "arabic" : "latin";
}

/** Direction a string must be laid out in, independent of the page. */
export function textDirection(text: string | null | undefined): "rtl" | "ltr" {
  return detectScript(text) === "arabic" ? "rtl" : "ltr";
}

