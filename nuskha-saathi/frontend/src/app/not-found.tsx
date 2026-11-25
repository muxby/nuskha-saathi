"use client";
import Link from "next/link";
import { HeartPulse, ArrowLeft } from "lucide-react";
import { LanguageSwitch, useLanguage } from "@/lib/i18n";
export default function NotFound() {
  const { t } = useLanguage();
  return (
    <main className="audio-page">
      <section className="audio-box">
        <header className="audio-page-header">
          <span className="brand-mark">
            <HeartPulse size={24} />
          </span>
          <strong>{t("brand")}</strong>
          <LanguageSwitch />
        </header>
        <span className="eyebrow">404</span>
        <h1>{t("notFoundTitle")}</h1>
        <p>{t("notFoundBody")}</p>
        <Link className="back-link" href="/">
          <ArrowLeft size={20} className="directional" />
          {t("home")}
        </Link>
      </section>
    </main>
  );
}
