"use client";
import { useState } from "react";
import { Plus, Trash2, Pill, PlusCircle } from "lucide-react";
import { formatApiError, type CabinetItem } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

export default function ActiveCabinetView({
  items,
  onAdd,
  onRemove,
}: {
  items: CabinetItem[];
  onAdd: (payload: {
    brand_name: string;
    strength_mg?: number | null;
    source_label?: string;
  }) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const { t } = useLanguage();
  const [brand, setBrand] = useState("");
  const [strength, setStrength] = useState("");
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = brand.trim();
    if (!clean) return;
    const parsedStrength = strength.trim() ? Number(strength) : null;
    if (
      parsedStrength !== null &&
      (!Number.isFinite(parsedStrength) || parsedStrength <= 0)
    ) {
      setError(t("cabinetInvalidStrength"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onAdd({
        brand_name: clean,
        strength_mg: parsedStrength,
        source_label: source.trim() || "Prior Doctor",
      });
      setBrand("");
      setStrength("");
      setSource("");
    } catch (err) {
      setError(formatApiError(err, t("networkError")));
    } finally {
      setBusy(false);
    }
  }

  async function seedWarfarin() {
    setBusy(true);
    setError("");
    try {
      await onAdd({
        brand_name: "Marevan",
        strength_mg: 5,
        source_label: "Cardiologist (14 Nov)",
      });
    } catch (err) {
      setError(formatApiError(err, t("networkError")));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel active-cabinet-box" aria-label={t("activeCabinetTitle")}>
      <div className="cabinet-box-head">
        <div>
          <span className="eyebrow">{t("activeCabinetEyebrow")}</span>
          <h2>{t("activeCabinetTitle")}</h2>
          <p>{t("activeCabinetDesc")}</p>
        </div>
        {!items.some((i) => i.brand_name.toLowerCase() === "marevan") && (
          <button
            type="button"
            className="secondary-button cabinet-seed-btn"
            disabled={busy}
            onClick={() => void seedWarfarin()}
          >
            <PlusCircle size={15} />
            <span>{t("seedZubaidaCabinet")}</span>
          </button>
        )}
      </div>

      <form className="cabinet-add-form" onSubmit={(e) => void handleSubmit(e)}>
        <input
          type="text"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder={t("cabinetBrandPlaceholder")}
          aria-label={t("cabinetBrandPlaceholder")}
          required
        />
        <input
          type="number"
          min="1"
          step="any"
          value={strength}
          onChange={(e) => setStrength(e.target.value)}
          placeholder="mg"
          aria-label="Strength mg"
        />
        <input
          type="text"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder={t("cabinetDoctorPlaceholder")}
          aria-label={t("cabinetDoctorPlaceholder")}
        />
        <button type="submit" className="primary-button" disabled={busy || !brand.trim()}>
          <Plus size={18} />
          <span>{t("addMedicine")}</span>
        </button>
      </form>

      {error && (
        <p className="capture-error" role="alert">
          {error}
        </p>
      )}

      {items.length > 0 && (
        <ul className="cabinet-active-list">
          {items.map((item) => (
            <li key={item.id}>
              <div className="cabinet-active-info">
                <Pill size={18} />
                <div>
                  <strong dir="ltr">
                    {item.brand_name}
                    {item.strength_mg != null ? ` ${item.strength_mg} mg` : ""}
                  </strong>
                  <span dir="ltr">
                    {item.generic_salts.length
                      ? item.generic_salts.join(" + ")
                      : t("unknownMedicine")}{" "}
                    · {item.source_label}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label={`${t("remove")} ${item.brand_name}`}
                onClick={() => void onRemove(item.id)}
              >
                <Trash2 size={17} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
