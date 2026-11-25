"use client";

import { Volume2 } from "lucide-react";
import { assetUrl } from "@/lib/api";

export function speak(text: string, audioUrl?: string | null, language: "en" | "ur" = "ur") {
  if (typeof window === "undefined") return false;
  window.speechSynthesis?.cancel();
  if (audioUrl) {
    const audio = new Audio(assetUrl(audioUrl));
    audio.play().catch(() => browserSpeak(text, language));
    return true;
  } else return browserSpeak(text, language);
}

function browserSpeak(text: string, language: "en" | "ur" = "ur") {
  if (!window.speechSynthesis) return false;
  const voice = window.speechSynthesis.getVoices().find(v => v.lang.toLowerCase().startsWith(language));
  if (!voice) return false;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voice.lang;
  utterance.voice = voice;
  utterance.rate = 0.88;
  window.speechSynthesis.speak(utterance);
  return true;
}

export default function SpeakerButton({ text, audioUrl, label = "آواز میں سنیں" }: { text: string; audioUrl?: string | null; label?: string }) {
  return <button type="button" className="speaker" aria-label={label} title={label} onClick={() => speak(text, audioUrl)}><Volume2 size={20} aria-hidden="true" /><span>{label}</span></button>;
}
