"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Volume2, Pause } from "lucide-react";
import { assetUrl } from "@/lib/api";
import { useLanguage, type Language } from "@/lib/i18n";
export function announceAudio(owner: string) {
  window.dispatchEvent(new CustomEvent("nuskha-play", { detail: owner }));
  window.speechSynthesis?.cancel();
}
export function speak(
  text: string,
  audioUrl?: string | null,
  language: Language = "ur",
) {
  if (typeof window === "undefined") return false;
  announceAudio("guidance");
  if (audioUrl) {
    const audio = new Audio(assetUrl(audioUrl));
    const stop = () => audio.pause();
    window.addEventListener("nuskha-play", stop, { once: true });
    audio.onended = () => window.removeEventListener("nuskha-play", stop);
    void audio
      .play()
      .catch(() => window.removeEventListener("nuskha-play", stop));
    return true;
  }
  const voice = window.speechSynthesis
    ?.getVoices()
    .find((v) => v.lang.toLowerCase().startsWith(language));
  if (!voice) return false;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = 0.88;
  window.speechSynthesis.speak(utterance);
  return true;
}
export default function SpeakerButton({
  text,
  audioUrl,
  label,
  language = "ur",
}: {
  text: string;
  audioUrl?: string | null;
  label?: string;
  language?: Language;
}) {
  const { t } = useLanguage();
  const id = useId();
  const audio = useRef<HTMLAudioElement | null>(null);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const stop = (e: Event) => {
      if ((e as CustomEvent).detail !== id) {
        audio.current?.pause();
        setPlaying(false);
      }
    };
    window.addEventListener("nuskha-play", stop);
    return () => {
      window.removeEventListener("nuskha-play", stop);
      audio.current?.pause();
      if (utterance.current) window.speechSynthesis?.cancel();
    };
  }, [id]);
  function play() {
    if (playing) {
      audio.current?.pause();
      window.speechSynthesis?.cancel();
      setPlaying(false);
      return;
    }
    setError("");
    announceAudio(id);
    if (audioUrl) {
      if (!audio.current) {
        const element = new Audio(assetUrl(audioUrl));
        element.onplaying = () => setPlaying(true);
        element.onpause = () => setPlaying(false);
        element.onended = () => setPlaying(false);
        element.onerror = () => {
          setPlaying(false);
          setError(t("audioFailed"));
        };
        audio.current = element;
      }
      void audio.current.play().catch(() => {
        setPlaying(false);
        setError(t("audioFailed"));
      });
    } else {
      const voice = window.speechSynthesis
        ?.getVoices()
        .find((v) => v.lang.toLowerCase().startsWith(language));
      if (!voice) {
        setError(t("noVoice"));
        return;
      }
      const speech = new SpeechSynthesisUtterance(text);
      speech.voice = voice;
      speech.lang = voice.lang;
      speech.rate = 0.88;
      speech.onstart = () => setPlaying(true);
      speech.onend = () => setPlaying(false);
      speech.onerror = () => setPlaying(false);
      utterance.current = speech;
      window.speechSynthesis.speak(speech);
    }
  }
  return (
    <span className="speaker-wrap">
      <button
        type="button"
        className="speaker"
        aria-label={playing ? t("pause") : label || t("listen")}
        title={label || t("listen")}
        aria-pressed={playing}
        onClick={play}
      >
        {playing ? <Pause size={20} /> : <Volume2 size={20} />}
        <span>{playing ? t("pause") : label || t("listen")}</span>
      </button>
      {error && (
        <span role="status" className="audio-error">
          {error}
        </span>
      )}
    </span>
  );
}
