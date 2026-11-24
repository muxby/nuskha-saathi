"use client";

import { Volume2 } from "lucide-react";
import { assetUrl } from "@/lib/api";

export function speak(text: string, audioUrl?: string | null) {
  if (typeof window === "undefined") return;
  window.speechSynthesis?.cancel();
  if (audioUrl) {
    const audio = new Audio(assetUrl(audioUrl));
    audio.play().catch(() => browserSpeak(text));
  } else browserSpeak(text);
}

function browserSpeak(text: string) {
  if (!window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ur-PK";
  utterance.rate = 0.88;
  window.speechSynthesis.speak(utterance);
}

export default function SpeakerButton({ text, audioUrl, label = "آواز میں سنیں" }: { text: string; audioUrl?: string | null; label?: string }) {
  return <button type="button" className="speaker" aria-label={label} title={label} onClick={() => speak(text, audioUrl)}><Volume2 size={20} aria-hidden="true" /><span>{label}</span></button>;
}
