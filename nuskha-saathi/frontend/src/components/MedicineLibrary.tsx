"use client";
import { useEffect, useState } from "react";
import {
  Pill,
  FileText,
  Trash2,
  ArrowRight,
  ScanLine,
  CalendarDays,
  MessageCircle,
  BellOff,
  HardDrive,
  Languages,
  ShieldCheck,
  Palette,
  Activity,
  Clock3,
} from "lucide-react";
import {
  API_BASE,
  fetchHealth,
  type CabinetItem,
  type HealthStatus,
  type ScanResult,
} from "@/lib/api";
import type { SavedPrescription } from "@/lib/records";
import { LanguageSwitch, useLanguage } from "@/lib/i18n";
import { IconMedallion } from "@/components/MedicalArt";
import ActiveCabinetView from "@/components/ActiveCabinetView";
import WhatsAppPreviewModal from "@/components/WhatsAppPreviewModal";

export function MedicineLibrary({
  records,
  cabinetItems = [],
  current,
  history,
  onOpen,
  onDelete,
  onScan,
  onAddCabinet,
  onRemoveCabinet,
}: {
  records: SavedPrescription[];
  cabinetItems?: CabinetItem[];
  current: ScanResult | null;
  history: boolean;
  onOpen: (scan: ScanResult) => void;
  onDelete: (id: string) => void;
  onScan: () => void;
  onAddCabinet?: (payload: {
    brand_name: string;
    strength_mg?: number | null;
    source_label?: string;
  }) => Promise<void>;
  onRemoveCabinet?: (id: string) => Promise<void>;
}) {
  const { t, language } = useLanguage();
  const scans = records.map((r) => r.scan);
  if (current && !scans.some((s) => s.scan_id === current.scan_id))
    scans.unshift(current);
  const meds = scans.flatMap((scan) =>
    scan.medications
      .filter((m) => m.status === "VERIFIED")
      .map((m) => ({ scan, med: m })),
  );
  const empty = history ? !records.length : !meds.length;
  return (
    <section className="library">
      <p className="library-description">
        {t(history ? "historyBody" : "cabinetBody")}
      </p>
      {empty ? (
        <div className="panel empty-state">
          <div className="empty-art">
            <IconMedallion
              icon={history ? FileText : Pill}
              tone="blue"
              size={28}
            />
          </div>
          <h2>{t(history ? "historyEmpty" : "cabinetEmpty")}</h2>
          <p>{t("cabinetEmptyBody")}</p>
          <button className="primary-button" onClick={onScan}>
            <ScanLine size={20} />
            {t("scan")}
          </button>
        </div>
      ) : history ? (
        <div className="history-list">
          {records.map((record) => (
            <article className="history-card" key={record.scan.scan_id}>
              <div className="history-symbol">
                <IconMedallion icon={FileText} tone="blue" size={22} />
              </div>
              <div>
                <span className="eyebrow">{t("prescriptions")}</span>
                <h2 dir="ltr">#{record.scan.scan_id.slice(-6)}</h2>
                <p>
                  {t("savedOn")}{" "}
                  <time dateTime={record.savedAt}>
                    {new Date(record.savedAt).toLocaleDateString(
                      language === "ur" ? "ur-PK" : "en-GB",
                      { day: "numeric", month: "short", year: "numeric" },
                    )}
                  </time>
                </p>
                <div className="history-meds">
                  {record.scan.medications.map((m) => (
                    <span key={m.line_id} dir="auto">
                      {m.brand_matched || t("unknownMedicine")}
                    </span>
                  ))}
                </div>
                <button
                  className="secondary-button"
                  onClick={() => onOpen(record.scan)}
                >
                  {t("viewPrescription")}
                  <ArrowRight size={18} className="directional" />
                </button>
              </div>
              <button
                className="icon-button delete-record"
                aria-label={t("remove")}
                onClick={() => {
                  if (window.confirm(t("deleteRecord")))
                    onDelete(record.scan.scan_id);
                }}
              >
                <Trash2 size={19} />
              </button>
            </article>
          ))}
        </div>
      ) : (
        <>
          <div className="cabinet-grid">
            {meds.map(({ scan, med }) => (
              <article
                className="cabinet-card"
                key={`${scan.scan_id}-${med.line_id}`}
              >
                <IconMedallion icon={Pill} tone="blue" size={22} />
                <div>
                  <h2 dir="ltr">{med.brand_matched}</h2>
                  {med.strength_mg != null && (
                    <p dir="ltr">{med.strength_mg} mg</p>
                  )}
                  <span className="cabinet-status">{t("identityMatched")}</span>
                </div>
                <div className="cabinet-schedule">
                  {(["morning", "afternoon", "night"] as const).map((slot) => (
                    <span key={slot}>
                      <span>{t(slot)}</span>
                      <strong>
                        {med.schedule?.[slot] != null
                          ? `${med.schedule[slot]} ${t("tablet")}`
                          : t("unknownDose")}
                      </strong>
                    </span>
                  ))}
                </div>
                <button
                  className="secondary-button"
                  onClick={() => onOpen(scan)}
                >
                  {t("viewPrescription")}
                  <ArrowRight className="directional" size={17} />
                </button>
              </article>
            ))}
          </div>
          <p className="library-footnote">
            <CalendarDays size={20} />
            {t("completedUnknown")}
          </p>
        </>
      )}
      {!history && onAddCabinet && onRemoveCabinet && (
        <ActiveCabinetView
          items={cabinetItems}
          onAdd={onAddCabinet}
          onRemove={onRemoveCabinet}
        />
      )}
    </section>
  );
}

