import type { ReactNode } from "react";
import { textDirection, urduLangTag } from "@/lib/textScript";

/**
 * Renders an engine-authored Urdu string in the direction its own script
 * needs. Roman Urdu lays out left-to-right in the interface face; Urdu script
 * lays out right-to-left in Nastaliq.
 */
export default function ClinicalText({
  children,
  text,
  className = "",
}: {
  text: string;
  children?: ReactNode;
  className?: string;
}) {
  const dir = textDirection(text);
  return (
    <p
      className={`backend-urdu clinical-text ${className}`.trim()}
      lang={urduLangTag(text)}
      dir={dir}
      data-script={dir === "rtl" ? "urdu" : "roman"}
    >
      {children ?? text}
    </p>
  );
}
