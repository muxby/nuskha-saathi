"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Volume2, Pause } from "lucide-react";
import { assetUrl, urduSpeechUrl } from "@/lib/api";
import { useLanguage, type Language } from "@/lib/i18n";

// A few silent samples. Starting them inside the tap keeps the audio element
// allowed to play once the Urdu voice has loaded, which phones require.
const SILENCE =
  "data:audio/wav;base64,UklGRiwAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQgAAACAgICAgICAgA==";

export function announceAudio(owner: string) {
  window.dispatchEvent(new CustomEvent("nuskha-play", { detail: owner }));
  window.speechSynthesis?.cancel();
}

function primedAudio(): HTMLAudioElement {
  const element = new Audio(SILENCE);
  void element.play().catch(() => undefined);
  return element;
}

/** An utterance in a matching device voice, or null when none is installed. */
function deviceUtterance(
  text: string,
  language: Language,
): SpeechSynthesisUtterance | null {
  const voice = window.speechSynthesis
    ?.getVoices()
    .find((v) => v.lang.toLowerCase().startsWith(language));
  if (!voice) return null;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = 0.88;
  return utterance;
}

/**
 * Speak a guidance line. Urdu uses the server's Urdu voice and falls back to
 * a device voice; English uses the device voice. Resolves false when nothing
 * could speak.
 */
export async function speak(
  text: string,
  audioUrl?: string | null,
  language: Language = "ur",
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  announceAudio("guidance");
  let stopped = false;
  const stop = () => {
    stopped = true;
  };
  window.addEventListener("nuskha-play", stop, { once: true });
  const audio = audioUrl || language === "ur" ? primedAudio() : null;
  const source =
    assetUrl(audioUrl ?? null) ??
    (language === "ur" ? await urduSpeechUrl(text) : null);
  window.removeEventListener("nuskha-play", stop);
  if (stopped) return true;
  if (audio && source) {
    const pause = () => audio.pause();
    window.addEventListener("nuskha-play", pause, { once: true });
    audio.onended = () => window.removeEventListener("nuskha-play", pause);
    audio.src = source;
    try {
      await audio.play();
      return true;
    } catch {
      window.removeEventListener("nuskha-play", pause);
    }
  }
  const utterance = deviceUtterance(text, language);
  if (!utterance) return false;
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
  const request = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const stop = (e: Event) => {
      if ((e as CustomEvent).detail !== id) {
        request.current += 1;
        audio.current?.pause();
        setPlaying(false);
        setLoading(false);
      }
    };
    window.addEventListener("nuskha-play", stop);
    return () => {
      window.removeEventListener("nuskha-play", stop);
      request.current += 1;
      audio.current?.pause();
      if (utterance.current) window.speechSynthesis?.cancel();
    };
  }, [id]);

  function speakWithDevice() {
    const speech = deviceUtterance(text, language);
    if (!speech) {
      setError(t("noVoice"));
      return;
    }
    speech.onstart = () => setPlaying(true);
    speech.onend = () => setPlaying(false);
    speech.onerror = () => setPlaying(false);
    utterance.current = speech;
    window.speechSynthesis.speak(speech);
  }

  function attach(element: HTMLAudioElement, onFail: () => void) {
    element.onplaying = () => setPlaying(true);
    element.onpause = () => setPlaying(false);
    element.onended = () => setPlaying(false);
    element.onerror = () => {
      setPlaying(false);
      onFail();
    };
    audio.current = element;
    void element.play().catch(() => {
      setPlaying(false);
      onFail();
    });
  }

  async function play() {
    if (playing || loading) {
      request.current += 1;
      audio.current?.pause();
      window.speechSynthesis?.cancel();
      setPlaying(false);
      setLoading(false);
      return;
    }
    setError("");
    announceAudio(id);
    if (audio.current) {
      void audio.current.play().catch(() => {
        setPlaying(false);
        setError(t("audioFailed"));
      });
      return;
    }
    if (audioUrl) {
      attach(new Audio(assetUrl(audioUrl)), () => setError(t("audioFailed")));
      return;
    }
    if (language !== "ur") {
      speakWithDevice();
      return;
    }
    // Urdu with no saved recording: ask the server's Urdu voice for this line.
    const element = primedAudio();
    const mine = ++request.current;
    setLoading(true);
    const source = await urduSpeechUrl(text);
    if (mine !== request.current) return;
    setLoading(false);
    if (!source) {
      speakWithDevice();
      return;
    }
    element.src = source;
    attach(element, () => {
      audio.current = null;
      speakWithDevice();
    });
  }

  const active = playing || loading;
  return (
    <span className="speaker-wrap">
      <button
        type="button"
        className="speaker"
        aria-label={active ? t("pause") : label || t("listen")}
        title={label || t("listen")}
        aria-pressed={active}
        aria-busy={loading}
        onClick={play}
      >
        {active ? <Pause size={20} /> : <Volume2 size={20} />}
        <span>
          {loading ? t("voiceLoading") : playing ? t("pause") : label || t("listen")}
        </span>
      </button>
      {error && (
        <span role="status" className="audio-error">
          {error}
        </span>
      )}
    </span>
  );
}
