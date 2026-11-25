"use client";
import ProcessingExperience from "@/components/ProcessingExperience";
import { useEffect, useState } from "react";
import AppShell, { type View } from "@/components/AppShell";
import HomeExperience from "@/components/HomeExperience";
import { useLanguage } from "@/lib/i18n";
import ParchiCamera from "@/components/ParchiCamera";
import PrescriptionResults from "@/components/PrescriptionResults";
import DevProofDrawer from "@/components/DevProofDrawer";
import { postForm, type ScanResult } from "@/lib/api";
export default function Home() {
  const { t } = useLanguage();
  const [view, setView] = useState<View>("home");
  const [scan, setScan] = useState<ScanResult | null>(null);
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
    {view === "results" && scan && <PrescriptionResults scan={scan} original={original} onRetake={()=>navigate("scan")}/>}
    {!["scan","results"].includes(view) && <div className="panel"><h2>{t(view === "verify" ? "verifyFirst" : view === "reminders" ? "comingSoon" : "noSchedule")}</h2><p>{t(view === "reminders" ? "reminderUnavailable" : view === "verify" ? "verifyFirstBody" : "noScheduleBody")}</p><button className="primary-button" onClick={()=>navigate("scan")}>{t("scan")}</button></div>}
    </div>}<DevProofDrawer scan={scan}/>
  </AppShell>;
}
