"use client";
import { useEffect, useState } from "react";
import ClinicalText from "@/components/ClinicalText";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { LanguageSwitch, useLanguage } from "@/lib/i18n";
import AudioPlayer from "@/components/AudioPlayer";
import { BrandMark } from "@/components/MedicalArt";
type AudioMeta = {
  scan_id: string;
  urdu_script: string;
  audio_urdu_url: string | null;
};
export default function AudioPage() {
  const { scanId } = useParams<{ scanId: string }>();
  const { t } = useLanguage();
  const [meta, setMeta] = useState<AudioMeta | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setMeta(null);
    setError(false);
    fetch(`${API_BASE}/api/v1/audio/${encodeURIComponent(scanId)}`, {
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setMeta)
      .catch((err) => {
        if (err.name !== "AbortError") setError(true);
      });
    return () => controller.abort();
  }, [scanId]);
  return (
    <main className="audio-page">
      <div className="audio-box">
        <header className="audio-page-header">
          <span className="brand-mark">
            <BrandMark size={24} />
          </span>
          <strong>{t("brand")}</strong>
          <LanguageSwitch />
        </header>
        <span className="eyebrow">{t("urduVoice")}</span>
        <h1>{t("audioTitle")}</h1>
        {meta ? (
          <>
            <AudioPlayer
              text={meta.urdu_script}
              audioUrl={meta.audio_urdu_url}
            />
            <details className="audio-transcript">
              <summary>{t("backendUrdu")}</summary>
              <ClinicalText text={meta.urdu_script} />
            </details>
          </>
        ) : error ? (
          <p role="alert">{t("audioMissing")}</p>
        ) : (
          <div className="audio-skeleton" role="status">
            {t("audioLoading")}
            <i />
            <i />
            <i />
          </div>
        )}
        <Link href="/" className="back-link">
          <ArrowLeft size={18} className="directional" />
          {t("newScan")}
        </Link>
      </div>
    </main>
  );
}
