"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Volume2 } from "lucide-react";
import { assetUrl, synthesizeUrduTts } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { WaveArt } from "./MedicalArt";
import SpeakerButton, { announceAudio } from "./SpeakerButton";
const time = (value: number) =>
  Number.isFinite(value)
    ? `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`
    : "—";
export default function AudioPlayer({
  text,
  audioUrl,
}: {
  text: string;
  audioUrl: string | null;
}) {
  const { t } = useLanguage();
  const audio = useRef<HTMLAudioElement>(null);
  const id = useId();
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [ttsNotice, setTtsNotice] = useState("");
  const effectiveUrl = audioUrl || generatedUrl;
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [error, setError] = useState(false);
  const [speed, setSpeed] = useState(1);
  useEffect(() => {
    setGeneratedUrl(null);
  }, [audioUrl, text]);
  useEffect(() => {
    const stop = (e: Event) => {
      if ((e as CustomEvent).detail !== id) audio.current?.pause();
    };
    window.addEventListener("nuskha-play", stop);
    const element = audio.current;
    return () => {
      element?.pause();
      window.removeEventListener("nuskha-play", stop);
    };
  }, [id]);
  async function play() {
    const element = audio.current;
    if (!element) return;
    if (!element.paused) {
      element.pause();
      return;
    }
    announceAudio(id);
    setError(false);
    try {
      await element.play();
    } catch {
      setError(true);
    }
  }
  return (
    <section className="audio-player" aria-label={t("voice")}>
      <div className="audio-player-top">
        <span>
          <Volume2 size={18} />
          {t("audioLanguage")}
        </span>
        <span>{t("voice")}</span>
      </div>
      <WaveArt active={playing} />
      {effectiveUrl ? (
        <>
          <audio
            ref={audio}
            src={assetUrl(effectiveUrl)}
            preload="metadata"
            onPlaying={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            onDurationChange={(e) => setDuration(e.currentTarget.duration)}
            onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
            onError={() => {
              setError(true);
              setPlaying(false);
            }}
          />
          <div className="audio-timeline">
            <input
              type="range"
              min={0}
              max={Number.isFinite(duration) ? duration : 0}
              step={0.1}
              value={position}
              disabled={!Number.isFinite(duration) || !duration}
              aria-label={t("voice")}
              aria-valuetext={`${time(position)} / ${time(duration)}`}
              onChange={(e) => {
                const next = Number(e.target.value);
                if (audio.current) audio.current.currentTime = next;
                setPosition(next);
              }}
            />
            <div dir="ltr">
              <span>{time(position)}</span>
              <span>{duration > 0 ? time(duration) : "—"}</span>
            </div>
          </div>
          <div className="audio-controls">
            <button
              className="icon-button"
              type="button"
              aria-label={t("replay")}
              onClick={() => {
                if (audio.current) {
                  audio.current.currentTime = 0;
                  if (audio.current.paused) void play();
                }
              }}
            >
              <RotateCcw size={20} />
            </button>
            <button
              type="button"
              className="audio-play-button"
              onClick={play}
              aria-label={t(playing ? "pause" : "play")}
            >
              {playing ? (
                <Pause size={27} fill="currentColor" />
              ) : (
                <Play size={27} fill="currentColor" />
              )}
            </button>
            <select
              aria-label={t("speed")}
              value={speed}
              onChange={(e) => {
                const next = Number(e.target.value);
                setSpeed(next);
                if (audio.current) audio.current.playbackRate = next;
              }}
            >
              {[0.75, 1, 1.25, 1.5].map((n) => (
                <option key={n} value={n}>
                  {n}×
                </option>
              ))}
            </select>
          </div>
          {error && (
            <p role="alert" className="audio-error">
              {t("audioFailed")}
            </p>
          )}
        </>
      ) : (
        <div className="audio-fallback">
          <p>{t("audioUnavailable")}</p>
          <div className="wa-reply-buttons">
            <SpeakerButton text={text} label={t("browserVoice")} />
            <button
              type="button"
              className="secondary-button"
              disabled={generating || !text.trim()}
              onClick={() => {
                setGenerating(true);
                setTtsNotice("");
                void synthesizeUrduTts(text)
                  .then((res) => {
                    if (res.audio_urdu_url) {
                      setGeneratedUrl(res.audio_urdu_url);
                    } else {
                      setTtsNotice(t("ttsServerUnavailable"));
                    }
                  })
                  .catch(() => {
                    setTtsNotice(t("ttsServerUnavailable"));
                  })
                  .finally(() => setGenerating(false));
              }}
            >
              {generating ? t("loading") : t("generateUrduAudio")}
            </button>
          </div>
          {ttsNotice && <p className="audio-language-note">{ttsNotice}</p>}
        </div>
      )}
      <p className="audio-language-note">{t("voiceOnly")}</p>
    </section>
  );
}
