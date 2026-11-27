"use client";
import { useState } from "react";
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  ScanLine,
  Eye,
  MessageSquare,
  Send,
  BellRing,
} from "lucide-react";
import { visionChat, type ScanResult } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import SafetyAlertBanner from "./SafetyAlertBanner";
import VisualDoseCard from "./VisualDoseCard";
import AudioPlayer from "./AudioPlayer";

export default function PrescriptionResults({
  scan,
  original,
  originalFile,
  onRetake,
  onScheduleReminders,
}: {
  scan: ScanResult;
  original: string | null;
  originalFile?: File | null;
  onRetake: () => void;
  onScheduleReminders?: () => void;
}) {
  const { t } = useLanguage();
  const [clarity, setClarity] = useState(false);
  const [chatPrompt, setChatPrompt] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState("");
  const [chatHistory, setChatHistory] = useState<
    Array<{ type: "user" | "ai"; content: string; model?: string }>
  >([]);
  const confirmed = scan.medications.filter((m) => m.status === "VERIFIED");

  async function askVision(questionText: string) {
    const clean = questionText.trim();
    if (!clean || !originalFile || chatBusy) return;
    setChatBusy(true);
    setChatError("");
    const prior = chatHistory.map(({ type, content }) => ({ type, content }));
    setChatHistory((prev) => [...prev, { type: "user", content: clean }]);
    setChatPrompt("");
    try {
      const res = await visionChat({
        file: originalFile,
        userPrompt: clean,
        messages: prior,
      });
      setChatHistory((prev) => [
        ...prev,
        { type: "ai", content: res.response, model: res.model },
      ]);
    } catch {
      setChatError(t("visionChatError"));
      setChatHistory((prev) => prev.slice(0, -1));
    } finally {
      setChatBusy(false);
    }
  }

  return (
    <section className="prescription-results">
      <SafetyAlertBanner
        interactions={scan.interactions}
        medications={scan.medications}
        onRetake={onRetake}
      />
      <div className="comparison-layout">
        <aside className="source-panel">
          <div className="source-title">
            <FileText size={19} />
            <h2>{t("original")}</h2>
            {original && (
              <button
                type="button"
                className={`clarity-toggle ${clarity ? "is-on" : ""}`}
                aria-pressed={clarity}
                onClick={() => setClarity((v) => !v)}
              >
                <Eye size={15} />
                <span>
                  {t(clarity ? "clarityLensActive" : "clarityLens")}
                </span>
              </button>
            )}
          </div>
          {original ? (
            <img
              src={original}
              alt={t("original")}
              className={`original-prescription ${clarity ? "has-clarity" : ""}`}
            />
          ) : (
            <p className="original-empty">{t("originalUnavailable")}</p>
          )}
          <button type="button" className="secondary-button" onClick={onRetake}>
            <ScanLine size={18} />
            {t("newScan")}
          </button>
          {onScheduleReminders && confirmed.length > 0 && (
            <button
              type="button"
              className="secondary-button"
              onClick={onScheduleReminders}
            >
              <BellRing size={18} />
              {t("scheduleRemindersCta")}
            </button>
          )}

          {originalFile && (
            <details className="vision-chat-box">
              <summary>
                <MessageSquare size={16} />
                <span>{t("visionChatTitle")}</span>
              </summary>
              <div className="vision-chat-body">
                <p className="vision-chat-note">{t("visionChatNote")}</p>
                <div className="vision-chat-chips">
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={chatBusy}
                    onClick={() => void askVision(t("visionChatQuick1"))}
                  >
                    {t("visionChatQuick1")}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={chatBusy}
                    onClick={() => void askVision(t("visionChatQuick2"))}
                  >
                    {t("visionChatQuick2")}
                  </button>
                </div>
                {chatHistory.length > 0 && (
                  <div className="vision-chat-thread">
                    {chatHistory.map((item, idx) => (
                      <div
                        key={idx}
                        className={`wa-bubble ${item.type === "user" ? "wa-outbound" : "wa-reply"}`}
                        dir="auto"
                      >
                        {item.content}
                      </div>
                    ))}
                  </div>
                )}
                {chatError && (
                  <p className="capture-error" role="alert">
                    {chatError}
                  </p>
                )}
                <form
                  className="vision-chat-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void askVision(chatPrompt);
                  }}
                >
                  <input
                    type="text"
                    value={chatPrompt}
                    onChange={(e) => setChatPrompt(e.target.value)}
                    placeholder={t("visionChatPlaceholder")}
                    aria-label={t("visionChatPlaceholder")}
                    disabled={chatBusy}
                  />
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={chatBusy || !chatPrompt.trim()}
                  >
                    <Send size={15} />
                    <span>{t("visionChatAsk")}</span>
                  </button>
                </form>
              </div>
            </details>
          )}
        </aside>
        <div className="extracted-panel">
          <div className="source-title">
            <h2>{t("extracted")}</h2>
            <span className="record-id" dir="ltr">
              #{scan.scan_id.slice(-6)}
            </span>
          </div>
          <div className="extraction-list">
            {scan.medications.map((m) => {
              const issueStatusKey =
                m.status === "REFUSED_BLURRY"
                  ? "issueBlurryLabel"
                  : m.status === "REFUSED_DOSAGE_ANOMALY"
                    ? "issueDoseLabel"
                    : "issueUnknownLabel";
              const issueSummaryKey =
                m.status === "REFUSED_BLURRY"
                  ? "issueBlurrySummary"
                  : m.status === "REFUSED_DOSAGE_ANOMALY"
                    ? "issueDoseSummary"
                    : "issueUnknownSummary";
              const issueDetailKey =
                m.status === "REFUSED_BLURRY"
                  ? "issueBlurryDetail"
                  : m.status === "REFUSED_DOSAGE_ANOMALY"
                    ? "issueDoseDetail"
                    : "issueUnknownDetail";
              return (
                <article
                  className={`extraction-row ${m.status === "VERIFIED" ? "confirmed" : "uncertain"}`}
                  key={m.line_id}
                >
                  <div className="extraction-row-title">
                    {m.status === "VERIFIED" ? (
                      <CheckCircle2 size={20} />
                    ) : (
                      <AlertTriangle size={20} />
                    )}
                    <h3 dir={m.brand_matched || m.raw_text ? "ltr" : undefined}>
                      {m.brand_matched || m.raw_text || t("unknownMedicine")}
                      {m.strength_mg != null && (
                        <span> · {m.strength_mg} mg</span>
                      )}
                    </h3>
                  </div>
                  <p className="extraction-status">
                    {t(
                      m.status === "VERIFIED"
                        ? "identityMatched"
                        : issueStatusKey,
                    )}
                  </p>
                  <div className="source-wording">
                    <span>{t("rawText")}</span>
                    <p dir="auto">{m.raw_text || t("noRaw")}</p>
                  </div>
                  {m.status !== "VERIFIED" && (
                    <details className="med-issue-dropdown">
                      <summary>{t(issueSummaryKey)}</summary>
                      <div className="med-issue-body">
                        <p>{t(issueDetailKey)}</p>
                        {m.cropped_handwriting_b64 && (
                          <img
                            src={
                              m.cropped_handwriting_b64.startsWith("data:")
                                ? m.cropped_handwriting_b64
                                : `data:image/jpeg;base64,${m.cropped_handwriting_b64}`
                            }
                            alt={t("sourceCrop")}
                            className="crop-image"
                          />
                        )}
                      </div>
                    </details>
                  )}
                </article>
              );
            })}
          </div>
          {!scan.medications.length && (
            <div className="panel empty-state">
              <AlertTriangle size={32} />
              <p>{t("noMedicines")}</p>
              <p>{t("refused")}</p>
              <button className="secondary-button" onClick={onRetake}>
                {t("retake")}
              </button>
            </div>
          )}
          <div className="results-audio">
            <AudioPlayer
              text={scan.urdu_script}
              audioUrl={scan.audio_urdu_url}
            />
          </div>
        </div>
      </div>
      {confirmed.length > 0 && (
        <section className="dosage-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t("results")}</span>
              <h2>{t("doseSchedule")}</h2>
            </div>
          </div>
          <div className="dose-grid">
            {confirmed.map((m) => (
              <VisualDoseCard key={m.line_id} medication={m} scan={scan} />
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
