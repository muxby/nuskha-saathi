"use client";
import ParchiCamera from "@/components/ParchiCamera";
import VerificationExperience from "@/components/VerificationExperience";
import PrescriptionResults from "@/components/PrescriptionResults";
import SpeakerButton from "@/components/SpeakerButton";
import ProcessingExperience from "@/components/ProcessingExperience";
import {
  MedicineLibrary,
  ReminderExperience,
  SettingsExperience,
} from "@/components/MedicineLibrary";
import {
  getPatientId,
  readLocalCabinet,
  readRecords,
  writeLocalCabinet,
  writeRecords,
  type SavedPrescription,
} from "@/lib/records";
import { Save, Check, ArrowLeft, BellRing, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import AppShell, { type View } from "@/components/AppShell";
import HomeExperience from "@/components/HomeExperience";
import { useLanguage } from "@/lib/i18n";
import DevProofDrawer from "@/components/DevProofDrawer";
import DemoModeDrawer from "@/components/DemoModeDrawer";
import BackendStatus from "@/components/BackendStatus";
import { prepareImage } from "@/lib/imagePrep";
import { pick, visionCopy } from "@/lib/copy";
import {
  addCabinetMed,
  clearCabinet,
  ApiRequestError,
  fetchCabinet,
  fetchPatientScans,
  fetchReminders,
  fetchScanById,
  formatApiError,
  postForm,
  removeCabinetMed,
  updateReminderStatus,
  type CabinetItem,
  type SavedReminderItem,
  type ScanResult,
  type StripResult,
} from "@/lib/api";

function playReminderChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    [523.25, 659.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.16 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.16);
      osc.stop(ctx.currentTime + i * 0.16 + 0.28);
    });
  } catch {}
}

