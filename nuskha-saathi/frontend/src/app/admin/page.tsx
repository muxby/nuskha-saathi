"use client";
import { CircleCheck, CloudOff, Loader, LockKeyhole, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE } from "@/lib/api";
import { adminCopy, pick } from "@/lib/copy";
import { LanguageSwitch, useLanguage } from "@/lib/i18n";

type Phase = "waking" | "awake" | "failed";

const PANEL_URL = `${API_BASE}/admin`;
const RETRY_MS = 3000;
const GIVE_UP_MS = 90_000;

/**
 * The panel itself lives on the backend and is protected by its password.
 * This page only wakes a sleeping backend, shows how long that takes, and
 * then opens the panel. It holds no password and shows no diagnostics.
 */
export default function AdminGate() {
  const { language } = useLanguage();
  const copy = pick(adminCopy, language);
  const [phase, setPhase] = useState<Phase>("waking");
  const [elapsed, setElapsed] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const tookMs = useRef(0);

  const retry = useCallback(() => {
    setPhase("waking");
    setElapsed(0);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const started = Date.now();
    const clock = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);

    async function wake() {
      while (!cancelled && Date.now() - started < GIVE_UP_MS) {
        try {
          const response = await fetch(`${API_BASE}/health`, { cache: "no-store" });
          if (response.ok) {
            if (cancelled) return;
            tookMs.current = Date.now() - started;
            setPhase("awake");
            return;
          }
        } catch {
          // Asleep or unreachable: keep trying until the deadline.
        }
        await new Promise((resolve) => window.setTimeout(resolve, RETRY_MS));
      }
      if (!cancelled) setPhase("failed");
    }

    void wake();
    return () => {
      cancelled = true;
      window.clearInterval(clock);
    };
  }, [attempt]);

  useEffect(() => {
    if (phase !== "awake") return;
    const timer = window.setTimeout(() => window.location.assign(PANEL_URL), 1200);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const Icon = phase === "waking" ? Loader : phase === "awake" ? CircleCheck : CloudOff;

  return (
    <main className={`admin-gate is-${phase}`}>
      <div className="admin-gate-lang">
        <LanguageSwitch />
      </div>
      <section className="admin-gate-card" aria-live="polite">
        <span className="admin-gate-icon" aria-hidden="true">
          <Icon size={34} strokeWidth={1.6} className={phase === "waking" ? "is-spinning" : undefined} />
        </span>
        <span className="eyebrow">
          <LockKeyhole size={13} aria-hidden="true" /> {copy.eyebrow}
        </span>
        <h1>{phase === "waking" ? copy.waking : phase === "awake" ? copy.awake : copy.failed}</h1>
        <p>
          {phase === "waking"
            ? copy.wakingBody
            : phase === "awake"
              ? copy.awakeBody(Math.max(1, Math.round(tookMs.current / 1000)))
              : copy.failedBody}
        </p>
        {phase === "waking" && (
          <p className="admin-gate-timer">
            <bdi>{elapsed}</bdi> {copy.seconds}
          </p>
        )}
        <div className="admin-gate-actions">
          {phase === "failed" && (
            <button type="button" className="secondary-button" onClick={retry}>
              <RefreshCw size={18} aria-hidden="true" /> {copy.retry}
            </button>
          )}
          <a className="primary-button" href={PANEL_URL}>
            {copy.open}
          </a>
        </div>
        <p className="admin-gate-host">
          {copy.server}: <bdi dir="ltr">{API_BASE.replace(/^https?:\/\//, "")}</bdi>
        </p>
      </section>
    </main>
  );
}
