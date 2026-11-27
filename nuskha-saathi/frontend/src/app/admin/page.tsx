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

