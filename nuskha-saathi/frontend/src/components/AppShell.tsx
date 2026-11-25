"use client";
import {
  Home,
  ScanLine,
  Pill,
  Clock3,
  SlidersHorizontal,
  ShieldCheck,
  Check,
} from "lucide-react";
import { LanguageSwitch, useLanguage } from "@/lib/i18n";
import { BrandMark, FooterEngravingArt } from "@/components/MedicalArt";
import { useEffect, useState, type ReactNode } from "react";

export type View =
  | "home"
  | "scan"
  | "verify"
  | "medicines"
  | "history"
  | "settings"
  | "results"
  | "reminders";

const links = [
  { view: "home", key: "home", shortKey: "navHome", icon: Home },
  { view: "scan", key: "scan", shortKey: "navScan", icon: ScanLine },
  { view: "verify", key: "verify", shortKey: "navScan", icon: ShieldCheck },
  { view: "medicines", key: "medicines", shortKey: "navMeds", icon: Pill },
  { view: "history", key: "history", shortKey: "navHistory", icon: Clock3 },
] as const;

export default function AppShell({
  view,
  navigate,
  children,
}: {
  view: View;
  navigate: (v: View) => void;
  children: ReactNode;
}) {
  const { t } = useLanguage();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const showStepper =
    view === "scan" || view === "results" || view === "verify";
  const currentStep = view === "scan" ? 1 : view === "results" ? 2 : 3;

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        {t("skip")}
      </a>
      <header className="header-wrap">
        <div className="site-header">
          <button
            className="brand"
            type="button"
            onClick={() => navigate("home")}
            aria-label={t("home")}
          >
            <span className="brand-mark">
              <BrandMark size={24} />
            </span>
            <span className="brand-copy">
              <strong>{t("brand")}</strong>
              <span>{t("tagline")}</span>
            </span>
          </button>

          <nav className="desktop-nav" aria-label={t("home")}>
            {links.map(({ view: target, key }) => (
              <button
                key={target}
                type="button"
                aria-current={view === target ? "page" : undefined}
                onClick={() => navigate(target)}
              >
                {t(key)}
              </button>
            ))}
          </nav>

          <div className="header-controls">
            <LanguageSwitch />
            <button
              className="icon-button settings-button"
              type="button"
              onClick={() => navigate("settings")}
              aria-label={t("settings")}
              aria-current={view === "settings" ? "page" : undefined}
            >
              <SlidersHorizontal size={19} strokeWidth={2} />
            </button>
          </div>
        </div>
      </header>

      {offline && (
        <div className="offline-banner" role="status">
          {t("offline")}
        </div>
      )}

      {showStepper && (
        <div className="step-rail-wrap">
          <nav className="step-rail content-wrap" aria-label={t("inProgress")}>
            <button
              type="button"
              className={`step-pill ${currentStep === 1 ? "is-active" : currentStep > 1 ? "is-done" : ""}`}
              onClick={() => navigate("scan")}
            >
              {currentStep > 1 && <Check size={14} />}
              <span>{t("stepCapture")}</span>
            </button>
            <i className="step-connector" aria-hidden="true" />
            <span
              className={`step-pill ${currentStep === 2 ? "is-active" : currentStep > 2 ? "is-done" : ""}`}
            >
              {currentStep > 2 && <Check size={14} />}
              <span>{t("stepReview")}</span>
            </span>
            <i className="step-connector" aria-hidden="true" />
            <button
              type="button"
              className={`step-pill ${currentStep === 3 ? "is-active" : ""}`}
              onClick={() => navigate("verify")}
            >
              <span>{t("stepStrip")}</span>
            </button>
          </nav>
        </div>
      )}

      <main id="main-content" tabIndex={-1} className="main-content">
        {children}
      </main>

      <footer className="site-footer-band">
        <div className="footer-grain" aria-hidden="true" />
        <div className="site-footer content-wrap">
          <div className="footer-col-brand">
            <div className="footer-brand">
              <BrandMark size={24} />
              <span>{t("brand")}</span>
            </div>
            <p className="footer-mission">{t("footerMission")}</p>
            <p className="footer-clinical-note">{t("clinicalNote")}</p>
          </div>

          <div className="footer-col">
            <span className="footer-col-title">{t("footerTools")}</span>
            <ul>
              <li>
                <a
                  href="#scan"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("scan");
                  }}
                >
                  {t("scan")}
                </a>
              </li>
              <li>
                <a
                  href="#verify"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("verify");
                  }}
                >
                  {t("verify")}
                </a>
              </li>
              <li>
                <a
                  href="#medicines"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("medicines");
                  }}
                >
                  {t("medicines")}
                </a>
              </li>
              <li>
                <a
                  href="#history"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("history");
                  }}
                >
                  {t("history")}
                </a>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <span className="footer-col-title">{t("footerTrust")}</span>
            <ul>
              <li>{t("footerTrust1")}</li>
              <li>{t("footerTrust2")}</li>
              <li>{t("footerTrust3")}</li>
              <li>{t("footerTrust4")}</li>
              <li>
                <a
                  href="#reminders"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("reminders");
                  }}
                >
                  {t("whatsapp")}
                </a>
              </li>
              <li>
                <a
                  href="#settings"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("settings");
                  }}
                >
                  {t("settings")}
                </a>
              </li>
            </ul>
            <p className="footer-end">{t("footer")}</p>
          </div>
        </div>
        <FooterEngravingArt />
      </footer>

      <nav className="bottom-nav" aria-label={t("home")}>
        {links
          .filter((l) => l.view !== "verify")
          .map(({ view: target, shortKey, icon: Icon }) => (
            <button
              key={target}
              type="button"
              aria-current={view === target ? "page" : undefined}
              onClick={() => navigate(target)}
            >
              <Icon size={20} strokeWidth={2} />
              <span>{t(shortKey)}</span>
            </button>
          ))}
      </nav>
    </div>
  );
}
