"use client";
import { useEffect, useRef, useState } from "react";
import {
  X,
  ShieldCheck,
  AlertTriangle,
  LoaderCircle,
  Pill,
} from "lucide-react";
import type { Medication, StripResult } from "@/lib/api";
import { postForm } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import ClinicalText from "./ClinicalText";
import ParchiCamera from "./ParchiCamera";
import SpeakerButton from "./SpeakerButton";
export default function StripVerifierModal({
  open,
  onClose,
  medication,
  scanId,
  onVerified,
}: {
  open: boolean;
  onClose: () => void;
  medication: Medication;
  scanId: string;
  onVerified: (result: StripResult) => void;
}) {
  const { t } = useLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<StripResult | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setError("");
      setResult(null);
      dialog.current?.showModal();
    } else dialog.current?.close();
  }, [open]);
  useEffect(
    () => () => {
      if (photo) URL.revokeObjectURL(photo);
    },
    [photo],
  );
  if (!open) return null;
  async function submit(file: File) {
    setBusy(true);
    setError("");
    setPhoto(URL.createObjectURL(file));
    const form = new FormData();
    form.append("file", file);
    form.append("scan_id", scanId);
    form.append("matched_line_id", medication.line_id);
    form.append("expected_brand", medication.brand_matched || "");
    form.append("expected_strength_mg", String(medication.strength_mg));
    form.append("expected_salts", medication.generic_salts?.join(",") || "");
    if (medication.schedule) {
      form.append("morning_qty", String(medication.schedule.morning));
      form.append("afternoon_qty", String(medication.schedule.afternoon));
      form.append("night_qty", String(medication.schedule.night));
      form.append("meal_timing", medication.schedule.meal_timing);
    }
    try {
      const response = await postForm<StripResult>(
        "/api/v1/verify-strip",
        form,
      );
      setResult(response);
      onVerified(response);
    } catch (err) {
      setError(
        t(
          err instanceof Error && err.message === "NETWORK"
            ? "networkError"
            : err instanceof Error && err.message === "TOO_LARGE"
              ? "photoLarge"
              : "verificationFailed",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  const status = result?.verification_status;
  const match =
    status === "EXACT_MATCH" || status === "GENERIC_EQUIVALENT_MATCH";
  const uncertain = status === "UNREADABLE_STRIP";
  const title =
    status === "EXACT_MATCH"
      ? "exact"
      : status === "GENERIC_EQUIVALENT_MATCH"
        ? "generic"
        : status === "STRENGTH_MISMATCH"
          ? "strengthMismatch"
          : uncertain
            ? "unreadable"
            : "mismatch";
  return (
    <dialog
      ref={dialog}
      className="strip-dialog"
      aria-labelledby="strip-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-content">
        <div className="dialog-header">
          <span className="eyebrow">{t("verify")}</span>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label={t("close")}
          >
            <X size={21} />
          </button>
        </div>
        <h2 id="strip-title">{t("verifyHeading")}</h2>
        <div className="prescribed-summary">
          <Pill size={24} />
          <div>
            <span>{t("prescribed")}</span>
            <strong dir="ltr">
              {medication.brand_matched}{" "}
              {medication.strength_mg != null
                ? `${medication.strength_mg} mg`
                : ""}
            </strong>
          </div>
        </div>
        {medication.strength_mg == null ? (
          <p role="alert">{t("noStrength")}</p>
        ) : busy ? (
          <div className="strip-processing" role="status">
            <LoaderCircle size={36} className="animate-spin" />
            <h3>{t("verifyBusy")}</h3>
            {photo && <img src={photo} alt={t("stripPreview")} />}
          </div>
        ) : result ? (
          <section
            className={`verification-outcome ${match ? "match" : uncertain ? "uncertain" : "mismatch"}`}
            role="status"
          >
            {match ? <ShieldCheck size={40} /> : <AlertTriangle size={40} />}
            <h3>{t(title)}</h3>
            {photo && <img src={photo} alt={t("stripPreview")} />}
            <div className="detected-summary">
              <span>{t("detected")}</span>
              <strong dir="ltr">
                {result.detected_on_strip.brand || t("notReported")}{" "}
                {result.detected_on_strip.strength_mg != null
                  ? `${result.detected_on_strip.strength_mg} mg`
                  : ""}
              </strong>
            </div>
            {status === "GENERIC_EQUIVALENT_MATCH" && (
              <p className="generic-caution">{t("genericCaution")}</p>
            )}
            <p className="backend-label">{t("backendUrdu")}</p>
            <ClinicalText text={result.urdu_verdict} />
            <SpeakerButton
              text={result.urdu_verdict}
              audioUrl={result.audio_urdu_url}
            />
            <button
              type="button"
              className="secondary-button"
              onClick={() => setResult(null)}
            >
              {t("retake")}
            </button>
          </section>
        ) : (
          <ParchiCamera onSelect={submit} busy={busy} kind="strip" />
        )}
        {error && (
          <p className="capture-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </dialog>
  );
}
