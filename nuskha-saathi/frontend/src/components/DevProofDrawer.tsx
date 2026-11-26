"use client";
import { useEffect, useRef, useState } from "react";
import { X, Activity, Timer, Coins } from "lucide-react";
import {
  fetchBenchmark,
  type EvalBenchmarkReport,
  type ScanResult,
} from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

export default function DevProofDrawer({
  scan,
  enabled = false,
}: {
  scan: ScanResult | null;
  enabled?: boolean;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [benchmark, setBenchmark] = useState<EvalBenchmarkReport | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (enabled && open) {
      dialog.current?.showModal();
      const ctrl = new AbortController();
      void fetchBenchmark(ctrl.signal).then((b) => {
        if (!ctrl.signal.aborted) setBenchmark(b);
      });
      return () => ctrl.abort();
    }
    dialog.current?.close();
  }, [open, enabled]);

  if (!enabled) return null;
  return (
    <>
      <button
        type="button"
        className="proof-chip"
        onClick={() => setOpen(true)}
        aria-label={t("proof")}
        title={t("proof")}
      >
        <Activity size={19} />
      </button>
      <dialog
        ref={dialog}
        className="proof-dialog"
        aria-labelledby="proof-title"
        onCancel={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        <div className="proof-content">
          <div className="dialog-header">
            <Activity size={23} />
            <button
              className="icon-button"
              onClick={() => setOpen(false)}
              aria-label={t("close")}
            >
              <X size={21} />
            </button>
          </div>
          <span className="eyebrow">{t("diagnostics")}</span>
          <h2 id="proof-title">{t("proof")}</h2>
          <p className="proof-privacy">{t("diagnosticsHint")}</p>
          {scan ? (
            <>
              <h3>
                <Timer size={19} />
                {t("timings")}
              </h3>
              <div className="proof-grid" dir="ltr">
                {(
                  [
                    "vision_ms",
                    "resolver_ms",
                    "openfda_ms",
                    "tts_ms",
                    "total_ms",
                  ] as const
                ).map((k) => (
                  <div key={k}>
                    <span>{k}</span>
                    <strong>
                      {Number.isFinite(scan.telemetry[k])
                        ? `${scan.telemetry[k]} ms`
                        : t("notReported")}
                    </strong>
                  </div>
                ))}
              </div>
              <h3>
                <Coins size={19} />
                {t("costs")}
              </h3>
              <div className="proof-grid" dir="ltr">
                <div>
                  <span>PKR</span>
                  <strong>
                    {Number.isFinite(scan.telemetry.estimated_cost_pkr)
                      ? scan.telemetry.estimated_cost_pkr.toFixed(2)
                      : t("notReported")}
                  </strong>
                </div>
                <div>
                  <span>USD</span>
                  <strong>
                    {Number.isFinite(scan.telemetry.estimated_cost_usd)
                      ? scan.telemetry.estimated_cost_usd.toFixed(5)
                      : t("notReported")}
                  </strong>
                </div>
              </div>
              <h3>{t("fuzzy")}</h3>
              <pre dir="ltr">
                {JSON.stringify(
                  scan.medications.map((m) => ({
                    line_id: m.line_id,
                    status: m.status,
                    fuzzy_score: m.fuzzy_score,
                  })),
                  null,
                  2,
                )}
              </pre>
              <details className="raw-proof">
                <summary>{t("rawFda")}</summary>
                <pre dir="ltr">
                  {JSON.stringify(
                    scan.interactions.map((hit) => ({
                      source: hit.source,
                      raw_fda_json: hit.raw_fda_json,
                      fallback_excerpt: hit.raw_fda_json
                        ? undefined
                        : hit.fda_verbatim_excerpt,
                    })),
                    null,
                    2,
                  )}
                </pre>
              </details>
              <p className="proof-provider-note">{t("providersUnavailable")}</p>
            </>
          ) : (
            <p>{t("proofEmpty")}</p>
          )}

          {benchmark && (
            <div className="proof-benchmark" dir="ltr">
              <h3>
                30-Case Safety Benchmark ({benchmark.total_passed}/
                {benchmark.total_cases} · p50 {benchmark.p50_engine_ms} ms)
              </h3>
              <p className="proof-provider-note">{benchmark.note}</p>
              <div className="benchmark-rows">
                {benchmark.subsets.map((row) => (
                  <div key={row.name} className="benchmark-row">
                    <span>{row.name}</span>
                    <strong>
                      {row.passed}/{row.total}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
