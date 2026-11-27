"use client";
import { useId, useState } from "react";
import {
  Moon,
  Sun,
  Sunrise,
  Utensils,
  Printer,
  CheckCircle2,
  Pill,
  CalendarDays,
  Minus,
  CircleHelp,
  ShieldCheck,
  MessageCircle,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { Medication, ScanResult, StripResult } from "@/lib/api";
import { assetUrl } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import SpeakerButton from "./SpeakerButton";
import StripVerifierModal from "./StripVerifierModal";
import ClinicalText from "./ClinicalText";
const slots = [
  { key: "morning", icon: Sunrise },
  { key: "afternoon", icon: Sun },
  { key: "night", icon: Moon },
] as const;
export default function VisualDoseCard({
  medication,
  scan,
}: {
  medication: Medication;
  scan: ScanResult;
}) {
  const { t } = useLanguage();
  const id = useId();
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [strip, setStrip] = useState<StripResult | null>(null);
  const schedule = medication.schedule;
  const qrValue =
    typeof window !== "undefined"
      ? `${window.location.origin}/audio/${encodeURIComponent(scan.scan_id)}`
      : scan.audio_qr_payload || "";
  const matched =
    strip &&
    ["EXACT_MATCH", "GENERIC_EQUIVALENT_MATCH"].includes(
      strip.verification_status,
    );
  const showThumb = matched && strip.strip_thumbnail_url;
  const savedThumb =
    medication.strip_verified === true && medication.strip_thumbnail_url;
  function printCard() {
    const card = document.getElementById(id);
    card?.setAttribute("data-print-selected", "true");
    document.body.classList.add("print-one");
    window.print();
    document.body.classList.remove("print-one");
    card?.removeAttribute("data-print-selected");
  }
  return (
    <article className="dose-card" id={id}>
      <div className="dose-top">
        <div className="dose-identity">
          <span className="medicine-icon">
            <Pill size={30} />
          </span>
          <div>
            <h3 dir="ltr" className="dose-name">
              {medication.brand_matched}
              {medication.strength_mg != null && (
                <span>{medication.strength_mg} mg</span>
              )}
            </h3>
            <p dir="ltr" className="salt-name">
              {medication.generic_salts?.join(" + ")}
            </p>
          </div>
        </div>
        <SpeakerButton
          text={scan.urdu_script}
          audioUrl={scan.audio_urdu_url}
          label={t("fullAudio")}
        />
      </div>
      <p className="medicine-match">
        <CheckCircle2 size={16} />
        {t("identityMatched")}
      </p>
      {medication.who_aware_tier && medication.who_aware_tier !== "NONE" && (
        <p className="aware-badge">
          {t("aware")} · <b dir="ltr">{medication.who_aware_tier}</b>
        </p>
      )}
      <div className="slot-grid" aria-label={t("doseSchedule")}>
        {slots.map(({ key, icon: Icon }) => {
          const qty = schedule?.[key];
          const known =
            typeof qty === "number" && Number.isFinite(qty) && qty >= 0;
          return (
            <div
              className={`slot ${key} ${known ? (qty === 0 ? "no-dose" : "confirmed-dose") : "unknown-dose"}`}
              key={key}
            >
              <Icon size={32} strokeWidth={1.6} />
              <span>{t(key)}</span>
              {known ? (
                qty === 0 ? (
                  <Minus size={23} />
                ) : (
                  <Pill size={24} />
                )
              ) : (
                <CircleHelp size={23} />
              )}
              <strong>
                {!known ? (
                  t("unknownDose")
                ) : qty === 0 ? (
                  t("noDose")
                ) : (
                  <>
                    <bdi>{qty}</bdi> {t("tablet")}
                  </>
                )}
              </strong>
            </div>
          );
        })}
      </div>
      <div className="dose-details">
        <div>
          <Utensils size={24} />
          <strong>
            {t(
              schedule?.meal_timing === "before_food"
                ? "beforeFood"
                : schedule?.meal_timing === "after_food"
                  ? "afterFood"
                  : schedule?.meal_timing === "any"
                    ? "mealAny"
                    : "mealUnknown",
            )}
          </strong>
        </div>
        <div>
          <CalendarDays size={24} />
          <strong>{t("duration")}</strong>
          <span>
            {schedule?.duration_days != null ? (
              <>
                <bdi>{schedule.duration_days}</bdi> {t("days")}
              </>
            ) : (
              t("notSpecified")
            )}
          </span>
        </div>
      </div>
      {medication.drap_shortage_alert && (
        <div className="notice-text">
          <strong>{t("shortage")}</strong>
          <p dir="auto">{medication.drap_shortage_alert}</p>
        </div>
      )}
      {medication.requires_day3_checkin && (
        <p className="day3-note">{t("antibiotic")}</p>
      )}
      {strip && (
        <div
          className={`strip-result ${matched ? "strip-good" : "strip-bad"}`}
          role="status"
        >
          <ShieldCheck size={20} />
          <div>
            <strong>
              {t(
                strip.verification_status === "EXACT_MATCH"
                  ? "exact"
                  : strip.verification_status === "GENERIC_EQUIVALENT_MATCH"
                    ? "generic"
                    : strip.verification_status === "UNREADABLE_STRIP"
                      ? "unreadable"
                      : "mismatch",
              )}
            </strong>
            <ClinicalText text={strip.urdu_verdict} />
            {strip.verification_status === "GENERIC_EQUIVALENT_MATCH" && (
              <p>{t("genericCaution")}</p>
            )}
          </div>
        </div>
      )}
      {(showThumb || savedThumb) && (
        <img
          src={assetUrl(
            showThumb
              ? (strip?.strip_thumbnail_url ?? null)
              : medication.strip_thumbnail_url,
          )}
          alt={t("stripPreview")}
          className="strip-thumb"
        />
      )}
      <div className="dose-actions">
        <button
          type="button"
          className="verify-button"
          onClick={() => setVerifyOpen(true)}
        >
          <ShieldCheck size={19} />
          {t("verify")}
        </button>
        <button type="button" className="print-button" onClick={printCard}>
          <Printer size={19} />
          {t("print")}
        </button>
      </div>
      <div className="qr-row">
        <div>
          <strong>{t("replayQr")}</strong>
          <p>{t("qrHint")}</p>
        </div>
        <QRCodeSVG
          value={qrValue}
          size={80}
          marginSize={1}
          title={t("replayQr")}
        />
      </div>
      <div className="dose-share">
        <a
          className="share-button"
          href={`https://wa.me/?text=${encodeURIComponent(`${t("shareAudio")}\n${qrValue}`)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle size={18} />
          {t("share")}
        </a>
        <p>{t("shareNote")}</p>
      </div>
      <StripVerifierModal
        open={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        medication={medication}
        scanId={scan.scan_id}
        onVerified={setStrip}
      />
    </article>
  );
}