export function ReminderExperience({ scan }: { scan: ScanResult | null }) {
  const { t, language } = useLanguage();
  const [time, setTime] = useState("08:00");
  const [waPreviewOpen, setWaPreviewOpen] = useState(false);
  const confirmed =
    scan?.medications.filter((m) => m.status === "VERIFIED" && m.schedule) ||
    [];
  return (
    <section className="reminder-layout">
      <div className="panel reminder-form">
        <div className="setting-card-head">
          <IconMedallion icon={MessageCircle} tone="blue" size={20} />
          <div>
            <h2>{t("whatsapp")}</h2>
            <p>{t("reminderUnavailable")}</p>
          </div>
        </div>
        {confirmed.length > 0 ? (
          <div className="reminder-medicines">
            {confirmed.map((m) => (
              <div key={m.line_id}>
                <strong dir="ltr">{m.brand_matched}</strong>
                <span>
                  {(["morning", "afternoon", "night"] as const)
                    .filter((k) => m.schedule![k] > 0)
                    .map((k) => `${t(k)}: ${m.schedule![k]}`)
                    .join(" · ")}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p>{t("reminderNoMedicine")}</p>
        )}
        <label htmlFor="reminder-time">{t("reminderTime")}</label>
        <input
          id="reminder-time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          disabled
        />
        <label htmlFor="reminder-lang">{t("reminderLanguage")}</label>
        <select id="reminder-lang" value={language} disabled>
          <option value="en">English</option>
          <option value="ur">اردو</option>
        </select>
        <label className="checkbox-line">
          <input type="checkbox" disabled />
          {t("voiceNote")}
        </label>
        <button className="primary-button" disabled>
          <BellOff size={20} />
          {t("enableReminder")}
        </button>
        <p className="reminder-confirmation" role="status">
          {t(
            scan?.whatsapp_scheduled
              ? "backendScheduled"
              : "backendNotScheduled",
          )}
        </p>
        <button
          type="button"
          className="secondary-button wa-preview-trigger"
          onClick={() => setWaPreviewOpen(true)}
        >
          <MessageCircle size={18} />
          <span>{t("waOpenPreview")}</span>
        </button>
      </div>
      <aside className="reminder-aside">
        <div className="reminder-orbit">
          <MessageCircle size={54} />
        </div>
        <span className="eyebrow">{t("comingSoon")}</span>
        <h2>{t("remindersTitle")}</h2>
        <p>{t("reminderUnavailable")}</p>
      </aside>
      <WhatsAppPreviewModal
        open={waPreviewOpen}
        scan={scan}
        onClose={() => setWaPreviewOpen(false)}
      />
    </section>
  );
}

export function SettingsExperience({
  onHistory,
  diagnostics,
  onDiagnostics,
}: {
  onHistory: () => void;
  diagnostics: boolean;
  onDiagnostics: (value: boolean) => void;
}) {
  const { t } = useLanguage();
  const [theme, setTheme] = useState("editorial");
  const [health, setHealth] = useState<HealthStatus | null | "loading">(
    "loading",
  );

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme || "editorial");
    const ctrl = new AbortController();
    void fetchHealth(ctrl.signal).then((h) => {
      if (!ctrl.signal.aborted) setHealth(h);
    });
    return () => ctrl.abort();
  }, []);

  function chooseTheme(value: string) {
    setTheme(value);
    document.documentElement.dataset.theme = value;
    try {
      localStorage.setItem("nuskha-theme", value);
    } catch {}
  }

  return (
    <section className="settings-grid">
      <div className="panel setting-card">
        <div className="setting-card-head">
          <IconMedallion icon={Palette} tone="blue" size={20} />
          <div>
            <h2>{t("theme")}</h2>
            <p>{t("themeDesc")}</p>
          </div>
        </div>
        <div className="setting-control">
          <div className="theme-controls" role="group" aria-label={t("theme")}>
            <button
              type="button"
              aria-pressed={theme === "editorial"}
              onClick={() => chooseTheme("editorial")}
            >
              {t("editorialTheme")}
            </button>
            <button
              type="button"
              aria-pressed={theme === "light"}
              onClick={() => chooseTheme("light")}
            >
              {t("lightTheme")}
            </button>
            <button
              type="button"
              aria-pressed={theme === "dark"}
              onClick={() => chooseTheme("dark")}
            >
              {t("darkTheme")}
            </button>
          </div>
        </div>
      </div>

      <div className="panel setting-card">
        <div className="setting-card-head">
          <IconMedallion icon={Languages} tone="blue" size={20} />
          <div>
            <h2>{t("language")}</h2>
            <p>{t("languageDesc")}</p>
          </div>
        </div>
        <div className="setting-control">
          <LanguageSwitch />
        </div>
      </div>

      <div className="panel setting-card">
        <div className="setting-card-head">
          <IconMedallion icon={HardDrive} tone="neutral" size={20} />
          <div>
            <h2>{t("deviceStorage")}</h2>
            <p>{t("storageBody")}</p>
          </div>
        </div>
        <div className="setting-control">
          <button
            type="button"
            className="secondary-button setting-action-btn"
            onClick={onHistory}
          >
            <Clock3 size={17} />
            <span>{t("history")}</span>
          </button>
        </div>
      </div>

      <div className="panel setting-card">
        <div className="setting-card-head">
          <IconMedallion icon={ShieldCheck} tone="amber" size={20} />
          <div>
            <h2>{t("diagnostics")}</h2>
            <p>{t("diagnosticsHint")}</p>
          </div>
        </div>
        <div className="setting-control">
          <label className="settings-toggle">
            <span>{t("diagnosticsToggle")}</span>
            <input
              type="checkbox"
              role="switch"
              checked={diagnostics}
              onChange={(e) => onDiagnostics(e.target.checked)}
            />
          </label>
        </div>
      </div>

      <div className="panel setting-card settings-health">
        <div className="health-strip">
          <div className="setting-card-head">
            <IconMedallion
              icon={Activity}
              tone={health && health !== "loading" ? "green" : "neutral"}
              size={20}
            />
            <div>
              <h2>{t("backendStatus")}</h2>
              {health === "loading" ? (
                <p>{t("loading")}</p>
              ) : health ? (
                <div className="health-url-row">
                  <span className="health-badge-ok">{t("backendConnected")}</span>
                  <span dir="ltr" className="health-url">
                    {API_BASE}
                  </span>
                </div>
              ) : (
                <p>
                  {t("backendOffline")} <span dir="ltr">{API_BASE}</span>
                </p>
              )}
            </div>
          </div>

          {health && health !== "loading" && (
            <div className="health-metrics-row">
              <div className="health-metric-pill">
                <span>{t("backendBrands")}</span>
                <strong>{health.formulary_brands}</strong>
              </div>
              <div className="health-metric-pill">
                <span>{t("backendPairs")}</span>
                <strong>{health.interaction_pairs}</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
