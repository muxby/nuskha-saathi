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
import { Save, Check, ArrowLeft } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import AppShell, { type View } from "@/components/AppShell";
import HomeExperience from "@/components/HomeExperience";
import { useLanguage } from "@/lib/i18n";
import DevProofDrawer from "@/components/DevProofDrawer";
import DemoModeDrawer from "@/components/DemoModeDrawer";
import {
  addCabinetMed,
  clearCabinet,
  fetchCabinet,
  postForm,
  removeCabinetMed,
  type CabinetItem,
  type ScanResult,
} from "@/lib/api";

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
    navigate("results");
  }

  const [diagnostics, setDiagnostics] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoOffline, setDemoOffline] = useState(false);
  const [records, setRecords] = useState<SavedPrescription[]>([]);
  const [cabinetItems, setCabinetItems] = useState<CabinetItem[]>([]);
  const [patientId, setPatientId] = useState("anonymous");
  const [useCabinet, setUseCabinet] = useState(true);

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
    return () => ctrl.abort();
  }, []);

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
  useEffect(
    () => () => {
      if (original) URL.revokeObjectURL(original);
    },
    [original],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<
    "" | "saveFailed" | "networkError" | "photoLarge" | "uploadError"
  >("");

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

  async function handleScan(file: File) {
    const request = new AbortController();
    controller.current?.abort();
    controller.current = request;
    setBusy(true);
    setError("");
    setScan(null);
    setOriginal(URL.createObjectURL(file));
    const form = new FormData();
    form.append("file", file);
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
      if (!request.signal.aborted)
        setError(
          err instanceof Error && err.message === "NETWORK"
            ? "networkError"
            : err instanceof Error && err.message === "TOO_LARGE"
              ? "photoLarge"
              : "uploadError",
        );
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
              {t(error)}
              <SpeakerButton text={t(error)} language={language} />
            </div>
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
                onRetake={() => navigate("scan")}
              />
            </>
          )}
          {view === "verify" && (
            <VerificationExperience
              scan={scan}
              onScan={() => navigate("scan")}
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
            />
          )}
          {view === "reminders" && <ReminderExperience scan={scan} />}
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
