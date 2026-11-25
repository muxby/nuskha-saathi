"use client";
import {
  ArrowUpRight,
  ShieldCheck,
  Sunrise,
  Sun,
  Moon,
  MessageCircle,
  ArrowRight,
  Pill,
  CalendarClock,
  Play,
  History,
  Camera,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import type { View } from "./AppShell";
import { PrescriptionArt, WaveArt, StripArt } from "./MedicalArt";
import type { ScanResult } from "@/lib/api";
export default function HomeExperience({
  navigate,
  scan,
}: {
  navigate: (v: View) => void;
  scan: ScanResult | null;
}) {
  const { t } = useLanguage();
  return (
    <div className="homepage content-wrap">
      <section className="home-intro">
        <span className="eyebrow intro-kicker">{t("heroKicker")}</span>
        <h1>
          <span className="desktop-copy">
            {t("heroOne")}
            <br />
            <em>{t("heroTwo")}</em>
          </span>
          <span className="mobile-copy">
            {t("mobileOne")}
            <br />
            <em>{t("mobileTwo")}</em>
          </span>
        </h1>
        <p className="desktop-copy">{t("heroBody")}</p>
        <p className="mobile-copy">{t("mobileBody")}</p>
        <div className="intro-side">
          <span>01 — 06</span>
          <span>{t("tagline")}</span>
        </div>
      </section>
      <section className="bento-grid" aria-label={t("home")}>
        <article className="bento-card scan-feature">
          <div className="feature-top">
            <span className="eyebrow">01 — {t("intelligence")}</span>
            <ArrowUpRight size={23} />
          </div>
          <h2>{t("scanTitle")}</h2>
          <PrescriptionArt />
          <div className="scan-feature-bottom">
            <p>{t("scanDescription")}</p>
            <button
              className="primary-button"
              type="button"
              onClick={() => navigate("scan")}
            >
              <Camera size={22} />
              <span className="desktop-copy">{t("scan")}</span>
              <span className="mobile-copy">{t("openCamera")}</span>
              <ArrowRight className="directional" size={20} />
            </button>
          </div>
        </article>
        <button
          type="button"
          className="bento-card voice-feature"
          onClick={() => navigate(scan ? "results" : "scan")}
        >
          <div className="feature-top">
            <span className="eyebrow">02 — {t("voice")}</span>
            <ArrowUpRight size={22} />
          </div>
          <h2>{t("voiceTitle")}</h2>
          <WaveArt />
          <p>{t("voiceDescription")}</p>
          <div className="feature-foot">
            <span>{t("urduVoice")}</span>
            <span className="round-play">
              <Play size={17} fill="currentColor" />
            </span>
          </div>
        </button>
        <button
          type="button"
          className="bento-card verification-feature"
          onClick={() => navigate("verify")}
        >
          <div className="feature-top">
            <ShieldCheck size={26} />
            <span className="eyebrow">03</span>
          </div>
          <StripArt />
          <h3>{t("verificationTitle")}</h3>
          <p>{t("verificationBody")}</p>
        </button>
        <button
          type="button"
          className="bento-card schedule-feature"
          onClick={() => navigate("medicines")}
        >
          <div className="feature-top">
            <CalendarClock size={26} />
            <span className="eyebrow">04</span>
          </div>
          <div className="schedule-art" aria-hidden="true">
            <span>
              <Sunrise size={29} />
              <i />
            </span>
            <span>
              <Sun size={29} />
              <i />
            </span>
            <span>
              <Moon size={29} />
              <i />
            </span>
          </div>
          <h3>{t("scheduleTitle")}</h3>
          <p>{t("scheduleBody")}</p>
        </button>
        <button
          type="button"
          className="bento-card reminder-feature"
          onClick={() => navigate("reminders")}
        >
          <div className="feature-top">
            <MessageCircle size={26} />
            <span className="eyebrow">05</span>
          </div>
          <div className="voice-note-art" aria-hidden="true">
            <Play size={16} fill="currentColor" />
            <div className="note-wave">
              {[12, 22, 16, 29, 18, 25, 15, 10, 23, 14, 25, 18].map((h, i) => (
                <i key={i} style={{ height: h }} />
              ))}
            </div>
          </div>
          <h3>{t("remindersTitle")}</h3>
          <p>{t("remindersBody")}</p>
        </button>
        <article className="bento-card safety-feature">
          <div className="safety-seal">
            <ShieldCheck size={31} />
          </div>
          <div>
            <span className="eyebrow">06 — {t("safetyTitle")}</span>
            <p>{t("safetyBody")}</p>
          </div>
        </article>
      </section>
      <section className="mobile-schedule">
        <div className="section-heading">
          <h2>{t("today")}</h2>
          <CalendarClock size={24} />
        </div>
        <div className="panel">
          {scan?.medications.some(
            (m) => m.status === "VERIFIED" && m.schedule,
          ) ? (
            <>
              <p>{t("currentSession")}</p>
              <button
                className="secondary-button"
                onClick={() => navigate("results")}
              >
                {t("seeSchedule")}
                <ArrowRight size={18} />
              </button>
            </>
          ) : (
            <>
              <Sunrise size={30} />
              <h3>{t("noSchedule")}</h3>
              <p>{t("noScheduleBody")}</p>
            </>
          )}
        </div>
      </section>
      <div className="mobile-quick-actions">
        <button onClick={() => navigate("verify")}>
          <Pill size={27} />
          <strong>{t("verify")}</strong>
          <span>{t("verificationBody")}</span>
        </button>
        <button onClick={() => navigate(scan ? "results" : "scan")}>
          <Play size={27} />
          <strong>{t("listen")}</strong>
          <span>{t("urduVoice")}</span>
        </button>
        <button onClick={() => navigate("medicines")}>
          <CalendarClock size={27} />
          <strong>{t("doseSchedule")}</strong>
          <span>{t("seeSchedule")}</span>
        </button>
        <button onClick={() => navigate("history")}>
          <History size={27} />
          <strong>{t("prescriptions")}</strong>
          <span>{t("savedRecords")}</span>
        </button>
      </div>
    </div>
  );
}
