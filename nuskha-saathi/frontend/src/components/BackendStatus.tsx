"use client";
import { CircleCheck, CloudOff, KeyRound, Loader, PlugZap, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiHostLabel, probeBackend, type BackendState } from "@/lib/connection";
import { connectionCopy, pick } from "@/lib/copy";
import { useLanguage } from "@/lib/i18n";

const ICON = {
  checking: Loader,
  ready: CircleCheck,
  "no-api-url": PlugZap,
  unreachable: CloudOff,
  "reader-not-configured": KeyRound,
} satisfies Record<BackendState, typeof Loader>;

/**
 * Tells the person, before they take a photo, whether live scanning can work
 * and what is wrong if it cannot. `quiet` hides the notice while everything
 * is healthy, for screens where it would only be noise.
 */
export default function BackendStatus({
  quiet = false,
  onOpenDemo,
}: {
  quiet?: boolean;
  onOpenDemo?: () => void;
}) {
  const { language } = useLanguage();
  const copy = pick(connectionCopy, language);
  const [state, setState] = useState<BackendState>("checking");
  const controller = useRef<AbortController | null>(null);

  const check = useCallback(() => {
    controller.current?.abort();
    const next = new AbortController();
    controller.current = next;
    setState("checking");
    void probeBackend(next.signal).then((result) => {
      if (!next.signal.aborted) setState(result);
    });
  }, []);

  useEffect(() => {
    check();
    return () => controller.current?.abort();
  }, [check]);

  if (quiet && (state === "ready" || state === "checking")) return null;

  const Icon = ICON[state];
  const title =
    state === "checking"
      ? copy.checking
      : state === "ready"
        ? copy.ready
        : state === "no-api-url"
          ? copy.noApiUrl
          : state === "unreachable"
            ? copy.unreachable
            : copy.readerOff;
  const body =
    state === "no-api-url"
      ? copy.noApiUrlBody
      : state === "unreachable"
        ? copy.unreachableBody
        : state === "reader-not-configured"
          ? copy.readerOffBody
          : "";
  const problem = state !== "ready" && state !== "checking";

  return (
    <section className={`backend-status is-${state}`} role="status" aria-live="polite">
      <Icon size={22} aria-hidden="true" className={state === "checking" ? "is-spinning" : undefined} />
      <div className="backend-status-text">
        <strong>{title}</strong>
        {body && <p>{body}</p>}
        <span className="backend-status-host">
          {copy.server}: <bdi dir="ltr">{apiHostLabel()}</bdi>
        </span>
      </div>
      {problem && (
        <div className="backend-status-actions">
          <button type="button" onClick={check}>
            <RefreshCw size={16} aria-hidden="true" />
            {copy.retry}
          </button>
          {onOpenDemo && (
            <button type="button" className="is-primary" onClick={onOpenDemo}>
              {copy.tryDemo}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
