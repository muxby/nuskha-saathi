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

