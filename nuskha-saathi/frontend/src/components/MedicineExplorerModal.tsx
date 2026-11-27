"use client";
import { useEffect, useRef, useState } from "react";
import { BookOpen, Pill, Plus, ShieldCheck, X } from "lucide-react";
import {
  fetchMedicineDetails,
  formatApiError,
  type MedicineDetailsResponse,
} from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

export default function MedicineExplorerModal({
  open,
  medId,
  brand,
  onClose,
  onAddToCabinet,
}: {
  open: boolean;
  medId?: string | null;
  brand?: string | null;
  onClose: () => void;
  onAddToCabinet?: (payload: {
    brand_name: string;
    source_label?: string;
  }) => Promise<void>;
}) {
  const { t } = useLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<MedicineDetailsResponse | null>(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!open) {
      dialog.current?.close();
      return;
    }
    setAdded(false);
    setError("");
    setData(null);
    dialog.current?.showModal();
    if (!medId && !brand) return;
    const ctrl = new AbortController();
    setLoading(true);
    void fetchMedicineDetails(
      { id: medId || undefined, brand: brand || undefined },
      ctrl.signal,
    )
      .then((res) => {
        if (!ctrl.signal.aborted) setData(res);
      })
      .catch((err) => {
        if (!ctrl.signal.aborted) setError(formatApiError(err, t("medicineNoResults")));
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [open, medId, brand, t]);

  if (!open) return null;

  const titleName =
    data?.medster?.name || data?.formulary?.brand_name || brand || t("medicineDetailsTitle");

  async function addCabinet() {
    if (!onAddToCabinet) return;
    const targetBrand = data?.formulary?.brand_name || brand || data?.medster?.name;
    if (!targetBrand) return;
    await onAddToCabinet({
      brand_name: targetBrand,
      source_label: "Medicine Explorer",
    });
    setAdded(true);
  }

  return (
    <dialog
      ref={dialog}
      className="strip-dialog demo-dialog"
      aria-labelledby="med-details-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-content">
        <div className="dialog-header">
          <span className="eyebrow">
            <BookOpen size={14} /> {t("medicineDetailsTitle")}
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

        <h2 id="med-details-title" dir="ltr">
          {titleName}
        </h2>

        {data?.medster?.price && (
          <div className="med-details-price-row">
            <span className="health-badge-ok" dir="ltr">
              {t("medicinePriceLabel")}: {data.medster.price}
            </span>
            {data.medster.dosage_form && (
              <span className="med-chip" dir="ltr">
                {data.medster.dosage_form}
              </span>
            )}
          </div>
        )}

        {loading && <p role="status">{t("medicineSearching")}</p>}
        {error && (
          <p className="capture-error" role="alert">
            {error}
          </p>
        )}

        {data?.formulary && (
          <section className="med-details-card">
            <div className="med-details-card-head">
              <ShieldCheck size={18} />
              <strong>{t("medicineFormularySection")}</strong>
            </div>
            <p dir="ltr">
              {data.formulary.generic_salts.join(" + ")} · WHO AWaRe:{" "}
              <strong>{data.formulary.who_aware_tier}</strong>
            </p>
            <div className="med-details-limits" dir="ltr">
              <span>
                {t("medicineMaxSingle")}:{" "}
                <strong>{data.formulary.max_single_dose_mg} mg</strong>
              </span>
              <span>
                {t("medicineMaxDaily")}:{" "}
                <strong>{data.formulary.max_daily_dose_mg} mg</strong>
              </span>
            </div>
            {data.formulary.bioequivalent_pk_brands.length > 0 && (
              <p className="med-bio-row" dir="ltr">
                {t("medicineBioequivalents")}:{" "}
                {data.formulary.bioequivalent_pk_brands.join(", ")}
              </p>
            )}
            {onAddToCabinet && (
              <button
                type="button"
                className="secondary-button"
                disabled={added}
                onClick={() => void addCabinet()}
              >
                <Plus size={16} />
                <span>{added ? t("saved") : t("medicineAddToCabinet")}</span>
              </button>
            )}
          </section>
        )}

        {data?.medster && data.medster.sections.length > 0 && (
          <section className="med-monograph-list">
            <div className="med-details-card-head">
              <Pill size={18} />
              <strong>{t("medicineMedsterSection")}</strong>
            </div>
            {data.medster.sections.slice(0, 10).map((sec) => (
              <details key={sec.section} className="source-detail">
                <summary dir="ltr">{sec.title}</summary>
                <p dir="auto">{sec.content}</p>
              </details>
            ))}
          </section>
        )}
      </div>
    </dialog>
  );
}