export default function Home() {
  const { t, language } = useLanguage();
  const controller = useRef<AbortController | null>(null);
  const [view, setView] = useState<View>("home");
  const [scan, setScan] = useState<ScanResult | null>(null);
  const scanRef = useRef<ScanResult | null>(null);
  useEffect(() => {
    scanRef.current = scan;
  }, [scan]);

  function openScanResults(nextScan: ScanResult, imageUrl: string | null = null) {
    // Update scanRef synchronously before hashchange fires inside navigate("results")
    scanRef.current = nextScan;
    setScan(nextScan);
    setOriginal(imageUrl);
    setOriginalFile(null);
    navigate("results");
  }

  const [diagnostics, setDiagnostics] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoOffline, setDemoOffline] = useState(false);
  const [records, setRecords] = useState<SavedPrescription[]>([]);
  const [cabinetItems, setCabinetItems] = useState<CabinetItem[]>([]);
  const [patientId, setPatientId] = useState("anonymous");
  const [useCabinet, setUseCabinet] = useState(true);
  const [activeReminders, setActiveReminders] = useState<SavedReminderItem[]>([]);
  const [dueToast, setDueToast] = useState<{ id?: string; label: string; time: string } | null>(null);

  function triggerDoseNotification(label: string, time: string, id?: string) {
    setDueToast({ id, label, time });
    playReminderChime();
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("Nuskha Saathi Reminder", { body: `${label} (${time})` });
      } catch {}
    }
  }

  useEffect(() => {
    setRecords(readRecords());
    const localCab = readLocalCabinet();
    if (localCab.length) setCabinetItems(localCab);
    const pid = getPatientId();
    setPatientId(pid);

    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "offline") {
      setDemoOffline(true);
      setDemoOpen(true);
    }

    const ctrl = new AbortController();
    void fetchCabinet(pid, ctrl.signal).then((remote) => {
      if (!ctrl.signal.aborted && remote && remote.length > 0) {
        setCabinetItems(remote);
        writeLocalCabinet(remote);
      }
    });
    void fetchReminders(pid, ctrl.signal)
      .then((res) => {
        if (!ctrl.signal.aborted) setActiveReminders(res.reminders);
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    if (!activeReminders.length) return;
    let lastMinute = "";
    const check = () => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      if (hhmm === lastMinute) return;
      const due = activeReminders.filter(
        (r) => r.status !== "TAKEN" && (r.preferred_time || "08:00") === hhmm,
      );
      if (due.length > 0) {
        lastMinute = hhmm;
        triggerDoseNotification(
          due.map((d) => d.brand_name).join(", "),
          hhmm,
          due[0].id,
        );
      }
    };
    const timer = window.setInterval(check, 20_000);
    return () => window.clearInterval(timer);
  }, [activeReminders]);

  const savedMeds = records.flatMap((r) =>
    r.scan.medications
      .filter((m) => m.status === "VERIFIED" && m.brand_matched)
      .map((m) => ({
        brand_name: m.brand_matched!,
        generic_salts: m.generic_salts || [],
        strength_mg: m.strength_mg,
        source_label: `Saved #${r.scan.scan_id.slice(-6)}`,
      })),
  );

  const explicitCabinetMeds = cabinetItems.map((c) => ({
    brand_name: c.brand_name,
    generic_salts: c.generic_salts,
    strength_mg: c.strength_mg,
    source_label: c.source_label,
  }));

  const cabinetMeds = [...explicitCabinetMeds, ...savedMeds];

  async function handleAddCabinet(payload: {
    brand_name: string;
    strength_mg?: number | null;
    source_label?: string;
  }) {
    try {
      const res = await addCabinetMed(patientId, payload);
      setCabinetItems(res.medications);
      writeLocalCabinet(res.medications);
    } catch {
      const localItem: CabinetItem = {
        id: `local_${Date.now().toString(36)}`,
        patient_id: patientId,
        brand_name: payload.brand_name,
        generic_salts: [],
        strength_mg: payload.strength_mg ?? null,
        source_label: payload.source_label || "Active Cabinet",
        added_at: new Date().toISOString(),
      };
      const updated = [localItem, ...cabinetItems];
      setCabinetItems(updated);
      writeLocalCabinet(updated);
    }
  }

  async function handleRemoveCabinet(itemId: string) {
    const updated = cabinetItems.filter((item) => item.id !== itemId);
    setCabinetItems(updated);
    writeLocalCabinet(updated);
    if (!itemId.startsWith("local_")) {
      const remote = await removeCabinetMed(patientId, itemId).catch(() => null);
      if (remote) {
        setCabinetItems(remote);
        writeLocalCabinet(remote);
      }
    }
  }

  async function handleClearCabinet() {
    setCabinetItems([]);
    writeLocalCabinet([]);
    await clearCabinet(patientId);
  }

  function saveCurrent() {
    if (!scan) return;
    const updated = [
      { savedAt: new Date().toISOString(), scan },
      ...records.filter((r) => r.scan.scan_id !== scan.scan_id),
    ].slice(0, 20);
    try {
      writeRecords(updated);
      setRecords(updated);
    } catch {
      setError("saveFailed");
    }
  }

  function removeRecord(id: string) {
    const updated = records.filter((r) => r.scan.scan_id !== id);
    try {
      writeRecords(updated);
      setRecords(updated);
    } catch {
      setError("saveFailed");
    }
  }

  const [original, setOriginal] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  useEffect(
    () => () => {
      if (original) URL.revokeObjectURL(original);
    },
    [original],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const navigate = (next: View) => {
    controller.current?.abort();
    setBusy(false);
    setView(next);
    setError("");
    window.location.hash = next;
    window.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() =>
      document.getElementById("main-content")?.focus({ preventScroll: true }),
    );
  };

  useLayoutEffect(() => {
    const sync = () => {
      const target = window.location.hash.slice(1);
      if (
        [
          "home",
          "scan",
          "verify",
          "medicines",
          "history",
          "settings",
          "reminders",
          "results",
        ].includes(target)
      ) {
        controller.current?.abort();
        setBusy(false);
        setView(
          target === "results" && !scanRef.current ? "scan" : (target as View),
        );
      }
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      controller.current?.abort();
    };
  }, []);

  const [errorDetail, setErrorDetail] = useState("");

  async function handleScan(file: File) {
    setErrorDetail("");
    const request = new AbortController();
    controller.current?.abort();
    controller.current = request;
    setBusy(true);
    setError("");
    setScan(null);
    setOriginal(URL.createObjectURL(file));
    const upload = await prepareImage(file);
    setOriginalFile(file);
    const form = new FormData();
    form.append("file", upload);
    form.append("patient_id", patientId);
    if (useCabinet && cabinetMeds.length > 0) {
      form.append("active_cabinet", JSON.stringify(cabinetMeds));
    }
    try {
      const result = await postForm<ScanResult>(
        "/api/v1/scan-parchi",
        form,
        request.signal,
      );
      if (!request.signal.aborted) {
        setScan(result);
        setView("results");
        window.history.pushState(null, "", "#results");
        window.scrollTo({ top: 0, behavior: "instant" });
      }
    } catch (err) {
      const code =
        err instanceof ApiRequestError
          ? err.code
          : err instanceof Error
            ? err.message
            : "";
      if (!request.signal.aborted && (code === "RATE_LIMITED" || code === "TIMEOUT")) {
        const copy = pick(visionCopy, language);
        setErrorDetail(code === "RATE_LIMITED" ? copy.rateLimited : copy.timeout);
      } else if (!request.signal.aborted) {
        if (err instanceof ApiRequestError) {
          setError(err.code === "TOO_LARGE" ? t("photoLarge") : err.message);
        } else if (err instanceof Error && err.message === "NETWORK") {
          setError(t("networkError"));
        } else if (err instanceof Error && err.message === "TOO_LARGE") {
          setError(t("photoLarge"));
        } else {
          setError(formatApiError(err, t("uploadError")));
        }
      }
    } finally {
      if (controller.current === request) setBusy(false);
    }
  }

  return (
      <AppShell
        view={view}
        navigate={navigate}
        onTripleLogoTap={() => setDemoOpen(true)}
      >
        {dueToast && (
          <div className="global-reminder-toast" role="alert">
            <BellRing size={18} />
            <strong>
              {t("reminderDueNow")}: {dueToast.label} ({dueToast.time})
            </strong>
            <div className="global-reminder-actions">
              <SpeakerButton
                text={`Apni dawa ${dueToast.label} waqt par lein`}
                language="ur"
              />
              {dueToast.id && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    const id = dueToast.id!;
                    void updateReminderStatus(patientId, id, "TAKEN", "Taken from alert")
                      .then((updated) =>
                        setActiveReminders((prev) => prev.map((r) => (r.id === id ? updated : r))),
                      )
                      .catch(() => {});
                    setDueToast(null);
                  }}
                >
                  <Check size={15} />
                  <span>{t("reminderMarkTaken")}</span>
                </button>
              )}
              <button
                type="button"
                className="icon-button"
                aria-label={t("reminderDismiss")}
                onClick={() => setDueToast(null)}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}
        {busy ? (
        <div className="content-wrap inner-page">
          <ProcessingExperience image={original} />
        </div>
      ) : view === "home" ? (
        <HomeExperience navigate={navigate} scan={scan} />
      ) : (
        <div className="content-wrap inner-page">
          <div className="section-heading">
            <div>
              <button
                type="button"
                className="page-back-chip"
                onClick={() => navigate("home")}
              >
                <ArrowLeft size={16} className="directional" />
                <span>{t("back")}</span>
              </button>
              <span className="eyebrow">{t("brand")}</span>
              <h1>
                {t(
                  view === "results"
                    ? "results"
                    : view === "medicines"
                      ? "cabinetTitle"
                      : view === "history"
                        ? "historyTitle"
                        : view === "settings"
                          ? "settingsTitle"
                          : view === "verify"
                            ? "verifyHeading"
                            : view === "reminders"
                              ? "reminderTitle"
                              : "cameraTitle",
                )}
              </h1>
            </div>
          </div>
          {error && (
            <div className="error-panel" role="alert">
              {error === "saveFailed" ? t("saveFailed") : error}
              <SpeakerButton
                text={error === "saveFailed" ? t("saveFailed") : error}
                language={language}
              />
            </div>
          )}
          {errorDetail && !error && (
            <div className="error-panel" role="alert">
              {errorDetail}
            </div>
          )}
          {view === "scan" && (
            <BackendStatus quiet onOpenDemo={() => setDemoOpen(true)} />
          )}
          {view === "scan" && (
            <ParchiCamera
              onSelect={handleScan}
              busy={busy}
              cabinetCount={cabinetMeds.length}
              useCabinet={useCabinet}
              onToggleCabinet={setUseCabinet}
              onOpenDemo={() => setDemoOpen(true)}
            />
          )}
          {view === "results" && scan && (
            <>
              <div className="save-controls">
                <p>{t("resultsBody")}</p>
                <button
                  className="secondary-button"
                  onClick={saveCurrent}
                  disabled={records.some(
                    (r) => r.scan.scan_id === scan.scan_id,
                  )}
                >
                  {records.some((r) => r.scan.scan_id === scan.scan_id) ? (
                    <Check size={18} />
                  ) : (
                    <Save size={18} />
                  )}{" "}
                  {t(
                    records.some((r) => r.scan.scan_id === scan.scan_id)
                      ? "saved"
                      : "save",
                  )}
                </button>
              </div>
              <PrescriptionResults
                scan={scan}
                original={original}
                originalFile={originalFile}
                onRetake={() => navigate("scan")}
                onScheduleReminders={() => navigate("reminders")}
              />
            </>
          )}
          {view === "verify" && (
            <VerificationExperience
              scan={scan}
              onScan={() => navigate("scan")}
              onVerified={(lineId: string, stripRes: StripResult) => {
                if (!scan) return;
                if (!["EXACT_MATCH", "GENERIC_EQUIVALENT_MATCH"].includes(stripRes.verification_status)) return;
                const updatedScan: ScanResult = {
                  ...scan,
                  medications: scan.medications.map((m) =>
                    m.line_id === lineId
                      ? {
                          ...m,
                          strip_verified: true,
                          strip_thumbnail_url: stripRes.strip_thumbnail_url ?? m.strip_thumbnail_url,
                        }
                      : m,
                  ),
                };
                setScan(updatedScan);
                const nextRecords = records.map((r) =>
                  r.scan.scan_id === updatedScan.scan_id ? { ...r, scan: updatedScan } : r,
                );
                if (nextRecords.some((r) => r.scan.scan_id === updatedScan.scan_id)) {
                  writeRecords(nextRecords);
                  setRecords(nextRecords);
                }
              }}
            />
          )}
          {(view === "medicines" || view === "history") && (
            <MedicineLibrary
              records={records}
              cabinetItems={cabinetItems}
              current={scan}
              history={view === "history"}
              onOpen={(record) => openScanResults(record)}
              onDelete={removeRecord}
              onScan={() => navigate("scan")}
              onAddCabinet={handleAddCabinet}
              onRemoveCabinet={handleRemoveCabinet}
              onClearCabinet={handleClearCabinet}
              onSyncHistory={async () => {
                const summaries = await fetchPatientScans(patientId);
                if (!summaries.length) return 0;
                const existingIds = new Set(records.map((r) => r.scan.scan_id));
                const fetched = await Promise.all(
                  summaries
                    .filter((s) => !existingIds.has(s.scan_id))
                    .slice(0, 10)
                    .map(async (s) => {
                      const full = await fetchScanById(s.scan_id);
                      return full ? { savedAt: s.created_at, scan: full } : null;
                    }),
                );
                const fresh = fetched.filter(
                  (item): item is SavedPrescription => item !== null,
                );
                if (fresh.length > 0) {
                  const merged = [...fresh, ...records].slice(0, 20);
                  writeRecords(merged);
                  setRecords(merged);
                }
                return summaries.length;
              }}
            />
          )}
          {view === "reminders" && (
            <ReminderExperience
              scan={scan}
              onRemindersChanged={setActiveReminders}
              onTestAlert={(label, time) => triggerDoseNotification(label, time)}
            />
          )}
          {view === "settings" && (
            <SettingsExperience
              onHistory={() => navigate("history")}
              diagnostics={diagnostics}
              onDiagnostics={setDiagnostics}
            />
          )}
        </div>
      )}
      <DemoModeDrawer
        open={demoOpen}
        offlineRequested={demoOffline}
        onClose={() => setDemoOpen(false)}
        onSelectScan={(demoScan) => openScanResults(demoScan)}
      />
      {diagnostics && <DevProofDrawer scan={scan} enabled />}
    </AppShell>
  );
}
