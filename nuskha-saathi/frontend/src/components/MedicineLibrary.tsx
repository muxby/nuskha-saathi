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
  BellRing,
  HardDrive,
  Languages,
  ShieldCheck,
  Palette,
  Activity,
  Clock3,
  Search,
  RefreshCw,
  BookOpen,
  Plus,
  Check,
  Bell,
  Download,
} from "lucide-react";
import {
  API_BASE,
  deleteReminder,
  fetchHealth,
  fetchReminders,
  formatApiError,
  searchMedicines,
  sendWhatsAppReminder,
  updateReminderStatus,
  type CabinetItem,
  type HealthStatus,
  type MedicineSearchResponse,
  type SavedReminderItem,
  type ScanResult,
} from "@/lib/api";
import SpeakerButton from "@/components/SpeakerButton";
import { getPatientId, type SavedPrescription } from "@/lib/records";
import { LanguageSwitch, useLanguage } from "@/lib/i18n";
import { IconMedallion } from "@/components/MedicalArt";
import ActiveCabinetView from "@/components/ActiveCabinetView";
import WhatsAppPreviewModal from "@/components/WhatsAppPreviewModal";
import MedicineExplorerModal from "@/components/MedicineExplorerModal";

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
  onSyncHistory,
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
  onSyncHistory?: () => Promise<number>;
}) {
  const { t, language } = useLanguage();
  const [medQuery, setMedQuery] = useState("");
  const [medSearching, setMedSearching] = useState(false);
  const [medResults, setMedResults] = useState<MedicineSearchResponse | null>(null);
  const [medSearchError, setMedSearchError] = useState("");
  const [detailTarget, setDetailTarget] = useState<{ id?: string; brand?: string } | null>(null);
  const [syncingHistory, setSyncingHistory] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  async function handleMedSearch(e: React.FormEvent) {
    e.preventDefault();
    const clean = medQuery.trim();
    if (!clean) return;
    setMedSearching(true);
    setMedSearchError("");
    try {
      const res = await searchMedicines(clean);
      setMedResults(res);
    } catch (err) {
      setMedSearchError(formatApiError(err, t("networkError")));
    } finally {
      setMedSearching(false);
    }
  }

  async function handleSyncHistory() {
    if (!onSyncHistory) return;
    setSyncingHistory(true);
    setSyncMessage("");
    try {
      const count = await onSyncHistory();
      if (count === 0) setSyncMessage(t("syncHistoryEmpty"));
    } catch (err) {
      setSyncMessage(formatApiError(err, t("networkError")));
    } finally {
      setSyncingHistory(false);
    }
  }
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
      {history && onSyncHistory && (
        <div className="history-sync-bar">
          <button
            type="button"
            className="secondary-button"
            disabled={syncingHistory}
            onClick={() => void handleSyncHistory()}
          >
            <RefreshCw size={16} />
            <span>{syncingHistory ? t("loading") : t("syncHistory")}</span>
          </button>
          {syncMessage && <span className="muted">{syncMessage}</span>}
        </div>
      )}
      {!history && onAddCabinet && onRemoveCabinet && (
        <>
          <ActiveCabinetView
            items={cabinetItems}
            onAdd={onAddCabinet}
            onRemove={onRemoveCabinet}
          />
          <section className="panel active-cabinet-box" aria-label={t("medicineSearchTitle")}>
            <div className="cabinet-box-head">
              <div>
                <span className="eyebrow">{t("medicineSearchEyebrow")}</span>
                <h2>{t("medicineSearchTitle")}</h2>
                <p>{t("medicineSearchDesc")}</p>
              </div>
            </div>
            <form className="med-search-form" onSubmit={(e) => void handleMedSearch(e)}>
              <input
                type="text"
                value={medQuery}
                onChange={(e) => setMedQuery(e.target.value)}
                placeholder={t("medicineSearchPlaceholder")}
                aria-label={t("medicineSearchPlaceholder")}
              />
              <button
                type="submit"
                className="primary-button"
                disabled={medSearching || !medQuery.trim()}
              >
                <Search size={17} />
                <span>{medSearching ? t("medicineSearching") : t("medicineSearchBtn")}</span>
              </button>
            </form>
            {medSearchError && (
              <p className="capture-error" role="alert">
                {medSearchError}
              </p>
            )}
            {medResults && (
              <div className="med-search-results">
                {medResults.local_matches.length === 0 &&
                medResults.medster_matches.length === 0 ? (
                  <p>{t("medicineNoResults")}</p>
                ) : (
                  <ul className="cabinet-active-list">
                    {medResults.medster_matches.map((item) => (
                      <li key={`ms-${item.id}`}>
                        <div className="cabinet-active-info">
                          <Pill size={18} />
                          <div>
                            <strong dir="ltr">{item.name}</strong>
                            <span dir="ltr">
                              MedSter{item.price ? ` · ${item.price}` : ""}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => setDetailTarget({ id: item.id, brand: item.name })}
                        >
                          <BookOpen size={15} />
                          <span>{t("medicineDetails")}</span>
                        </button>
                      </li>
                    ))}
                    {medResults.local_matches.map((item) => (
                      <li key={`pk-${item.brand_name}`}>
                        <div className="cabinet-active-info">
                          <Pill size={18} />
                          <div>
                            <strong dir="ltr">{item.brand_name}</strong>
                            <span dir="ltr">
                              {item.generic_salts.join(" + ")} · WHO {item.who_aware_tier} · Max{" "}
                              {item.max_daily_dose_mg} mg/day
                            </span>
                          </div>
                        </div>
                        <div className="med-search-actions">
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => setDetailTarget({ brand: item.brand_name })}
                          >
                            <BookOpen size={15} />
                            <span>{t("medicineDetails")}</span>
                          </button>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() =>
                              void onAddCabinet({
                                brand_name: item.brand_name,
                                strength_mg: item.common_strengths_mg[0] ?? null,
                                source_label: "Formulary Search",
                              })
                            }
                          >
                            <Plus size={15} />
                            <span>{t("addMedicine")}</span>
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
          <MedicineExplorerModal
            open={detailTarget !== null}
            medId={detailTarget?.id}
            brand={detailTarget?.brand}
            onClose={() => setDetailTarget(null)}
            onAddToCabinet={onAddCabinet}
          />
        </>
      )}
    </section>
  );
}

function downloadIcsSchedule(items: Array<{ brand_name: string; preferred_time?: string }>) {
  if (!items.length || typeof window === "undefined") return;
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nuskha Saathi//Medicine Reminders//EN",
  ];
  items.forEach((item, idx) => {
    const [hh = "08", min = "00"] = (item.preferred_time || "08:00").split(":");
    const dtStart = `${yyyy}${mm}${dd}T${hh.padStart(2, "0")}${min.padStart(2, "0")}00`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:nuskha-${stamp}-${idx}@nuskhasaathi.local`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${dtStart}`,
      "DURATION:PT15M",
      "RRULE:FREQ=DAILY;COUNT=7",
      `SUMMARY:Take ${item.brand_name}`,
      `DESCRIPTION:Nuskha Saathi dose reminder for ${item.brand_name}`,
      "BEGIN:VALARM",
      "TRIGGER:-PT0M",
      "ACTION:DISPLAY",
      `DESCRIPTION:Time to take ${item.brand_name}`,
      "END:VALARM",
      "END:VEVENT",
    );
  });
  lines.push("END:VCALENDAR");
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "nuskha-saathi-reminders.ics";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function ReminderExperience({
  scan,
  onRemindersChanged,
  onTestAlert,
}: {
  scan: ScanResult | null;
  onRemindersChanged?: (items: SavedReminderItem[]) => void;
  onTestAlert?: (label: string, time: string) => void;
}) {
  const { t, language } = useLanguage();
  const confirmed =
    scan?.medications.filter((m) => m.status === "VERIFIED") || [];
  const defaultBrand = confirmed[0]?.brand_matched || "Augmentin";
  const [brandName, setBrandName] = useState(defaultBrand);
  const [reminderType, setReminderType] = useState<"daily_dose" | "day3_checkin">("daily_dose");
  const [time, setTime] = useState("08:00");
  const [phone, setPhone] = useState("+923001234567");
  const [reminderLang, setReminderLang] = useState<"en" | "ur">(language);
  const [voiceNote, setVoiceNote] = useState(false);
  const [waPreviewOpen, setWaPreviewOpen] = useState(false);
  const [waConfigured, setWaConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [scheduleMsg, setScheduleMsg] = useState("");
  const [scheduleError, setScheduleError] = useState("");
  const [savedReminders, setSavedReminders] = useState<SavedReminderItem[]>([]);
  const [notifPermission, setNotifPermission] = useState<string>("default");
  const [dueAlert, setDueAlert] = useState<string>("");

  useEffect(() => {
    setBrandName(confirmed[0]?.brand_matched || "Augmentin");
  }, [scan?.scan_id]);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPermission(Notification.permission);
    }
    const ctrl = new AbortController();
    void fetchHealth(ctrl.signal).then((h) => {
      if (!ctrl.signal.aborted && h?.capabilities?.whatsapp_configured) {
        setWaConfigured(true);
      }
    });
    void fetchReminders(getPatientId(), ctrl.signal)
      .then((res) => {
        if (!ctrl.signal.aborted) {
          setWaConfigured(res.configured);
          setSavedReminders(res.reminders);
          onRemindersChanged?.(res.reminders);
        }
      })
      .catch(() => {
        // Keep empty list silently on offline load
      });
    return () => ctrl.abort();
  }, []);

  // Poll every 20s to fire local in-app / browser notifications on due minute
  useEffect(() => {
    if (!savedReminders.length) return;
    let lastTriggered = "";
    const checkDue = () => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      if (hhmm === lastTriggered) return;
      const matches = savedReminders.filter((r) => (r.preferred_time || "08:00") === hhmm);
      if (matches.length > 0) {
        lastTriggered = hhmm;
        const label = matches.map((m) => m.brand_name).join(", ");
        setDueAlert(`${label} (${hhmm})`);
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          new Notification("Nuskha Saathi Reminder", {
            body: `Time for your dose: ${label}`,
          });
        }
      }
    };
    const id = window.setInterval(checkDue, 20_000);
    return () => window.clearInterval(id);
  }, [savedReminders]);

  async function enableBrowserAlerts() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
    } catch {
      // Ignore permission rejection cleanly
    }
  }

  async function handleEnableReminder(e?: React.FormEvent) {
    e?.preventDefault();
    const targetBrand = brandName.trim() || confirmed[0]?.brand_matched || "Augmentin";
    setBusy(true);
    setScheduleError("");
    setScheduleMsg("");
    try {
      const res = await sendWhatsAppReminder({
        patient_id: getPatientId(),
        scan_id: scan?.scan_id || null,
        brand_name: targetBrand,
        phone_e164: phone,
        reminder_type: reminderType,
        send_voice_note: voiceNote,
        preferred_time: time,
        language: reminderLang,
      });
      if (res.whatsapp_scheduled) {
        setScheduleMsg(`${t("backendScheduled")} (${res.provider || "whatsapp"})`);
      } else {
        setScheduleMsg(t("reminderLocalSaved"));
      }
      const latest = await fetchReminders(getPatientId()).catch(() => null);
      if (latest) {
        setSavedReminders(latest.reminders);
        onRemindersChanged?.(latest.reminders);
      }
    } catch (err) {
      setScheduleError(formatApiError(err, t("networkError")));
    } finally {
      setBusy(false);
    }
  }

  async function handleScheduleEntireRx() {
    if (!confirmed.length) return;
    setBusy(true);
    setScheduleError("");
    setScheduleMsg("");
    try {
      const jobs: Promise<unknown>[] = [];
      for (const m of confirmed) {
        const brand = m.brand_matched || m.raw_text || "Medicine";
        const slots: string[] = [];
        if (m.schedule?.morning && m.schedule.morning > 0) slots.push("08:00");
        if (m.schedule?.afternoon && m.schedule.afternoon > 0) slots.push("14:00");
        if (m.schedule?.night && m.schedule.night > 0) slots.push("21:00");
        if (!slots.length) slots.push(time);
        for (const slotTime of slots) {
          jobs.push(
            sendWhatsAppReminder({
              patient_id: getPatientId(),
              scan_id: scan?.scan_id || null,
              brand_name: brand,
              phone_e164: phone,
              reminder_type: m.requires_day3_checkin ? "day3_checkin" : "daily_dose",
              send_voice_note: voiceNote,
              preferred_time: slotTime,
              language: reminderLang,
            }),
          );
        }
      }
      await Promise.all(jobs);
      const latest = await fetchReminders(getPatientId()).catch(() => null);
      if (latest) {
        setSavedReminders(latest.reminders);
        onRemindersChanged?.(latest.reminders);
      }
      setScheduleMsg(t("reminderLocalSaved"));
    } catch (err) {
      setScheduleError(formatApiError(err, t("networkError")));
    } finally {
      setBusy(false);
    }
  }

  async function handleMarkTaken(item: SavedReminderItem) {
    try {
      const updated = await updateReminderStatus(
        getPatientId(),
        item.id,
        "TAKEN",
        `Taken at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      );
      setSavedReminders((prev) => {
        const next = prev.map((r) => (r.id === item.id ? updated : r));
        onRemindersChanged?.(next);
        return next;
      });
    } catch (err) {
      setScheduleError(formatApiError(err, t("networkError")));
    }
  }

  async function handleDeleteReminder(id: string) {
    const ok = await deleteReminder(getPatientId(), id).catch(() => false);
    if (ok) {
      setSavedReminders((prev) => {
        const next = prev.filter((item) => item.id !== id);
        onRemindersChanged?.(next);
        return next;
      });
    }
  }

  function buildWhatsAppDirectUrl(item: SavedReminderItem): string {
    const digits = item.phone_e164.replace(/\D/g, "");
    const text = `Nuskha Saathi Reminder (${item.preferred_time || "08:00"}): Time to take ${item.brand_name}.`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  }

  return (
    <section className="reminder-layout">
      <form className="panel reminder-form" onSubmit={(e) => void handleEnableReminder(e)}>
        <div className="setting-card-head">
          <IconMedallion icon={MessageCircle} tone="blue" size={20} />
          <div>
            <h2>{t("whatsapp")}</h2>
            <p>{waConfigured ? t("waPreviewDesc") : t("reminderLocalReady")}</p>
          </div>
        </div>
        {confirmed.length > 0 && (
          <div className="reminder-medicines">
            {confirmed.map((m) => (
              <button
                type="button"
                key={m.line_id}
                className={`reminder-med-chip ${brandName === (m.brand_matched || "") ? "is-selected" : ""}`}
                onClick={() => {
                  if (m.brand_matched) setBrandName(m.brand_matched);
                  if (m.schedule) {
                    if (m.schedule.morning > 0) setTime("08:00");
                    else if (m.schedule.afternoon > 0) setTime("14:00");
                    else if (m.schedule.night > 0) setTime("21:00");
                  }
                }}
              >
                <strong dir="ltr">{m.brand_matched || m.raw_text}</strong>
                {m.schedule && (
                  <span>
                    {(["morning", "afternoon", "night"] as const)
                      .filter((k) => m.schedule![k] > 0)
                      .map((k) => `${t(k)}: ${m.schedule![k]}`)
                      .join(" · ")}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        <label htmlFor="reminder-medicine">{t("reminderMedicineLabel")}</label>
        <input
          id="reminder-medicine"
          type="text"
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
          required
          disabled={busy}
        />
        <label htmlFor="reminder-phone">{t("waPhoneLabel")}</label>
        <input
          id="reminder-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          dir="ltr"
          required
          disabled={busy}
        />
        <label htmlFor="reminder-time">{t("reminderTime")}</label>
        <div className="reminder-time-presets">
          {[
            { labelKey: "morning" as const, val: "08:00" },
            { labelKey: "afternoon" as const, val: "14:00" },
            { labelKey: "night" as const, val: "21:00" },
          ].map((preset) => (
            <button
              key={preset.val}
              type="button"
              className={`secondary-button ${time === preset.val ? "is-active" : ""}`}
              onClick={() => setTime(preset.val)}
              disabled={busy}
            >
              {t(preset.labelKey)} ({preset.val})
            </button>
          ))}
        </div>
        <input
          id="reminder-time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          disabled={busy}
        />
        <label htmlFor="reminder-kind">{t("reminderTypeLabel")}</label>
        <select
          id="reminder-kind"
          value={reminderType}
          onChange={(e) => setReminderType(e.target.value as "daily_dose" | "day3_checkin")}
          disabled={busy}
        >
          <option value="daily_dose">{t("reminderTypeDaily")}</option>
          <option value="day3_checkin">{t("reminderTypeDay3")}</option>
        </select>
        <label htmlFor="reminder-lang">{t("reminderLanguage")}</label>
        <select
          id="reminder-lang"
          value={reminderLang}
          onChange={(e) => setReminderLang(e.target.value as "en" | "ur")}
          disabled={busy}
        >
          <option value="en">English</option>
          <option value="ur">اردو</option>
        </select>
        <label className="checkbox-line">
          <input
            type="checkbox"
            checked={voiceNote}
            onChange={(e) => setVoiceNote(e.target.checked)}
            disabled={busy}
          />
          {t("voiceNote")}
        </label>
        <button
          type="submit"
          className="primary-button"
          disabled={busy}
        >
          <BellRing size={20} />
          {busy ? t("loading") : t("enableReminder")}
        </button>
        {confirmed.length > 0 && (
          <button
            type="button"
            className="secondary-button reminder-notif-btn"
            disabled={busy}
            onClick={() => void handleScheduleEntireRx()}
          >
            <Plus size={16} />
            <span>{t("reminderScheduleRx")}</span>
          </button>
        )}
        <div className="reminder-toolbar">
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              const target = brandName.trim() || "Augmentin";
              setDueAlert(`${target} (${time})`);
              onTestAlert?.(target, time);
            }}
          >
            <Bell size={15} />
            <span>{t("reminderTestAlert")}</span>
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              downloadIcsSchedule(
                savedReminders.length > 0
                  ? savedReminders
                  : [{ brand_name: brandName.trim() || "Augmentin", preferred_time: time }],
              )
            }
          >
            <Download size={15} />
            <span>{t("reminderExportIcs")}</span>
          </button>
        </div>
        {notifPermission !== "granted" && typeof window !== "undefined" && "Notification" in window && (
          <button
            type="button"
            className="secondary-button reminder-notif-btn"
            onClick={() => void enableBrowserAlerts()}
          >
            <BellRing size={16} />
            <span>{t("reminderBrowserAlerts")}</span>
          </button>
        )}
        {notifPermission === "granted" && (
          <p className="reminder-notif-status">{t("reminderBrowserGranted")}</p>
        )}
        {dueAlert && (
          <div className="alert-card alert-green" role="alert">
            <BellRing size={20} />
            <strong>{t("reminderDueNow")}: {dueAlert}</strong>
          </div>
        )}
        {scheduleError && (
          <p className="capture-error" role="alert">
            {scheduleError}
          </p>
        )}
        {(scheduleMsg || scan?.whatsapp_scheduled) && (
          <p className="reminder-confirmation" role="status">
            {scheduleMsg || t("backendScheduled")}
          </p>
        )}
        <button
          type="button"
          className="secondary-button wa-preview-trigger"
          onClick={() => setWaPreviewOpen(true)}
        >
          <MessageCircle size={18} />
          <span>{t("waOpenPreview")}</span>
        </button>
      </form>
      <aside className="reminder-aside-column">
        <div className="panel reminder-saved-box">
          <div className="setting-card-head">
            <IconMedallion icon={Clock3} tone="green" size={18} />
            <div>
              <h3>{t("reminderSavedHeading")}</h3>
              <p>{waConfigured ? t("backendConnected") : t("reminderLocalReady")}</p>
            </div>
          </div>
          {savedReminders.length === 0 ? (
            <p className="reminder-empty">{t("reminderEmpty")}</p>
          ) : (
            <div className="reminder-saved-list">
              {savedReminders.map((item) => (
                <article key={item.id} className="reminder-saved-card">
                  <div className="reminder-saved-top">
                    <strong dir="ltr">{item.brand_name}</strong>
                    <span className="reminder-time-badge" dir="ltr">
                      {item.preferred_time || "08:00"}
                    </span>
                  </div>
                  <p className="reminder-meta-line" dir="ltr">
                    {item.phone_e164} · {item.status === "SENT" ? "WhatsApp Sent" : item.status === "TAKEN" ? t("reminderTakenTag") : item.status === "UNCONFIGURED" ? t("reminderStatusLocal") : item.status}
                  </p>
                  {item.adherence_reply && (
                    <p className="reminder-reply-tag">{item.adherence_reply}</p>
                  )}
                  <div className="reminder-card-actions">
                    {item.status !== "TAKEN" && (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void handleMarkTaken(item)}
                      >
                        <Check size={15} />
                        <span>{t("reminderMarkTaken")}</span>
                      </button>
                    )}
                    <SpeakerButton
                      text={`Apni dawa ${item.brand_name} waqt par lein`}
                      language="ur"
                    />
                    <a
                      href={buildWhatsAppDirectUrl(item)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="secondary-button"
                    >
                      <MessageCircle size={15} />
                      <span>{t("reminderOpenWhatsApp")}</span>
                    </a>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => void handleDeleteReminder(item.id)}
                      aria-label={t("reminderDelete")}
                    >
                      <Trash2 size={15} />
                      <span>{t("reminderDelete")}</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
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
              {health.capabilities && (
                <>
                  <div className="health-metric-pill">
                    <span>Vision OCR</span>
                    <strong>
                      {health.capabilities.vision_configured
                        ? health.capabilities.vision_provider || "Ready"
                        : "Key needed"}
                    </strong>
                  </div>
                  <div className="health-metric-pill">
                    <span>MedSter API</span>
                    <strong>{health.capabilities.medster_live ? "Live" : "Offline"}</strong>
                  </div>
                  <div className="health-metric-pill">
                    <span>Urdu STT</span>
                    <strong>
                      {health.capabilities.stt_configured
                        ? health.capabilities.stt_provider || "Ready"
                        : "Off"}
                    </strong>
                  </div>
                  <div className="health-metric-pill">
                    <span>Urdu Audio TTS</span>
                    <strong>
                      {health.capabilities.tts_configured
                        ? health.capabilities.tts_provider || "Ready"
                        : "Browser fallback"}
                    </strong>
                  </div>
                  <div className="health-metric-pill">
                    <span>WhatsApp</span>
                    <strong>
                      {health.capabilities.whatsapp_configured
                        ? health.capabilities.whatsapp_provider || "Ready"
                        : "Preview only"}
                    </strong>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
