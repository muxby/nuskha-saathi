"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Volume2, ArrowRight, HeartPulse } from "lucide-react";
import { API_BASE } from "@/lib/api";
import SpeakerButton from "@/components/SpeakerButton";

type AudioMeta = { scan_id: string; urdu_script: string; audio_urdu_url: string | null };
export default function AudioPage() {
  const { scanId } = useParams<{ scanId: string }>();
  const [meta, setMeta] = useState<AudioMeta | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { fetch(`${API_BASE}/api/v1/audio/${encodeURIComponent(scanId)}`).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(setMeta).catch(() => setError("یہ آواز دستیاب نہیں۔ براہِ کرم پرچی دوبارہ اسکین کریں۔")); }, [scanId]);
  return <main className="audio-page"><div className="audio-box"><div className="brand-mark"><HeartPulse size={25} /></div><span className="eyebrow text-emerald-800">نسخہ ساتھی</span><h1>پرچی کی آواز</h1>{meta ? <><div className="audio-symbol"><Volume2 size={42} /></div><p className="audio-script">{meta.urdu_script}</p><SpeakerButton text={meta.urdu_script} audioUrl={meta.audio_urdu_url} label="دوبارہ سنیں" /></> : error ? <p role="alert">{error}</p> : <p>آواز لوڈ ہو رہی ہے…</p>}<Link href="/" className="back-link"><ArrowRight size={18} /> نئی پرچی اسکین کریں</Link></div></main>;
}
