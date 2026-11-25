"use client";
import { useState } from "react";
import AppShell, { type View } from "@/components/AppShell";
import HomeExperience from "@/components/HomeExperience";
import { useLanguage } from "@/lib/i18n";
import ParchiCamera from "@/components/ParchiCamera";
import SafetyAlertBanner from "@/components/SafetyAlertBanner";
import VisualDoseCard from "@/components/VisualDoseCard";
import DevProofDrawer from "@/components/DevProofDrawer";
import SpeakerButton from "@/components/SpeakerButton";
import { postForm, type ScanResult } from "@/lib/api";
export default function Home() {
  const { t } = useLanguage();
  const [view, setView] = useState<View>("home");
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = (next: View) => { setView(next); setError(""); window.scrollTo({ top: 0, behavior: "instant" }); };
  async function handleScan(file: File) {
    setBusy(true); setError(""); setScan(null);
    const form = new FormData(); form.append("file", file);
    try { const result = await postForm<ScanResult>("/api/v1/scan-parchi", form); setScan(result); setView("results"); }
    catch { setError(t("uploadError")); }
    finally { setBusy(false); }
  }
  return <AppShell view={view} navigate={navigate}>
    {view === "home" ? <HomeExperience navigate={navigate} scan={scan}/> : <div className="content-wrap inner-page"><div className="section-heading"><div><span className="eyebrow">{t("brand")}</span><h1>{t(view === "results" ? "results" : view === "medicines" ? "cabinetTitle" : view === "history" ? "historyTitle" : view === "settings" ? "settingsTitle" : view === "verify" ? "verifyHeading" : view === "reminders" ? "reminderTitle" : "cameraTitle")}</h1></div></div>
    {error && <div className="error-panel" role="alert">{error}</div>}
    {view === "scan" && <ParchiCamera onSelect={handleScan} busy={busy}/>}
    {view === "results" && scan && <section className="results"><SafetyAlertBanner interactions={scan.interactions} medications={scan.medications}/><div className="cards-heading"><h2>{t("doseSchedule")}</h2><SpeakerButton text={scan.urdu_script} audioUrl={scan.audio_urdu_url} label={t("fullAudio")}/></div><div className="dose-grid">{scan.medications.filter(m=>m.status==="VERIFIED").map(m=><VisualDoseCard key={m.line_id} medication={m} scan={scan}/>)}</div></section>}
    {!["scan","results"].includes(view) && <div className="panel"><h2>{t(view === "verify" ? "verifyFirst" : view === "reminders" ? "comingSoon" : "noSchedule")}</h2><p>{t(view === "reminders" ? "reminderUnavailable" : view === "verify" ? "verifyFirstBody" : "noScheduleBody")}</p><button className="primary-button" onClick={()=>navigate("scan")}>{t("scan")}</button></div>}
    </div>}<DevProofDrawer scan={scan}/>
  </AppShell>;
}
