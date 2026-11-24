"use client";

import { useState } from "react";
import { ArrowLeft, HeartPulse, ShieldCheck, Sparkles, FileText } from "lucide-react";
import ParchiCamera from "@/components/ParchiCamera";
import SafetyAlertBanner from "@/components/SafetyAlertBanner";
import VisualDoseCard from "@/components/VisualDoseCard";
import DevProofDrawer from "@/components/DevProofDrawer";
import SpeakerButton, { speak } from "@/components/SpeakerButton";
import { postForm, type ScanResult } from "@/lib/api";

export default function Home() {
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function handleScan(file: File) {
    setBusy(true); setError(""); setScan(null);
    const form = new FormData(); form.append("file", file);
    try { const result = await postForm<ScanResult>("/api/v1/scan-parchi", form); setScan(result); }
    catch (err) { const message = err instanceof Error ? err.message : "پرچی کی جانچ نہیں ہو سکی۔"; setError(message); speak(message); }
    finally { setBusy(false); }
  }
  return <main className="site-shell">
    <header className="site-header"><div className="brand-mark"><HeartPulse size={25} strokeWidth={2.1} /></div><div className="brand-copy"><strong>نسخہ ساتھی</strong><span dir="ltr">NUSKHA SAATHI</span></div><div className="header-pill"><span className="pulse-dot" />آپ کی دوا، آپ کی سمجھ</div></header>
    <section className="hero"><div className="hero-inner"><div className="hero-copy"><span className="hero-kicker"><Sparkles size={16} /> صحت کی معلومات، آسان زبان میں</span><h1>اپنی پرچی <em>سمجھیں۔</em><br />اعتماد سے دوا لیں۔</h1><p>پرچی کی تصویر لیں۔ دوا کا وقت، اہم حفاظتی انتباہ اور اردو میں ہدایات ایک ہی جگہ پائیں۔</p><ParchiCamera onSelect={handleScan} busy={busy} /><div className="hero-trust"><ShieldCheck size={18} /><span>غیر واضح دوا کے بارے میں ہم اندازہ نہیں لگاتے</span></div></div><div className="hero-visual" aria-hidden="true"><div className="halo halo-one" /><div className="halo halo-two" /><div className="sample-card"><div className="sample-top"><span>آپ کا روزانہ معمول</span><span className="sample-check">✓ تصدیق شدہ</span></div><div className="sample-med">Panadol <small>500 mg</small></div><div className="sample-slots"><span>☀<b>صبح</b>1 گولی</span><span>◐<b>دوپہر</b>—</span><span>☾<b>رات</b>1 گولی</span></div><div className="sample-bottom">◉ کھانے کے بعد <span>۳ دن</span></div></div><div className="floating-note">🔊&nbsp; اردو میں سنیں</div></div></div></section>
    <div className="content-wrap">
      {error && <div className="error-panel" role="alert">{error}<SpeakerButton text={error} /></div>}
      {scan ? <section className="results" aria-live="polite"><div className="section-heading"><div><span className="eyebrow text-emerald-800">اسکین کا نتیجہ</span><h2>آپ کی پرچی کی معلومات</h2><p>ہر دوا کی تفصیل دیکھیں اور پٹی کو الگ سے چیک کریں۔</p></div><button className="new-scan" type="button" onClick={() => setScan(null)}>نیا اسکین <ArrowLeft size={18} /></button></div><SafetyAlertBanner interactions={scan.interactions} medications={scan.medications} /><div className="cards-heading"><h2>دوا کے اوقات</h2><SpeakerButton text={scan.urdu_script} audioUrl={scan.audio_urdu_url} label="مکمل ہدایات سنیں" /></div><div className="dose-grid">{scan.medications.filter(m => m.status === "VERIFIED").map(m => <VisualDoseCard key={m.line_id} medication={m} scan={scan} />)}</div>{scan.overall_status === "REFUSED" && <p className="empty-result">پرچی واضح نہیں تھی۔ روشن جگہ پر دوبارہ تصویر لیں یا فارماسسٹ سے تصدیق کریں۔</p>}</section> : <section className="how-it-works"><div className="section-heading"><div><span className="eyebrow text-emerald-800">تین آسان قدم</span><h2>سیدھا، صاف، محفوظ</h2></div></div><div className="steps-grid"><div className="step"><span className="step-number">01</span><div className="step-icon"><FileText size={24} /></div><h3>پرچی کی تصویر</h3><p>صاف روشنی میں پرچی کی تصویر لیں یا گیلری سے منتخب کریں۔</p></div><div className="step"><span className="step-number">02</span><div className="step-icon"><ShieldCheck size={24} /></div><h3>حفاظتی جانچ</h3><p>غیر واضح نام اور ممکنہ دوا کے تضاد پر واضح انتباہ ملتا ہے۔</p></div><div className="step"><span className="step-number">03</span><div className="step-icon"><HeartPulse size={24} /></div><h3>وقت اور آواز</h3><p>صبح، دوپہر اور رات کا معمول دیکھیں اور اردو میں سنیں۔</p></div></div><div className="cabinet-preview"><div className="step-icon"><HeartPulse size={22} /></div><div><h3>آپ کی دواؤں کی الماری</h3><p>پہلے سے لی جانے والی دوائیں یہاں نظر آئیں گی۔ یہ سہولت اگلے مرحلے میں آئے گی۔</p></div></div></section>}
      <footer className="site-footer"><p>یہ ایپ ڈاکٹر یا فارماسسٹ کا متبادل نہیں۔ دوا بدلنے یا روکنے سے پہلے ان سے مشورہ کریں۔</p><span dir="ltr">Nuskha Saathi · Dawa-Guard</span></footer>
    </div><DevProofDrawer scan={scan} />
  </main>;
}
