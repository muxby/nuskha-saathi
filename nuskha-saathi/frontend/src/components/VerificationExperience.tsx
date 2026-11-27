"use client";
import { useState } from "react";
import { Pill, ScanLine, ArrowRight } from "lucide-react";
import type { ScanResult, StripResult } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import StripVerifierModal from "./StripVerifierModal";
export default function VerificationExperience({
  scan,
  onScan,
  onVerified,
}: {
  scan: ScanResult | null;
  onScan: () => void;
  onVerified?: (lineId: string, result: StripResult) => void;
}) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<string | null>(null);
  const meds = scan?.medications.filter((m) => m.status === "VERIFIED") || [];
  return (
    <section className="verification-page">
      {meds.length ? (
        <>
          <p>{t("chooseMedicine")}</p>
          <div className="medicine-choices">
            {meds.map((m) => (
              <button
                className="medicine-choice"
                key={m.line_id}
                onClick={() => setSelected(m.line_id)}
              >
                <span className="medicine-icon">
                  <Pill size={27} />
                </span>
                <span>
                  <strong dir="ltr">{m.brand_matched}</strong>
                  <small dir="ltr">
                    {m.strength_mg != null
                      ? `${m.strength_mg} mg`
                      : t("notSpecified")}
                  </small>
                </span>
                <ArrowRight size={21} className="directional" />
              </button>
            ))}
          </div>
          {scan &&
            meds.map((m) => (
              <StripVerifierModal
                key={m.line_id}
                open={selected === m.line_id}
                onClose={() => setSelected(null)}
                medication={m}
                scanId={scan.scan_id}
                onVerified={(res) => onVerified?.(m.line_id, res)}
              />
            ))}
        </>
      ) : (
        <div className="panel empty-state">
          <Pill size={42} />
          <h2>{t("verifyFirst")}</h2>
          <p>{t("verifyFirstBody")}</p>
          <button className="primary-button" onClick={onScan}>
            <ScanLine size={20} />
            {t("scan")}
          </button>
        </div>
      )}
    </section>
  );
}
