"use client";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import type { Interaction, Medication } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import SpeakerButton from "./SpeakerButton";
import ClinicalText from "./ClinicalText";
export default function SafetyAlertBanner({
  interactions,
  medications,
}: {
  interactions: Interaction[];
  medications: Medication[];
}) {
  const { t, language } = useLanguage();
  const refused = medications.filter((m) => m.status !== "VERIFIED");
  return (
    <div className="safety-alerts">
      {[...interactions]
        .sort(
          (a, b) =>
            Number(b.severity === "HIGH") - Number(a.severity === "HIGH"),
        )
        .map((hit, index) => (
          <section
            className={`alert-card ${hit.severity === "HIGH" ? "alert-red" : "alert-amber"}`}
            key={`${hit.drug_a}-${index}`}
            role="alert"
          >
            <div className="alert-icon">
              <ShieldAlert size={28} />
            </div>
            <div className="alert-body">
              <span className="eyebrow">
                {t(
                  hit.severity === "HIGH"
                    ? "seriousWarning"
                    : "moderateWarning",
                )}
              </span>
              <h3 className="alert-title" dir="ltr">
                {hit.drug_a} + {hit.drug_b}
              </h3>
              <p className="warning-action">{t("warningAction")}</p>
              {language === "en" && (
                <span className="backend-label">{t("backendUrdu")}</span>
              )}
              <ClinicalText text={hit.urdu_warning} />
              <SpeakerButton text={hit.urdu_warning} />
              <details className="source-detail">
                <summary>{t("viewSource")}</summary>
                <p dir="auto">{hit.fda_verbatim_excerpt}</p>
                <span className="evidence-source" dir="ltr">
                  {hit.source}
                </span>
                <p className="evidence-disclaimer">{t("noEndorsement")}</p>
              </details>
            </div>
          </section>
        ))}
      {!interactions.length && !refused.length && medications.length > 0 && (
        <section className="alert-card alert-green">
          <ShieldCheck size={28} />
          <div>
            <strong>{t("identityMatched")}</strong>
            <p>{t("noInteraction")}</p>
          </div>
        </section>
      )}
    </div>
  );
}
