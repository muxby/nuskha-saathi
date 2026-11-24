"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X, LoaderCircle } from "lucide-react";
import type { Medication, StripResult } from "@/lib/api";
import { postForm } from "@/lib/api";
import { speak } from "./SpeakerButton";

export default function StripVerifierModal({ open, onClose, medication, scanId, onVerified }: { open: boolean; onClose: () => void; medication: Medication; scanId: string; onVerified: (result: StripResult) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (open) closeButton.current?.focus(); }, [open]);
  useEffect(() => { if (!open) return; const key = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); }, [open, onClose]);
  if (!open) return null;
  async function submit(file?: File) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setError("تصویر 8 MB سے بڑی ہے۔"); return; }
    setBusy(true); setError("");
    const form = new FormData();
    form.append("file", file); form.append("scan_id", scanId); form.append("matched_line_id", medication.line_id);
    form.append("expected_brand", medication.brand_matched || "");
    form.append("expected_strength_mg", String(medication.strength_mg || 0));
    form.append("expected_salts", medication.generic_salts?.join(",") || "");
    if (medication.schedule) {
      form.append("morning_qty", String(medication.schedule.morning));
      form.append("afternoon_qty", String(medication.schedule.afternoon));
      form.append("night_qty", String(medication.schedule.night));
      form.append("meal_timing", medication.schedule.meal_timing);
    }
    try { const result = await postForm<StripResult>("/api/v1/verify-strip", form); onVerified(result); speak(result.urdu_verdict, result.audio_urdu_url); onClose(); }
    catch (err) { const message = err instanceof Error ? err.message : "پٹی کی جانچ نہیں ہو سکی۔"; setError(message); speak(message); }
    finally { setBusy(false); }
  }
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="strip-title">
    <button ref={closeButton} type="button" className="modal-close" onClick={onClose} aria-label="بند کریں"><X size={22} /></button>
    <div className="modal-art"><Camera size={38} /></div><span className="eyebrow text-emerald-800">دوا کی تصدیق</span><h2 id="strip-title">دوا کی پٹی چیک کریں</h2>
    <p>پٹی پر لکھا نام اور مقدار صاف نظر آنے والی تصویر لیں۔ اسے پرچی کی دوا <b dir="ltr">{medication.brand_matched}</b> سے ملایا جائے گا۔</p>
    <input ref={input} type="file" accept="image/*" capture="environment" className="sr-only" onChange={e => submit(e.target.files?.[0])} />
    <button type="button" disabled={busy} className="primary-button w-full" onClick={() => input.current?.click()}>{busy ? <LoaderCircle className="animate-spin" size={20} /> : <Camera size={20} />}{busy ? "جانچ ہو رہی ہے…" : "پٹی کی تصویر لیں"}</button>
    {error && <p className="error-text" role="alert">{error}</p>}
  </section></div>;
}
