"use client";

import { useState } from "react";
import { Moon, Sun, Sunrise, Utensils, Printer, CheckCircle2, ArrowLeft } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { Medication, ScanResult, StripResult } from "@/lib/api";
import { assetUrl } from "@/lib/api";
import SpeakerButton from "./SpeakerButton";
import StripVerifierModal from "./StripVerifierModal";

const slots = [
  { key: "morning", label: "صبح", icon: Sunrise, tone: "morning" },
  { key: "afternoon", label: "دوپہر", icon: Sun, tone: "noon" },
  { key: "night", label: "رات", icon: Moon, tone: "night" },
] as const;

export default function VisualDoseCard({ medication, scan }: { medication: Medication; scan: ScanResult }) {
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [strip, setStrip] = useState<StripResult | null>(null);
  const schedule = medication.schedule;
  const line = `${medication.brand_matched} ${medication.strength_mg ?? ""} mg. ${schedule?.morning ? `صبح ${schedule.morning} گولی۔` : ""} ${schedule?.afternoon ? `دوپہر ${schedule.afternoon} گولی۔` : ""} ${schedule?.night ? `رات ${schedule.night} گولی۔` : ""} ${schedule?.duration_days ? `${schedule.duration_days} دن۔` : ""}`;
  const qrValue = typeof window !== "undefined" ? `${window.location.origin}/audio/${scan.scan_id}` : scan.audio_qr_payload || "";
  const showThumb = strip && ["EXACT_MATCH", "GENERIC_EQUIVALENT_MATCH"].includes(strip.verification_status) && strip.strip_thumbnail_url;
  return <article className="dose-card">
    <div className="dose-top"><div><span className="eyebrow text-emerald-800">دوا کا معمول</span><h3 dir="ltr" className="dose-name">{medication.brand_matched} <span>{medication.strength_mg} mg</span></h3><p dir="ltr" className="salt-name">{medication.generic_salts?.join(" + ")}</p></div><SpeakerButton text={line} /></div>
    {medication.who_aware_tier && medication.who_aware_tier !== "NONE" && <span className="aware-badge">WHO AWaRe · {medication.who_aware_tier}</span>}
    <div className="slot-grid" aria-label="دوا لینے کے اوقات">{slots.map(slot => { const Icon = slot.icon; const qty = schedule?.[slot.key] || 0; return <div className={`slot ${slot.tone} ${qty ? "active" : "inactive"}`} key={slot.key}><Icon size={26} strokeWidth={1.8} /><span>{slot.label}</span><strong>{qty ? `${qty} گولی` : "—"}</strong></div>; })}</div>
    <div className="dose-meta"><span><Utensils size={18} />{schedule?.meal_timing === "before_food" ? "کھانے سے پہلے · خالی پلیٹ" : schedule?.meal_timing === "after_food" ? "کھانے کے بعد · بھری پلیٹ" : "کھانے کے ساتھ یا بغیر"}</span>{schedule?.duration_days && <span>{schedule.duration_days} دن</span>}</div>
    {medication.drap_shortage_alert && <p className="notice-text">{medication.drap_shortage_alert}</p>}
    {medication.requires_day3_checkin && <p className="day3-note">اینٹی بایوٹک کا کورس ڈاکٹر کی ہدایت کے مطابق مکمل کریں۔</p>}
    {strip && <div className={`strip-result ${showThumb ? "strip-good" : "strip-bad"}`} role="status"><CheckCircle2 size={18} /><span>{strip.urdu_verdict}</span><SpeakerButton text={strip.urdu_verdict} audioUrl={strip.audio_urdu_url} /></div>}
    {showThumb && <img src={assetUrl(strip.strip_thumbnail_url)} alt="تصدیق شدہ دوا کی پٹی" className="strip-thumb" />}
    <div className="dose-actions"><button type="button" className="verify-button" onClick={() => setVerifyOpen(true)}>دوا چیک کریں <ArrowLeft size={18} /></button><button type="button" className="print-button" onClick={() => window.print()} aria-label="دوا کا کارڈ پرنٹ کریں"><Printer size={18} /> پرنٹ</button></div>
    <div className="qr-row"><div><strong>آواز دوبارہ سنیں</strong><p>اس QR کو اسکین کریں</p></div><QRCodeSVG value={qrValue} size={68} marginSize={1} /></div>
    <StripVerifierModal open={verifyOpen} onClose={() => setVerifyOpen(false)} medication={medication} scanId={scan.scan_id} onVerified={setStrip} />
  </article>;
}
