"use client";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, Mic, Send, Square, Upload, X } from "lucide-react";
import {
  formatApiError,
  sendWhatsAppReminder,
  simulateWhatsAppReply,
  transcribeUrduAudio,
  type ScanResult,
  type WhatsAppReminderResult,
  type WhatsAppWebhookResult,
} from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { getPatientId } from "@/lib/records";

export default function WhatsAppPreviewModal({
  open,
  scan,
  onClose,
}: {
  open: boolean;
  scan: ScanResult | null;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const confirmedBrand =
    scan?.medications.find((m) => m.status === "VERIFIED")?.brand_matched ||
    "Augmentin";
  const [phone, setPhone] = useState("+923001234567");
  const [customReply, setCustomReply] = useState("");
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reminder, setReminder] = useState<WhatsAppReminderResult | null>(null);
  const [replyOut, setReplyOut] = useState<WhatsAppWebhookResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setError("");
      dialog.current?.showModal();
    } else {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      setRecording(false);
      dialog.current?.close();
    }
  }, [open]);

  if (!open) return null;

  async function triggerCheckin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setReplyOut(null);
    setTranscript("");
    try {
      const res = await sendWhatsAppReminder({
        patient_id: getPatientId(),
        scan_id: scan?.scan_id || null,
        brand_name: confirmedBrand,
        phone_e164: phone,
        reminder_type: "day3_checkin",
      });
      setReminder(res);
    } catch (err) {
      setError(formatApiError(err, t("networkError")));
    } finally {
      setBusy(false);
    }
  }

  async function testWebhookReply(sample: string) {
    if (!sample.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await simulateWhatsAppReply({ from: phone, body: sample });
      setReplyOut(res);
    } catch (err) {
      setError(formatApiError(err, t("networkError")));
    } finally {
      setBusy(false);
    }
  }

  async function handleAudioBlob(blob: Blob, filename: string) {
    setBusy(true);
    setError("");
    setTranscript("");
    try {
      const stt = await transcribeUrduAudio(blob, filename, "ur");
      const text = (stt.text || "").trim();
      if (!text) {
        setError(t("waVoiceUnavailable"));
        return;
      }
      setTranscript(text);
      const res = await simulateWhatsAppReply({ from: phone, body: text });
      setReplyOut(res);
    } catch {
      setError(t("waVoiceUnavailable"));
    } finally {
      setBusy(false);
    }
  }

  async function toggleRecord() {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError(t("waVoiceUnavailable"));
      return;
    }
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        void handleAudioBlob(blob, "reply.webm");
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError(t("waVoiceUnavailable"));
    }
  }

  return (
    <dialog
      ref={dialog}
      className="strip-dialog demo-dialog"
      aria-labelledby="wa-modal-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-content">
        <div className="dialog-header">
          <span className="eyebrow">
            <MessageCircle size={14} /> {t("whatsapp")}
          </span>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label={t("close")}
          >
            <X size={20} />
          </button>
        </div>

        <h2 id="wa-modal-title">{t("waPreviewHeading")}</h2>
        <p className="demo-sub">{t("waPreviewDesc")}</p>

        <form className="wa-sim-form" onSubmit={(e) => void triggerCheckin(e)}>
          <label htmlFor="wa-phone-input">{t("waPhoneLabel")}</label>
          <div className="wa-sim-row">
            <input
              id="wa-phone-input"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              dir="ltr"
              required
            />
            <button type="submit" className="primary-button" disabled={busy}>
              <Send size={16} />
              <span>{t("waTriggerBtn")}</span>
            </button>
          </div>
        </form>

        {error && (
          <p className="capture-error" role="alert">
            {error}
          </p>
        )}

        {reminder && (
          <div className="wa-thread-box">
            <div className="wa-meta-row" dir="ltr">
              <span>Status: {reminder.status}</span>
              <span>
                Scheduled: {String(reminder.whatsapp_scheduled)}
              </span>
            </div>
            <div className="wa-bubble wa-outbound" dir="ltr">
              {reminder.urdu_message}
            </div>
            <div className="wa-reply-buttons">
              <button
                type="button"
                className="secondary-button"
                disabled={busy}
                onClick={() => void testWebhookReply("1 haan theek hai")}
              >
                {t("waSimContinue")}
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={busy}
                onClick={() => void testWebhookReply("2 ab bukhar theek hai, dawa rok di")}
              >
                {t("waSimStop")}
              </button>
            </div>

            <form
              className="wa-sim-row"
              onSubmit={(e) => {
                e.preventDefault();
                void testWebhookReply(customReply);
              }}
            >
              <input
                type="text"
                value={customReply}
                onChange={(e) => setCustomReply(e.target.value)}
                placeholder={t("waCustomReplyPlaceholder")}
                aria-label={t("waCustomReplyPlaceholder")}
                disabled={busy}
              />
              <button
                type="submit"
                className="secondary-button"
                disabled={busy || !customReply.trim()}
              >
                {t("waSendReplyBtn")}
              </button>
            </form>

            <div className="wa-reply-buttons">
              <button
                type="button"
                className="secondary-button"
                disabled={busy}
                onClick={() => void toggleRecord()}
              >
                {recording ? <Square size={15} /> : <Mic size={15} />}
                <span>{t(recording ? "waRecordStop" : "waRecordStart")}</span>
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={busy}
                onClick={() => audioInputRef.current?.click()}
              >
                <Upload size={15} />
                <span>{t("waUploadAudioBtn")}</span>
              </button>
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void handleAudioBlob(file, file.name);
                }}
              />
            </div>
          </div>
        )}

        {transcript && (
          <div className="wa-thread-box">
            <div className="wa-meta-row">
              <strong>{t("waTranscriptLabel")}</strong>
            </div>
            <div className="wa-bubble wa-outbound" dir="auto">
              {transcript}
            </div>
          </div>
        )}

        {replyOut && (
          <div className="wa-thread-box">
            <div className="wa-meta-row" dir="ltr">
              <strong>Webhook classification: {replyOut.classification}</strong>
            </div>
            <div className="wa-bubble wa-reply" dir="ltr">
              {replyOut.urdu_reply}
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}
