"use client";
import ProcessingExperience from "@/components/ProcessingExperience";
import { MedicineLibrary, ReminderExperience, SettingsExperience } from "@/components/MedicineLibrary";
import { readRecords, writeRecords, type SavedPrescription } from "@/lib/records";
import { Save, Check } from "lucide-react";
import { useEffect, useState } from "react";
import AppShell, { type View } from "@/components/AppShell";
import HomeExperience from "@/components/HomeExperience";
import { useLanguage } from "@/lib/i18n";
import ParchiCamera from "@/components/ParchiCamera";
import VerificationExperience from "@/components/VerificationExperience";
import PrescriptionResults from "@/components/PrescriptionResults";
import DevProofDrawer from "@/components/DevProofDrawer";
import { postForm, type ScanResult } from "@/lib/api";
export default function Home() {
  const { t } = useLanguage();
  const [view, setView] = useState<View>("home");
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [diagnostics, setDiagnostics] = useState(false);
  const [records, setRecords] = useState<SavedPrescription[]>([]);
  useEffect(() => setRecords(readRecords()), []);
  function saveCurrent() { if (!scan) return; const updated = [{ savedAt: new Date().toISOString(), scan }, ...records.filter(r=>r.scan.scan_id!==scan.scan_id)].slice(0,20); try { writeRecords(updated);setRecords(updated); } catch {setError(t("saveFailed"));} }
  function removeRecord(id: string) { const updated=records.filter(r=>r.scan.scan_id!==id);try {writeRecords(updated);setRecords(updated);}catch{setError(t("saveFailed"));} }
  const [original, setOriginal] = useState<string | null>(null);
  useEffect(() => () => { if (original) URL.revokeObjectURL(original); }, [original]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = (next: View) => { setView(next); setError(""); window.scrollTo({ top: 0, behavior: "instant" }); };
  async function handleScan(file: File) {
    setBusy(true); setError(""); setScan(null); setOriginal(URL.createObjectURL(file));
    const form = new FormData(); form.append("file", file);
    try { const result = await postForm<ScanResult>("/api/v1/scan-parchi", form); setScan(result); setView("results"); }
    catch (err) { setError(t(err instanceof Error && err.message === "NETWORK" ? "networkError" : err instanceof Error && err.message === "TOO_LARGE" ? "photoLarge" : "uploadError")); }
    finally { setBusy(false); }
  }
  return <AppShell view={view} navigate={navigate}>
    {busy ? <div className="content-wrap inner-page"><ProcessingExperience image={original}/></div> : view === "home" ? <HomeExperience navigate={navigate} scan={scan}/> : <div className="content-wrap inner-page"><div className="section-heading"><div><span className="eyebrow">{t("brand")}</span><h1>{t(view === "results" ? "results" : view === "medicines" ? "cabinetTitle" : view === "history" ? "historyTitle" : view === "settings" ? "settingsTitle" : view === "verify" ? "verifyHeading" : view === "reminders" ? "reminderTitle" : "cameraTitle")}</h1></div></div>
    {error && <div className="error-panel" role="alert">{error}</div>}
    {view === "scan" && <ParchiCamera onSelect={handleScan} busy={busy}/>}
    {view === "results" && scan && <><div className="save-controls"><p>{t("resultsBody")}</p><button className="secondary-button" onClick={saveCurrent} disabled={records.some(r=>r.scan.scan_id===scan.scan_id)}>{records.some(r=>r.scan.scan_id===scan.scan_id)?<Check size={18}/>:<Save size={18}/>} {t(records.some(r=>r.scan.scan_id===scan.scan_id)?"saved":"save")}</button></div><PrescriptionResults scan={scan} original={original} onRetake={()=>navigate("scan")}/></>}
    {view === "verify" && <VerificationExperience scan={scan} onScan={()=>navigate("scan")}/>}
    {(view === "medicines" || view === "history") && <MedicineLibrary records={records} current={scan} history={view === "history"} onOpen={record=>{setScan(record);setOriginal(null);navigate("results");}} onDelete={removeRecord} onScan={()=>navigate("scan")}/>}
    {view === "reminders" && <ReminderExperience scan={scan}/>}
    {view === "settings" && <SettingsExperience onHistory={()=>navigate("history")} diagnostics={diagnostics} onDiagnostics={setDiagnostics}/>}
    </div>}<DevProofDrawer scan={scan} enabled={diagnostics}/>
  </AppShell>;
}
