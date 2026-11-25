"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Sunrise,
  Sun,
  Moon,
  MessageCircle,
  ArrowRight,
  Pill,
  CalendarClock,
  Play,
  Clock3,
  Camera,
  Volume2,
  VolumeX,
  ScanLine,
  CheckCircle2,
  FileText,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import type { View } from "./AppShell";
import {
  IconMedallion,
  PrescriptionArt,
  WaveArt,
  StripArt,
} from "./MedicalArt";
import OpticalPrismFilter from "./OpticalPrismFilter";
import type { ScanResult } from "@/lib/api";

type ExplainerStep = "read" | "safety" | "verify";

export default function HomeExperience({
  navigate,
  scan,
}: {
  navigate: (v: View) => void;
  scan: ScanResult | null;
}) {
  const { t } = useLanguage();
  const [step, setStep] = useState<ExplainerStep>("read");
  const [showRxOverlay, setShowRxOverlay] = useState(true);
  const [pulseWave, setPulseWave] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const portalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) return;
    const onMove = (e: PointerEvent) => {
      const el = portalRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const nx = Math.max(-1, Math.min(1, (e.clientX - cx) / 520));
      const ny = Math.max(-1, Math.min(1, (e.clientY - cy) / 360));
      setTilt({ x: ny * -3.5, y: nx * 4.5 });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  const explainerCopy: Record<
    ExplainerStep,
    {
      titleKey: "sampleReadTitle" | "sampleSafetyTitle" | "sampleVerifyTitle";
      descKey: "sampleReadDesc" | "sampleSafetyDesc" | "sampleVerifyDesc";
      chipKey: "sampleReadChip" | "sampleSafetyChip" | "sampleVerifyChip";
    }
  > = {
    read: {
      titleKey: "sampleReadTitle",
      descKey: "sampleReadDesc",
      chipKey: "sampleReadChip",
    },
    safety: {
      titleKey: "sampleSafetyTitle",
      descKey: "sampleSafetyDesc",
      chipKey: "sampleSafetyChip",
    },
    verify: {
      titleKey: "sampleVerifyTitle",
      descKey: "sampleVerifyDesc",
      chipKey: "sampleVerifyChip",
    },
  };

  function scrollToWorkflow() {
    document
      .getElementById("how-it-works")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="homepage">
      {/* Band 1: Opening Pill-Portal Split Stage (Pure Minimalism First Visual) */}
      <section className="pill-hero">
        <svg
          className="pill-hero-curves"
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M-120 780 C 260 660, 420 260, 860 120 S 1340 40, 1560 -40"
            fill="none"
            stroke="currentColor"
            strokeWidth="72"
            opacity="0.32"
          />
          <path
            d="M-80 200 C 280 340, 520 700, 980 760 S 1380 860, 1540 920"
            fill="none"
            stroke="currentColor"
            strokeWidth="54"
            opacity="0.24"
          />
          <path
            d="M420 -80 C 560 220, 920 440, 1500 520"
            fill="none"
            stroke="currentColor"
            strokeWidth="32"
            opacity="0.2"
          />
        </svg>

        <div className="content-wrap pill-hero-inner">
          <div className="pill-hero-top">
            <span className="pill-hero-eyebrow">{t("heroTag")}</span>
          </div>

          {/* Center Monumental Expanding Pill Aperture */}
          <div className="pill-center-unit">
            <h1 className="sr-only">
              {t("heroOne")} {t("heroTwo")}
            </h1>

            <div className="pill-split-stage" aria-hidden="false">
              <span className="split-wing split-wing-start" aria-hidden="true">
                {t("heroSplitLeft")}
              </span>

              <div
                ref={portalRef}
                className="hero-pill-portal"
                style={{
                  transform: `perspective(1200px) rotateX(${tilt.x.toFixed(2)}deg) rotateY(${tilt.y.toFixed(2)}deg)`,
                }}
              >
                <OpticalPrismFilter />
                <div className="portal-flutes" aria-hidden="true" />
                <div className="portal-bevel" aria-hidden="true" />

                <button
                  type="button"
                  className="portal-edge-btn portal-edge-start"
                  onClick={() => setShowRxOverlay((v) => !v)}
                  aria-label={t("pillPreviewToggle")}
                  aria-pressed={showRxOverlay}
                >
                  <Sparkles size={16} />
                </button>

                <div
                  className={`portal-inner-scene ${showRxOverlay ? "is-visible" : "is-prism-only"}`}
                  aria-hidden="true"
                >
                  <div className="portal-rx-card">
                    <div className="portal-rx-top">
                      <span className="portal-rx-badge">
                        <FileText size={12} />
                        Rx · {t("sampleLabel")}
                      </span>
                      <span className="portal-rx-ok">
                        <CheckCircle2 size={12} />
                        {t("identityMatched")}
                      </span>
                    </div>
                    <strong className="portal-rx-script" dir="ltr">
                      &ldquo;Tab Panadol 500mg · 1+0+1&rdquo;
                    </strong>
                    <div className="portal-rx-slots">
                      <span>
                        <Sunrise size={13} />
                        <b>1</b>
                      </span>
                      <span>
                        <Sun size={13} />
                        <b>0</b>
                      </span>
                      <span>
                        <Moon size={13} />
                        <b>1</b>
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className={`portal-edge-btn portal-edge-end ${pulseWave ? "is-active" : ""}`}
                  onClick={() => setPulseWave((v) => !v)}
                  aria-label={t("urduVoice")}
                  aria-pressed={pulseWave}
                >
                  {pulseWave ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>

                {pulseWave && (
                  <div className="portal-wave-pill" aria-hidden="true">
                    {[10, 20, 14, 24, 16, 10, 18].map((h, i) => (
                      <i
                        key={i}
                        style={{
                          height: h,
                          animationDelay: `${i * -0.1}s`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              <span className="split-wing split-wing-end" aria-hidden="true">
                {t("heroSplitRight")}
              </span>
            </div>

            <p className="pill-sub-statement">{t("heroOne")} <em>{t("heroTwo")}</em></p>
          </div>

          {/* Bottom Baseline Editorial Anchor Bar (like the video) */}
          <div className="pill-hero-footer">
            <div className="pill-editorial-blurb">
              <p className="pill-editorial-copy">
                {t("heroEditorialCap") && (
                  <span className="editorial-dropcap" aria-hidden="true">
                    {t("heroEditorialCap")}
                  </span>
                )}
                {t("heroEditorialRest")}
              </p>
            </div>

            <div className="pill-baseline-track" aria-hidden="true">
              <span className="pill-baseline-rule" />
            </div>

            <div className="pill-footer-actions">
              <button
                type="button"
                className="pill-cta-button"
                onClick={() => navigate("scan")}
              >
                <Camera size={18} />
                <span className="desktop-copy">{t("scan")}</span>
                <span className="mobile-copy">{t("openCamera")}</span>
                <ArrowRight className="directional" size={16} />
              </button>
              <button
                type="button"
                className="pill-secondary-link"
                onClick={() => navigate("verify")}
              >
                <ShieldCheck size={16} />
                <span>{t("verify")}</span>
              </button>
            </div>
          </div>

          <div className="hero-scroll-wrap">
            <button
              type="button"
              className="hero-scroll-cue light-surface-cue"
              onClick={scrollToWorkflow}
            >
              <span>{t("scrollExplore")}</span>
              <ChevronDown size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* Band 2: Porcelain Sheet — Strictly below the fold */}
      <div id="how-it-works" className="editorial-sheet">
        <div className="content-wrap sheet-inner">
          {/* Interactive Workflow Explorer */}
          <section
            className="workspace-frame"
            aria-label={t("workspaceEyebrow")}
          >
            <div className="workspace-topbar">
              <div className="workspace-title-group">
                <span className="workspace-eyebrow">
                  {t("workspaceEyebrow")}
                </span>
                <h2>{t("workspaceTitle")}</h2>
                <p>{t("workspaceSub")}</p>
              </div>
              <div
                className="workspace-tabs"
                role="tablist"
                aria-label={t("workspaceEyebrow")}
              >
                {(
                  [
                    { id: "read", label: "tabRead" },
                    { id: "safety", label: "tabSafety" },
                    { id: "verify", label: "tabVerify" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={step === tab.id}
                    className={step === tab.id ? "is-selected" : undefined}
                    onClick={() => setStep(tab.id)}
                  >
                    {t(tab.label)}
                  </button>
                ))}
              </div>
            </div>

            <div className="workspace-body">
              <div className="workspace-canvas">
                <div className="canvas-header-row">
                  <span className="sample-pill">{t("sampleLabel")}</span>
                  <span className="canvas-step-chip">
                    {t(explainerCopy[step].chipKey)}
                  </span>
                </div>

                <div className="canvas-split">
                  <div className="canvas-copy">
                    <h3>{t(explainerCopy[step].titleKey)}</h3>
                    <p>{t(explainerCopy[step].descKey)}</p>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() =>
                        navigate(step === "verify" ? "verify" : "scan")
                      }
                    >
                      {step === "verify" ? (
                        <ShieldCheck size={18} />
                      ) : (
                        <Camera size={18} />
                      )}
                      <span>{t(step === "verify" ? "verify" : "scan")}</span>
                      <ArrowRight className="directional" size={17} />
                    </button>
                  </div>

                  <div className="canvas-visual" aria-hidden="true">
                    {step === "read" && (
                      <div className="preview-ocr-card">
                        <div className="ocr-line">
                          <span className="ocr-raw" dir="ltr">
                            &ldquo;Panadol 500mg 1+0+1&rdquo;
                          </span>
                          <span className="ocr-badge-good">
                            <CheckCircle2 size={14} />
                            {t("identityMatched")}
                          </span>
                        </div>
                        <div className="ocr-line">
                          <span className="ocr-raw" dir="ltr">
                            &ldquo;??? 250mg OD&rdquo;
                          </span>
                          <span className="ocr-badge-warn">
                            <AlertTriangle size={14} />
                            {t("confirmationRequired")}
                          </span>
                        </div>
                      </div>
                    )}
                    {step === "safety" && (
                      <div className="preview-routine-card">
                        <div className="preview-slot">
                          <Sunrise size={22} />
                          <span>{t("morning")}</span>
                          <strong>1</strong>
                        </div>
                        <div className="preview-slot is-muted">
                          <Sun size={22} />
                          <span>{t("afternoon")}</span>
                          <strong>0</strong>
                        </div>
                        <div className="preview-slot">
                          <Moon size={22} />
                          <span>{t("night")}</span>
                          <strong>1</strong>
                        </div>
                      </div>
                    )}
                    {step === "verify" && (
                      <div className="preview-verify-stack">
                        <StripArt />
                        <div className="preview-audio-pill">
                          <Volume2 size={17} />
                          <div className="mini-wave">
                            {[10, 22, 16, 28, 18, 12, 24, 14].map((h, i) => (
                              <i key={i} style={{ height: h }} />
                            ))}
                          </div>
                          <span>{t("urduVoice")}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <aside
                className="workspace-rail"
                aria-label={t("timelineHeading")}
              >
                <div className="rail-head">
                  <strong>{t("timelineHeading")}</strong>
                </div>
                <div className="rail-cards">
                  <div className="rail-card">
                    <IconMedallion icon={ShieldAlert} tone="red" size={17} />
                    <div>
                      <strong>{t("timelineHigh")}</strong>
                      <span>{t("timelineHighSub")}</span>
                    </div>
                  </div>
                  <div className="rail-card">
                    <IconMedallion icon={AlertTriangle} tone="amber" size={17} />
                    <div>
                      <strong>{t("timelineBlur")}</strong>
                      <span>{t("timelineBlurSub")}</span>
                    </div>
                  </div>
                  <div className="rail-card">
                    <IconMedallion icon={CheckCircle2} tone="blue" size={17} />
                    <div>
                      <strong>{t("timelineMatch")}</strong>
                      <span>{t("timelineMatchSub")}</span>
                    </div>
                  </div>
                  <div className="rail-card">
                    <IconMedallion icon={Volume2} tone="green" size={17} />
                    <div>
                      <strong>{t("timelineUrdu")}</strong>
                      <span>{t("timelineUrduSub")}</span>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </section>

          {/* Band 3: Editorial Clinical Boundary */}
          <section className="boundary-band">
            <div className="boundary-meta">
              <span className="eyebrow">{t("boundaryNumber")}</span>
            </div>
            <div className="boundary-copy">
              <h2>{t("boundaryTitle")}</h2>
              <p>{t("boundaryBody")}</p>
            </div>
          </section>

          {/* Band 4: Patient Tools Bento Grid */}
          <section className="core-showcase">
            <div className="core-header-left">
              <span className="eyebrow">{t("coreEyebrow")}</span>
              <h2>{t("coreTitle")}</h2>
              <p>{t("coreBody")}</p>
            </div>

            <section className="bento-grid" aria-label={t("home")}>
              <article className="bento-card scan-feature">
                <div className="feature-top">
                  <div className="feature-badge-row">
                    <IconMedallion icon={ScanLine} tone="blue" size={18} />
                    <span className="eyebrow">01 · {t("intelligence")}</span>
                  </div>
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
                    <Camera size={19} />
                    <span className="desktop-copy">{t("scan")}</span>
                    <span className="mobile-copy">{t("gallery")}</span>
                    <ArrowRight className="directional" size={18} />
                  </button>
                </div>
              </article>

              <button
                type="button"
                className="bento-card voice-feature"
                onClick={() => navigate(scan ? "results" : "scan")}
              >
                <div className="feature-top">
                  <div className="feature-badge-row">
                    <IconMedallion icon={Volume2} tone="green" size={18} />
                    <span className="eyebrow">02 · {t("voice")}</span>
                  </div>
                  <ArrowUpRight size={20} />
                </div>
                <h2>{t("voiceTitle")}</h2>
                <WaveArt />
                <p>{t("voiceDescription")}</p>
                <div className="feature-foot">
                  <span>{t("urduVoice")}</span>
                  <span className="round-play">
                    <Play size={15} fill="currentColor" />
                  </span>
                </div>
              </button>

              <button
                type="button"
                className="bento-card verification-feature"
                onClick={() => navigate("verify")}
              >
                <div className="feature-top">
                  <IconMedallion icon={ShieldCheck} tone="blue" size={18} />
                  <span className="eyebrow">03</span>
                </div>
                <StripArt />
                <div className="bento-copy-foot">
                  <h3>{t("verificationTitle")}</h3>
                  <p>{t("verificationBody")}</p>
                </div>
              </button>

              <button
                type="button"
                className="bento-card schedule-feature"
                onClick={() => navigate("medicines")}
              >
                <div className="feature-top">
                  <IconMedallion icon={CalendarClock} tone="blue" size={18} />
                  <span className="eyebrow">04</span>
                </div>
                <div className="schedule-art" aria-hidden="true">
                  <span>
                    <Sunrise size={22} />
                    <i />
                  </span>
                  <span>
                    <Sun size={22} />
                    <i />
                  </span>
                  <span>
                    <Moon size={22} />
                    <i />
                  </span>
                </div>
                <div className="bento-copy-foot">
                  <h3>{t("scheduleTitle")}</h3>
                  <p>{t("scheduleBody")}</p>
                </div>
              </button>

              <button
                type="button"
                className="bento-card reminder-feature"
                onClick={() => navigate("reminders")}
              >
                <div className="feature-top">
                  <IconMedallion
                    icon={MessageCircle}
                    tone="neutral"
                    size={18}
                  />
                  <span className="eyebrow">{t("comingSoon")}</span>
                </div>
                <div className="bento-copy-foot">
                  <h3>{t("remindersTitle")}</h3>
                  <p>{t("remindersBody")}</p>
                </div>
              </button>

              <article className="bento-card safety-feature">
                <IconMedallion icon={ShieldCheck} tone="blue" size={22} />
                <div>
                  <span className="eyebrow">06 · {t("safetyTitle")}</span>
                  <p>{t("safetyBody")}</p>
                </div>
              </article>
            </section>
          </section>

          {/* Mobile Patient Schedule + Quick Actions */}
          <section className="mobile-schedule">
            <div className="section-heading">
              <h2>{t("today")}</h2>
              <IconMedallion icon={CalendarClock} tone="blue" size={18} />
            </div>
            <div className="panel mobile-schedule-panel">
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
                  </button>
                </>
              ) : (
                <div className="mobile-schedule-empty">
                  <IconMedallion icon={Sunrise} tone="amber" size={20} />
                  <div>
                    <h3>{t("noSchedule")}</h3>
                    <p>{t("noScheduleBody")}</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <div className="mobile-quick-actions">
            <button type="button" onClick={() => navigate("verify")}>
              <IconMedallion icon={Pill} tone="blue" size={18} />
              <strong>{t("verify")}</strong>
              <span>{t("verificationBody")}</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(scan ? "results" : "scan")}
            >
              <IconMedallion icon={Play} tone="green" size={18} />
              <strong>{t("listen")}</strong>
              <span>{t("urduVoice")}</span>
            </button>
            <button type="button" onClick={() => navigate("medicines")}>
              <IconMedallion icon={CalendarClock} tone="blue" size={18} />
              <strong>{t("doseSchedule")}</strong>
              <span>{t("seeSchedule")}</span>
            </button>
            <button type="button" onClick={() => navigate("history")}>
              <IconMedallion icon={Clock3} tone="neutral" size={18} />
              <strong>{t("prescriptions")}</strong>
              <span>{t("savedRecords")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
