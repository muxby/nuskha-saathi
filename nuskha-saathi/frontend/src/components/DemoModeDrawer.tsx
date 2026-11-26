"use client";
import { useEffect, useRef, useState } from "react";
import { Play, ClipboardCheck, X, WifiOff, ArrowRight } from "lucide-react";
import {
  fetchDemoCases,
  runDemoCase,
  type DemoCaseMeta,
  type ScanResult,
} from "@/lib/api";
import {
  OFFLINE_DEMO_CASES,
  buildOfflineDemoFallback,
} from "@/lib/offlineDemo";
import { useLanguage } from "@/lib/i18n";

export default function DemoModeDrawer({
  open,
  offlineRequested,
  onClose,
  onSelectScan,
}: {
  open: boolean;
  offlineRequested: boolean;
  onClose: () => void;
  onSelectScan: (scan: ScanResult) => void;
}) {
  const { t } = useLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  const [cases, setCases] = useState<DemoCaseMeta[]>(OFFLINE_DEMO_CASES);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setError("");
      dialog.current?.showModal();
      const ctrl = new AbortController();
      void fetchDemoCases(ctrl.signal).then((remote) => {
        if (!ctrl.signal.aborted && remote.length > 0) setCases(remote);
      });
      return () => ctrl.abort();
    }
    dialog.current?.close();
  }, [open]);

  if (!open) return null;

  async function launch(caseId: string) {
    setBusyId(caseId);
    setError("");
    try {
      const scan = await runDemoCase(caseId);
      onSelectScan(scan);
      onClose();
    } catch {
      const fallback = buildOfflineDemoFallback(caseId);
      if (offlineRequested && fallback) {
        onSelectScan(fallback);
        onClose();
      } else {
        setError(t("networkError"));
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="strip-dialog demo-dialog"
      aria-labelledby="demo-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-content">
        <div className="dialog-header">
          <span className="eyebrow">
            <ClipboardCheck size={14} /> {t("demoModeTitle")}
          </span>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label={t("close")}
          >
            <X size={20} />
          </button>
        </div>

        <h2 id="demo-title">{t("demoCasesHeading")}</h2>
        <p className="demo-sub">{t("demoModeDesc")}</p>

        {offlineRequested && (
          <div className="demo-offline-badge" role="status">
            <WifiOff size={15} />
            <span>{t("demoOfflineActive")}</span>
          </div>
        )}

        {error && (
          <p className="capture-error" role="alert">
            {error}
          </p>
        )}

        <div className="demo-case-list">
          {cases.map((item) => (
            <button
              key={item.case_id}
              type="button"
              className="demo-case-card"
              disabled={busyId !== null}
              onClick={() => void launch(item.case_id)}
            >
              <div className="demo-case-copy">
                <strong dir="ltr">{item.title}</strong>
                <span dir="ltr">{item.subtitle}</span>
                <div className="demo-case-tags" dir="ltr">
                  {item.highlights.map((tag) => (
                    <em key={tag}>{tag}</em>
                  ))}
                </div>
              </div>
              <span className="demo-case-go">
                {busyId === item.case_id ? (
                  t("loading")
                ) : (
                  <>
                    <Play size={15} />
                    <ArrowRight size={15} className="directional" />
                  </>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
    </dialog>
  );
}
