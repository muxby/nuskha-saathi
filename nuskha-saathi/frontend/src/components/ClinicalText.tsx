"use client";
import { useLanguage } from "@/lib/i18n";
import { textDirection, urduLangTag } from "@/lib/textScript";
import { displayUrdu } from "@/lib/urduPhrases";

/**
 * Renders an engine-authored Urdu string in the direction its own script
 * needs. Roman Urdu lays out left-to-right in the interface face; Urdu script
 * lays out right-to-left in Nastaliq. In the Urdu interface, fixed engine
 * lines are shown in Urdu script.
 */
export default function ClinicalText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const { language } = useLanguage();
  const shown = displayUrdu(text, language);
  const dir = textDirection(shown);
  return (
    <p
      className={`backend-urdu clinical-text ${className}`.trim()}
      lang={urduLangTag(shown)}
      dir={dir}
      data-script={dir === "rtl" ? "urdu" : "roman"}
    >
      {shown}
    </p>
  );
}
