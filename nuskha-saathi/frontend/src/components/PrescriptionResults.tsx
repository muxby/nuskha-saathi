"use client";
import { useState } from "react";
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  ScanLine,
  Eye,
} from "lucide-react";
import type { ScanResult } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import SafetyAlertBanner from "./SafetyAlertBanner";
import VisualDoseCard from "./VisualDoseCard";
import AudioPlayer from "./AudioPlayer";
import ScanSummary from "./ScanSummary";

export default function PrescriptionResults({
  scan,
  original,
  onRetake,
}: {
  scan: ScanResult;
  original: string | null;
  onRetake: () => void;
}) {
  const { t } = useLanguage();
  const [clarity, setClarity] = useState(false);
  const confirmed = scan.medications.filter((m) => m.status === "VERIFIED");

  return (
    <section className="prescription-results">
      <ScanSummary scan={scan} />
      <SafetyAlertBanner
        interactions={scan.interactions}
        medications={scan.medications}
        onRetake={onRetake}
      />
      <div className="comparison-layout">
        <aside className="source-panel">
          <div className="source-title">
            <FileText size={19} />
            <h2>{t("original")}</h2>
            {original && (
              <button
                type="button"
                className={`clarity-toggle ${clarity ? "is-on" : ""}`}
                aria-pressed={clarity}
                onClick={() => setClarity((v) => !v)}
              >
                <Eye size={15} />
                <span>
                  {t(clarity ? "clarityLensActive" : "clarityLens")}
                </span>
              </button>
            )}
          </div>
          {original ? (
            <img
              src={original}
              alt={t("original")}
              className={`original-prescription ${clarity ? "has-clarity" : ""}`}
            />
          ) : (
            <p className="original-empty">{t("originalUnavailable")}</p>
          )}
          <button type="button" className="secondary-button" onClick={onRetake}>
            <ScanLine size={18} />
            {t("newScan")}
          </button>
        </aside>
        <div className="extracted-panel">
          <div className="source-title">
            <h2>{t("extracted")}</h2>
            <span className="record-id" dir="ltr">
              #{scan.scan_id.slice(-6)}
            </span>
          </div>
          <div className="extraction-list">
            {scan.medications.map((m) => (
              <article
                className={`extraction-row ${m.status === "VERIFIED" ? "confirmed" : "uncertain"}`}
                key={m.line_id}
              >
                <div className="extraction-row-title">
                  {m.status === "VERIFIED" ? (
                    <CheckCircle2 size={20} />
                  ) : (
                    <AlertTriangle size={20} />
                  )}
                  <h3 dir={m.brand_matched ? "ltr" : undefined}>
                    {m.brand_matched || t("unknownMedicine")}
                    {m.strength_mg != null && (
                      <span> · {m.strength_mg} mg</span>
                    )}
                  </h3>
                </div>
                <p className="extraction-status">
                  {t(
                    m.status === "VERIFIED"
                      ? "identityMatched"
                      : "confirmationRequired",
                  )}
                </p>
                <div className="source-wording">
                  <span>{t("rawText")}</span>
                  <p dir="auto">{m.raw_text || t("noRaw")}</p>
                </div>
              </article>
            ))}
          </div>
          {!scan.medications.length && (
            <div className="panel empty-state">
              <AlertTriangle size={32} />
              <p>{t("noMedicines")}</p>
              <p>{t("refused")}</p>
              <button className="secondary-button" onClick={onRetake}>
                {t("retake")}
              </button>
            </div>
          )}
          <div className="results-audio">
            <AudioPlayer
              text={scan.urdu_script}
              audioUrl={scan.audio_urdu_url}
            />
          </div>
        </div>
      </div>
      {confirmed.length > 0 && (
        <section className="dosage-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t("results")}</span>
              <h2>{t("doseSchedule")}</h2>
            </div>
          </div>
          <div className="dose-grid">
            {confirmed.map((m) => (
              <VisualDoseCard key={m.line_id} medication={m} scan={scan} />
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
