"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, LoaderCircle } from "lucide-react";
import { speak } from "./SpeakerButton";

export default function ParchiCamera({ onSelect, busy }: { onSelect: (file: File) => void; busy: boolean }) {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  function fail(message: string) { setError(message); speak(message); }
  function choose(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return fail("براہِ کرم تصویر منتخب کریں۔");
    if (file.size > 8 * 1024 * 1024) return fail("تصویر 8 MB سے بڑی ہے۔ چھوٹی تصویر منتخب کریں۔");
    setError("");
    onSelect(file);
  }
  return <div className="camera-actions">
    <input ref={camera} type="file" accept="image/*" capture="environment" className="sr-only" onChange={e => choose(e.target.files?.[0])} aria-label="کیمرے سے پرچی کی تصویر لیں" />
    <input ref={gallery} type="file" accept="image/*" className="sr-only" onChange={e => choose(e.target.files?.[0])} aria-label="پرچی کی تصویر منتخب کریں" />
    <button className="primary-button" type="button" disabled={busy} onClick={() => camera.current?.click()}>
      {busy ? <LoaderCircle size={22} className="animate-spin" /> : <Camera size={22} />}<span>{busy ? "پرچی کی جانچ ہو رہی ہے…" : "پرچی اسکین کریں"}</span>
    </button>
    <button className="secondary-button" type="button" disabled={busy} onClick={() => gallery.current?.click()}><ImagePlus size={20} /><span>گیلری سے تصویر</span></button>
    {error && <p className="error-text" role="alert">{error}</p>}
  </div>;
}
